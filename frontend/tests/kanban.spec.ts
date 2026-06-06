import { expect, test } from "@playwright/test";

const SEED_BOARD = {
  columns: [
    { id: "col-backlog",   title: "Backlog",     cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Discovery",   cardIds: ["card-3"] },
    { id: "col-progress",  title: "In Progress", cardIds: ["card-4", "card-5"] },
    { id: "col-review",    title: "Review",      cardIds: ["card-6"] },
    { id: "col-done",      title: "Done",        cardIds: ["card-7", "card-8"] },
  ],
  cards: {
    "card-1": { id: "card-1", title: "Align roadmap themes",    details: "Draft quarterly themes with impact statements and metrics." },
    "card-2": { id: "card-2", title: "Gather customer signals", details: "Review support tags, sales notes, and churn feedback." },
    "card-3": { id: "card-3", title: "Prototype analytics view",details: "Sketch initial dashboard layout and key drill-downs." },
    "card-4": { id: "card-4", title: "Refine status language",  details: "Standardize column labels and tone across the board." },
    "card-5": { id: "card-5", title: "Design card layout",      details: "Add hierarchy and spacing for scanning dense lists." },
    "card-6": { id: "card-6", title: "QA micro-interactions",   details: "Verify hover, focus, and loading states." },
    "card-7": { id: "card-7", title: "Ship marketing page",     details: "Final copy approved and asset pack delivered." },
    "card-8": { id: "card-8", title: "Close onboarding sprint", details: "Document release notes and share internally." },
  },
  archivedCardIds: [],
};

async function resetBoard(page: import("@playwright/test").Page) {
  const res = await page.request.get("/api/boards");
  const boards = (await res.json()) as Array<{ id: number }>;
  await page.request.put(`/api/boards/${boards[0].id}`, { data: SEED_BOARD });
}

// ── Auth tests ─────────────────────────────────────────────────────────────

test("shows login form when not authenticated", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("shows error on invalid credentials", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("wrongpassword");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("p[role='alert']")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("signs in with correct credentials and shows the board", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Main Board" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("signs out and returns to the login screen", async ({ page }) => {
  await page.request.post("/api/auth/login", {
    data: { username: "user", password: "password" },
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Main Board" })).toBeVisible();
  await page.getByRole("button", { name: "Profile menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

// ── Board tests ─────────────────────────────────────────────────────────────

test.describe("Board", () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post("/api/auth/login", {
      data: { username: "user", password: "password" },
    });
    await resetBoard(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Main Board" })).toBeVisible();
  });

  test("loads the kanban board with five columns", async ({ page }) => {
    await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
  });

  test("renames a column", async ({ page }) => {
    const firstColumn = page.locator('[data-testid^="column-"]').first();
    const titleInput = firstColumn.getByLabel("Column title");
    await titleInput.fill("Renamed Column");
    await expect(titleInput).toHaveValue("Renamed Column");
  });

  test("adds a card to a column", async ({ page }) => {
    const firstColumn = page.locator('[data-testid^="column-"]').first();
    await firstColumn.getByRole("button", { name: /add a card/i }).click();
    await firstColumn.getByPlaceholder("Card title").fill("New e2e card");
    await firstColumn.getByPlaceholder("Details").fill("Added via Playwright.");
    await firstColumn.getByRole("button", { name: /^add card$/i }).click();
    await expect(firstColumn.getByText("New e2e card")).toBeVisible();
  });

  test("archives a card from a column", async ({ page }) => {
    const backlogColumn = page.getByTestId("column-col-backlog");
    await expect(backlogColumn.getByTestId("card-card-1")).toBeVisible();
    await backlogColumn
      .getByRole("button", { name: "Archive Align roadmap themes", exact: true })
      .click();
    await expect(backlogColumn.getByTestId("card-card-1")).not.toBeVisible();
  });

  test("edits a card title and details", async ({ page }) => {
    const backlogColumn = page.getByTestId("column-col-backlog");
    const card = backlogColumn.getByTestId("card-card-1");
    await card.getByRole("button", { name: "Edit Align roadmap themes", exact: true }).click();
    const titleInput = card.getByLabel("Card title");
    await titleInput.clear();
    await titleInput.fill("Edited card title");
    const detailsInput = card.getByLabel("Card details");
    await detailsInput.clear();
    await detailsInput.fill("Edited details.");
    await card.getByRole("button", { name: "Save" }).click();
    await expect(backlogColumn.getByText("Edited card title")).toBeVisible();
    await expect(backlogColumn.getByText("Edited details.")).toBeVisible();
  });

  test("moves a card between columns via drag and drop", async ({ page }) => {
    const card = page.getByTestId("card-card-1");
    const targetColumn = page.getByTestId("column-col-review");

    const cardBox = await card.boundingBox();
    const columnBox = await targetColumn.boundingBox();
    if (!cardBox || !columnBox) throw new Error("Could not resolve drag coordinates.");

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + 100, { steps: 15 });
    await page.mouse.up();

    await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
  });
});

// ── Persistence tests ───────────────────────────────────────────────────────

test.describe("Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post("/api/auth/login", {
      data: { username: "user", password: "password" },
    });
    await resetBoard(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Main Board" })).toBeVisible();
  });

  test("persists column rename after reload", async ({ page }) => {
    const firstColumn = page.locator('[data-testid^="column-"]').first();
    const titleInput = firstColumn.getByLabel("Column title");

    const saveResponse = page.waitForResponse(
      (r) => r.url().includes("/api/boards/") && r.request().method() === "PUT"
    );
    await titleInput.fill("Renamed");
    await titleInput.press("Tab");
    await saveResponse;

    await page.reload();
    await expect(page.getByRole("heading", { name: "Main Board" })).toBeVisible();
    await expect(
      page.locator('[data-testid^="column-"]').first().getByLabel("Column title")
    ).toHaveValue("Renamed");
  });

  test("persists card addition after reload", async ({ page }) => {
    const firstColumn = page.locator('[data-testid^="column-"]').first();
    await firstColumn.getByRole("button", { name: /add a card/i }).click();
    await firstColumn.getByPlaceholder("Card title").fill("Persistent card");
    await firstColumn.getByPlaceholder("Details").fill("Details here.");

    const saveResponse = page.waitForResponse(
      (r) => r.url().includes("/api/boards/") && r.request().method() === "PUT"
    );
    await firstColumn.getByRole("button", { name: /^add card$/i }).click();
    await saveResponse;

    await page.reload();
    await expect(page.getByRole("heading", { name: "Main Board" })).toBeVisible();
    await expect(
      page.locator('[data-testid^="column-"]').first().getByText("Persistent card")
    ).toBeVisible();
  });

  test("persists card archival after reload", async ({ page }) => {
    const backlogColumn = page.getByTestId("column-col-backlog");

    const saveResponse = page.waitForResponse(
      (r) => r.url().includes("/api/boards/") && r.request().method() === "PUT"
    );
    await backlogColumn
      .getByRole("button", { name: "Archive Align roadmap themes", exact: true })
      .click();
    await saveResponse;

    await page.reload();
    await expect(page.getByRole("heading", { name: "Main Board" })).toBeVisible();
    await expect(backlogColumn.getByTestId("card-card-1")).not.toBeVisible();
  });

  test("persists card edit after reload", async ({ page }) => {
    const backlogColumn = page.getByTestId("column-col-backlog");
    const card = backlogColumn.getByTestId("card-card-1");
    await card.getByRole("button", { name: "Edit Align roadmap themes", exact: true }).click();
    const titleInput = card.getByLabel("Card title");
    await titleInput.clear();
    await titleInput.fill("Edited and persisted");

    const saveResponse = page.waitForResponse(
      (r) => r.url().includes("/api/boards/") && r.request().method() === "PUT"
    );
    await card.getByRole("button", { name: "Save" }).click();
    await saveResponse;

    await page.reload();
    await expect(page.getByRole("heading", { name: "Main Board" })).toBeVisible();
    await expect(backlogColumn.getByText("Edited and persisted")).toBeVisible();
  });
});

// ── AI Sidebar tests (mocked backend) ──────────────────────────────────────

test.describe("AI Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post("/api/auth/login", {
      data: { username: "user", password: "password" },
    });
    await resetBoard(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Main Board" })).toBeVisible();
  });

  test("sidebar is always visible", async ({ page }) => {
    await expect(page.getByTestId("ai-sidebar")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
  });

  test("sends a message and shows the AI response", async ({ page }) => {
    await page.route("**/api/ai/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Happy to assist!", board: null }),
      });
    });

    await page.getByRole("textbox", { name: "Message" }).fill("What can you do?");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText("What can you do?")).toBeVisible();
    await expect(page.getByText("Happy to assist!")).toBeVisible();
  });

  test("applies board update from AI response", async ({ page }) => {
    const aiBoard = {
      columns: [{ id: "col-backlog", title: "AI Column", cardIds: [] }],
      cards: {},
      archivedCardIds: [],
    };
    await page.route("**/api/ai/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "I've updated the board.", board: aiBoard }),
      });
    });

    await page.getByRole("textbox", { name: "Message" }).fill("Simplify the board");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText("I've updated the board.")).toBeVisible();
    await expect(page.locator('[data-testid^="column-"]')).toHaveCount(1);
    await expect(
      page.locator('[data-testid^="column-"]').first().getByLabel("Column title")
    ).toHaveValue("AI Column");
  });

  test("shows error state when AI request fails", async ({ page }) => {
    await page.route("**/api/ai/chat", async (route) => {
      await route.fulfill({ status: 500 });
    });

    await page.getByRole("textbox", { name: "Message" }).fill("Hello");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByTestId("ai-sidebar").getByRole("alert")).toBeVisible();
  });
});

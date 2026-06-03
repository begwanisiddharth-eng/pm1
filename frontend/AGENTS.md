# Frontend Instructions

## Current App Shape

The frontend is a NextJS app using React, TypeScript, Tailwind CSS, and `@dnd-kit` for Kanban drag and drop.

Key files:
- `src/app/page.tsx` renders the Kanban board.
- `src/components/KanbanBoard.tsx` owns the current frontend-only board state.
- `src/components/KanbanColumn.tsx` renders columns, column title editing, and card creation.
- `src/components/KanbanCard.tsx` renders draggable cards and delete controls.
- `src/lib/kanban.ts` defines `Card`, `Column`, `BoardData`, default demo data, ID creation, and card movement helpers.
- `src/app/globals.css` defines the project color variables and global styling.

## Existing Behavior To Preserve

- The board starts with five columns.
- Columns can be renamed inline.
- Cards can be added to a column.
- Cards can be deleted.
- Cards can be moved within and across columns with drag and drop.
- The current visual direction should stay aligned with the root project color scheme.

## Tooling

- Unit tests use Vitest and Testing Library.
- End-to-end tests use Playwright.
- `npm run test:unit` runs unit tests.
- `npm run test:e2e` runs Playwright tests.
- `npm run test:all` runs both.

## Implementation Notes

- Keep the frontend simple and focused on the MVP.
- Do not add extra Kanban features unless requested.
- When connecting to the backend, preserve the `BoardData` shape unless the database plan explicitly changes it.
- Keep API calls behind small local helpers instead of scattering fetch logic across components.
- Keep OpenAI API keys server-side only; never expose them in frontend code.

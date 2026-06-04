# Frontend Instructions

## Current App Shape

The frontend is a Next.js 16 app (TypeScript, Tailwind CSS, `@dnd-kit` for drag-and-drop).

### Key files (`frontend/src/`)

| File | Role |
|------|------|
| `app/page.tsx` | Root page; manages auth/board phases, board selection |
| `app/layout.tsx` | Root layout, font loading |
| `app/globals.css` | CSS custom properties, global styles |
| `lib/kanban.ts` | `Card`, `Column`, `BoardData`, `Priority`, label helpers, `moveCard`, `createId`, `matchesFilter` |
| `lib/api.ts` | All fetch calls — auth, boards CRUD, AI chat |
| `components/LoginForm.tsx` | Sign-in and create-account form (toggles between modes) |
| `components/BoardSelector.tsx` | Lists user boards, inline create-board form |
| `components/KanbanBoard.tsx` | Board state owner; drag-and-drop; add/delete columns; filter state |
| `components/KanbanColumn.tsx` | Column rendering, rename, delete, card list (filtered) |
| `components/KanbanCard.tsx` | Draggable card; view mode shows priority/due-date/labels; edit mode has all fields |
| `components/KanbanCardPreview.tsx` | Read-only card shadow in DragOverlay |
| `components/NewCardForm.tsx` | Toggle-open form for adding a card to a column |
| `components/AddColumnForm.tsx` | Toggle-open tile for adding a new column |
| `components/FilterBar.tsx` | Search text, priority filter, overdue-only toggle |
| `components/AISidebar.tsx` | AI chat history, input, send; passes `boardId` to API |

### Page phases

```
loading → unauthenticated → (login/register) → loading → board-selection → board-loading → ready
                                                                         ↑ (back from ready)
```

### Auth API

```typescript
getMe()                    // null if unauthenticated
login(username, password)
register(username, password)
logout()
```

### Boards API

```typescript
listBoards()               // BoardSummary[]
createBoard(name)          // BoardSummary
getBoard(boardId)          // BoardData
saveBoard(boardId, board)  // void
renameBoard(boardId, name) // BoardSummary
deleteBoard(boardId)       // void
```

### AI API

```typescript
chatWithBoard(message, history, boardId)  // ChatResponse { message, board | null }
```

### Card type

```typescript
type Card = {
  id: string;
  title: string;
  details: string;
  priority?: "low" | "medium" | "high" | "critical" | null;
  due_date?: string | null;   // "YYYY-MM-DD"
  labels?: string[];          // predefined label names
};
```

### Label definitions

Labels are predefined in `lib/kanban.ts` as `LABEL_OPTIONS` — each has `id`, `text`, and Tailwind
color classes. Cards store label IDs as `string[]`.

### Filter state (in KanbanBoard)

```typescript
type CardFilter = {
  search: string;
  priority: Priority | null;
  overdueOnly: boolean;
};
```

`matchesFilter(card, filter)` in `kanban.ts` is the single source of truth for filtering logic.

### Existing behaviors to preserve

- Column rename inline, add column, delete column (with confirmation)
- Card drag-and-drop within and across columns (`@dnd-kit`, `closestCorners`, 6 px activation)
- Card add, delete, inline edit (title, details, priority, due date, labels)
- Board rename (click heading), delete board (with confirmation), "All boards" back link
- AI sidebar sends board updates; board state rolls back on save failure (except AI updates)
- Save failures roll back UI state to previous board snapshot

### CSS Theming

Use CSS custom properties from `globals.css`:

| Variable | Hex | Role |
|---|---|---|
| `--accent-yellow` | `#ecad0a` | Accent / highlights |
| `--primary-blue` | `#209dd7` | Primary actions, links |
| `--secondary-purple` | `#753991` | Secondary actions |
| `--navy-dark` | `#032147` | Headings, body text |
| `--gray-text` | `#888888` | Muted / secondary text |
| `--stroke` | — | Border color |
| `--surface` | `#f7f8fb` | Card / panel background |
| `--surface-strong` | `#ffffff` | Elevated surface |
| `--shadow` | — | Box-shadow shorthand |

Fonts: `Space_Grotesk` → `font-display` (headings), `Manrope` → body.

### Tooling

```powershell
npm run test:unit        # Vitest unit tests
npm run test:unit:watch  # watch mode
npm run test:e2e         # Playwright e2e (builds first)
npm run test:all         # both
npm run build            # Next.js static export to frontend/out/
npm run dev              # dev server (not served by FastAPI)
npm run lint             # ESLint
```

### Implementation Notes

- API calls live in `lib/api.ts` only — no inline fetch in components.
- Board ID is always passed from `page.tsx` down through props; no global state.
- Use `createId(prefix)` from `kanban.ts` for new card and column IDs.
- For the `onEditCard` callback signature: `(cardId, title, details, priority, dueDate, labels)`.
- Never expose the OpenAI API key to the frontend.

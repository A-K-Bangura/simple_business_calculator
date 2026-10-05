# Startup Calculator

A friendly, local-first calculator for planning what it will cost to start a small business, and what that business could make.

It is deliberately **not** accounting software. You create a plan, group what the business needs, enter a quantity and a cost for each thing, and the numbers update as you type. Everything is saved in your browser. There is no backend, account or sign-in.

Built with [Vite](https://vite.dev), [React](https://react.dev), TypeScript (strict), [Tailwind CSS](https://tailwindcss.com) v4 and [Lucide](https://lucide.dev) icons.

## Getting started

```bash
npm install
npm run dev
```

| Command              | Description                                |
| -------------------- | ------------------------------------------ |
| `npm run dev`        | Start the dev server with hot reload       |
| `npm run build`      | Type-check and build for production        |
| `npm run preview`    | Serve the production build locally         |
| `npm test`           | Run the unit tests once                    |
| `npm run test:watch` | Run the tests as you change code           |
| `npm run lint`       | Lint with Oxlint                           |

The app uses hash URLs (`#/plan/…`), so the built `dist/` folder works on any static host with no server configuration.

## How it works

1. **Plans.** Create as many business plans as you like, each with its own name, description and currency.
2. **Groups.** Make any groups you want (Inventory, Marketing, Rent…). Each is one of two kinds:
   - *Things I pay for*: items have a quantity and a cost per unit.
   - *Things I plan to sell*: items also have a selling price, so the group shows potential revenue and profit.
3. **Items.** Quantity can be decimal (2.5 kg) and has an optional unit label that never affects the maths.
4. **Totals.** Every group gets a subtotal, and the plan shows:
   - **Estimated startup cost**: everything, across all groups.
   - **Potential revenue**: what the "selling" groups would bring in at the entered prices.
   - **Potential gross profit**: potential revenue minus the cost of the things being sold.
   - **Potential amount left after startup costs**: potential revenue minus the *whole* startup cost. This is not the same as gross profit, and the screen explains why.

These figures are estimates, not guaranteed income, and the interface says so.

Also included: duplicate / rename / delete plans, collapsible and re-orderable groups, undo for deleted items and groups, "Saved locally" feedback, and JSON export / import for backups.

## Project structure

```
src/
  domain/      Pure logic. No React, no browser APIs. Fully unit-tested.
    calculationUtils.ts   all formulas (item, group, plan)
    moneyUtils.ts         rounding that avoids float artifacts (4999.9999997 → 5000)
    currencyUtils.ts      the one place money becomes text ("Le 5,000", "$2,500")
    validationUtils.ts    number parsing and friendly form validation
    planOperations.ts     immutable edits: add/rename/move/delete groups and items
  storage/     Persistence behind an interface the UI depends on
    planRepository.ts     getPlans / getPlan / createPlan / updatePlan / deletePlan / duplicatePlan / importPlans
    keyValueStore.ts      the small localStorage slice the repository uses (swappable, fakeable)
    schema.ts             schema version + migrations
    sanitize.ts           repairs or rejects untrusted data (old storage, imported files)
    importExportUtils.ts  backup file format and validation
  state/       React context for plans, autosave, toasts and the tiny hash router
  components/  UI, split into ui/ (primitives), inputs/, forms/, plans/ and plan/
```

### Swapping local storage for an API later

The UI only talks to the `PlanRepository` interface (`src/storage/planRepository.ts`), whose methods are all async. To move to a server, implement that interface against your API and pass it to `<PlansProvider repository={…}>`. No component needs to change.

### Local data and versions

All plans are stored under a single `localStorage` key as `{ app, schemaVersion, plans }`. To change the data model, bump `CURRENT_SCHEMA_VERSION` and add a migration to `MIGRATIONS` in `src/storage/schema.ts`. Saved data and old backup files are then upgraded on load. Data written by a *newer* version of the app is never overwritten.

Derived values (totals, profit, margin) are never stored. They are always calculated from the source data, so they cannot go stale.

### Autosave

Edits show on screen immediately and are written to storage about 300 ms later. Anything still waiting is written straight away when the tab is hidden or closed. If the browser refuses to save (storage full or blocked), the plan screen says **Not saved** instead of failing silently.

## Accessibility and responsiveness

Designed mobile-first. Dialogs rise from the bottom as sheets on phones and sit centred on larger screens. All controls are real buttons and labelled fields, dialogs trap and restore focus, menus work with the keyboard, and losses are shown with a minus sign and words, not colour alone. Very large amounts wrap instead of breaking the layout.

# FTGO delivery handoff review demo

This is an isolated React/Vite fixture for demonstrating the distinction between
visual UI edits and changes to operational delivery semantics. It is not wired
into the FTGO Gradle build or any FTGO service.

The fixture reflects the delivery service's scheduling order: a courier receives
a `PICKUP` action before the corresponding `DROPOFF` action. Its default next
action is therefore `PICKUP`.

## Boundaries

- Uses fictional order, courier, and address data.
- Makes no FTGO API calls and does not use `fetch`, XHR, WebSockets, browser
  storage, or a form action.
- The review button changes only React component state; it cannot dispatch a
  courier update.
- The Content Security Policy denies network connections and form submissions.

`src/semanticContract.ts` contains the delivery values, action ordering, and
local-only behavior. `src/decorativeCopy.ts` and `src/styles.css` contain
presentation-only copy and appearance. Stable `data-demo-role` and
`data-semantic-key` attributes make those boundaries inspectable.

## Run locally

```sh
cd demo-ui
npm ci
npm run dev
```

To validate the fixture:

```sh
npm run lint
npm test
npm run build
```

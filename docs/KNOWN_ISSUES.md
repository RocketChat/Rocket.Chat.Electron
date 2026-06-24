# Known Issues

## Fuselage modern `Select` portals focus to body — breaks `:hover`/`:focus-within` on parent rows
- Status: Confirmed (fuselage 0.78, react-aria 3.48).
- Symptom: A CSS row highlight on a Fuselage `Field` using `:hover` or `:focus-within`
  disappears while a child `<Select>` dropdown is open, even with the pointer over the row.
- Root cause: The modern `Select` (`Select` -> `SelectAria` -> react-aria `useSelect`) renders
  its open listbox inside a react-aria `Overlay` portaled to `document.body` (MODAL: an
  underlay div covers the page and a FocusScope moves DOM focus into the portaled listbox).
  The focused node and the hovered surface are both OUTSIDE the `Field` subtree, so neither
  `:hover` nor `:focus-within` scoped to `.rcx-field` can match. (Legacy `SelectLegacy`/
  `SelectFiltered` use a `.rcx-select__focus` anchor + PositionAnimated and behave differently.)
- Bundle refs (node_modules/@rocket.chat/fuselage/dist/fuselage.development.js):
  8181 Select, 8230-8244 SelectAria, 8429-8438 SelectTrigger (`.rcx-select` button),
  7745-7754 Popover/Overlay portal-to-body + modal underlay.
- Workaround: Do not rely on CSS pseudo-classes on the parent for "control is open" state.
  Use a React wrapper that latches the highlight on `pointerdown` inside the row and clears
  on a document-level `pointerdown` outside it.
- Affected files: src/ui/components/SettingsView/settingRowHover.ts and any row using
  Fuselage `Select`.

## RTL auto-cleanup vs manual `document.body.innerHTML = ''` in `afterEach` orphans portal anchors
- Status: Confirmed (RTL 14.3.1, @kayahr/jest-electron-runner, single shared `src/.jest/setup.ts`).
- Symptom: A renderer spec that renders a portal/anchor component (e.g. TooltipProvider ->
  TooltipPortal -> createAnchor's `#tooltip-root`) crashes the ENTIRE `yarn test:coverage` run with
  `process.exit(1)` from `src/.jest/setup.ts` (uncaughtException handler), stack originating in
  React `safelyCallDestroy` / `commitPassiveUnmountInsideDeletedTreeOnFiber`. The thrown error is
  `NotFoundError: The node to be removed is not a child of this node` from
  `document.body.removeChild(a)` in `src/ui/components/utils/createAnchor.ts`.
- Root cause: A spec adds `afterEach(() => { document.body.innerHTML = ''; })`. Jest runs afterEach
  hooks LIFO; RTL's auto-cleanup `afterEach(cleanup)` is registered at import time so it runs LAST.
  The manual `innerHTML=''` runs FIRST and removes body-appended portal anchors WITHOUT going through
  their `deleteAnchor`/effect-cleanup path. RTL `cleanup()` then unmounts the React tree, the portal's
  unmount effect calls `removeChild` on the already-detached node, and it throws. Because the shared
  setup converts any uncaughtException into `process.exit(1)`, one orphaned anchor kills the whole run.
- Workaround / rule: Do NOT manually wipe `document.body.innerHTML` in renderer-spec `afterEach`. RTL
  auto-cleanup already unmounts the React tree and lets components remove their own anchors. If a test
  needs a clean body, call the render result's `unmount()` explicitly instead.
- Affected files: src/ui/components/utils/TooltipProvider.spec.tsx,
  src/ui/components/utils/ReparentingContainer.spec.tsx, src/ui/components/utils/createAnchor.ts,
  src/ui/components/utils/TooltipPortal.tsx, src/.jest/setup.ts.

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

# Popover to Menu Migration

**Date**: 2026-03-09
**Status**: Ready for planning

## What We're Building

Convert 5 Popover usages that are semantically menus to use `@base-ui/react/menu`, improving accessibility (proper ARIA roles, arrow key navigation, typeahead) and semantic correctness.

Create a reusable Menu wrapper in `src/components/ui/recollect/menu/` with pre-styled components that bake in the existing dropdown menu styles.

## Why This Approach

- **Accessibility**: Menus need `role="menu"` + `role="menuitem"`, arrow key navigation, and roving tabindex — none of which Popover provides
- **Semantic correctness**: Popover (`role="dialog"`) is for rich content; Menu is for action lists
- **Consistency**: A shared Menu wrapper prevents style duplication and matches the existing wrapper pattern (Tooltip, Dialog, etc.)
- **The developer already recognized the issue** — `sidePaneUserDropdown.tsx` manually adds `role="menuitem"` but lacks the container role and keyboard nav

## Key Decisions

1. **Full menu conversion for all 5 cases**, including the hybrid `header-options-popover.tsx` (use submenus for items that open settings panels)
2. **Create a Menu wrapper** in `src/components/ui/recollect/menu/` following existing wrapper patterns
3. **Bake styles into the wrapper** — move `dropdownMenuClassName` and `dropdownMenuItemClassName` styles directly into Menu.Popup and Menu.Item components
4. **All 5 popovers in scope**:
   - `header-options-popover.tsx` — 6 action items with submenu transitions
   - `sidePaneUserDropdown.tsx` — Sign Out action
   - `collection-options-popover.tsx` — Favorite, Share, Delete actions
   - `collections-list-section.tsx` (CollectionsHeaderOptionsPopover) — Add Collection action
   - `add-to-collection-popover.tsx` — Collection assignment list

## Popovers That Stay as Popovers

- `addBookmarkDropdown.tsx` — URL input form
- `edit-popover.tsx` — Multi-select comboboxes + switches
- `categoryIconsDropdown.tsx` — Icon/color picker with search
- `bookmarksViewDropdown.tsx` — Radio groups + sliders
- `clearTrashDropdown.tsx` — Confirmation prompt

## Complexity Notes

- `header-options-popover.tsx` is the most complex — View, Sort, and Share items transition the popup into sub-views (settings panels/forms). These should use `Menu.SubmenuRoot`/`Menu.SubmenuTrigger` to open nested content.
- `add-to-collection-popover.tsx` is a dynamic list of collection names — each becomes a `Menu.Item`.
- After migration, clean up `commonClassNames.ts` if `dropdownMenuClassName`/`dropdownMenuItemClassName` are no longer used elsewhere.

---
title: "refactor: Migrate semantic menus from Popover to Menu"
type: refactor
status: completed
date: 2026-03-09
---

## Overview

5 Popover usages are semantically menus (action lists) but use `role="dialog"` instead of `role="menu"`. Convert them to `@base-ui/react/menu` for proper ARIA semantics, arrow key navigation, and typeahead. Create a reusable Menu wrapper following the established compound component pattern.

## Problem Statement

Current popovers that contain clickable action lists lack:

- `role="menu"` / `role="menuitem"` ARIA semantics
- Arrow key navigation and roving tabindex
- Typeahead search
- Proper focus management

One file (`sidePaneUserDropdown.tsx`) manually adds `role="menuitem"` without the container role, confirming the developer recognized the issue. Another (`header-options-popover.tsx`) has eslint-disable comments for `jsx-a11y/no-static-element-interactions`.

## Proposed Solution

### Architecture: Menu + Popover Swap for Sub-views

Two of the 5 components (`header-options-popover` and `collection-options-popover`) have a hybrid pattern — menu items that transition to sub-views (View settings with sliders, Sort radio groups, Share form with inputs). These sub-views are NOT menu items and conflict with `role="menu"`.

**Approach**: Show a `Menu` for the initial action list. When a user clicks an item that opens a sub-view (View, Sort, Share, Clear Trash), close the Menu and open a `Popover` anchored to the same trigger with the sub-view content. Escape always closes entirely (no "back" navigation).

This cleanly separates menu semantics from form/settings content.

### Phase 1: Create Menu Wrapper

**File**: `src/components/ui/recollect/menu.tsx`

Follow the `select.tsx` compound component pattern exactly:

```typescript
// src/components/ui/recollect/menu.tsx
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "@/utils/tailwind-merge";

function Root({ children, ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root {...props}>{children}</MenuPrimitive.Root>;
}

function Trigger({ className, children, ...props }: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger className={cn(className)} {...props}>
      {children}
    </MenuPrimitive.Trigger>
  );
}

function Portal({ children, ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal {...props}>{children}</MenuPrimitive.Portal>;
}

function Positioner({ className, sideOffset = 1, children, ...props }: MenuPrimitive.Positioner.Props) {
  return (
    <MenuPrimitive.Positioner
      className={cn("z-10", className)}
      sideOffset={sideOffset}
      {...props}
    >
      {children}
    </MenuPrimitive.Positioner>
  );
}

function Popup({ className, children, ...props }: MenuPrimitive.Popup.Props) {
  return (
    <MenuPrimitive.Popup
      className={cn(
        "origin-(--transform-origin) rounded-xl bg-gray-50 p-1 w-48 shadow-custom-3 outline-hidden transition-[transform,scale,opacity] data-starting-style:scale-98 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    >
      {children}
    </MenuPrimitive.Popup>
  );
}

function Item({ className, children, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex cursor-pointer items-center rounded-lg px-2 py-[5px] text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-800 data-highlighted:bg-gray-200 data-highlighted:text-gray-900",
        className,
      )}
      {...props}
    >
      {children}
    </MenuPrimitive.Item>
  );
}

function Group({ children, ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group {...props}>{children}</MenuPrimitive.Group>;
}

function GroupLabel({ className, children, ...props }: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel className={cn(className)} {...props}>
      {children}
    </MenuPrimitive.GroupLabel>
  );
}

const Separator = MenuPrimitive.Separator;

export const Menu = {
  Root,
  Trigger,
  Portal,
  Positioner,
  Popup,
  Item,
  Group,
  GroupLabel,
  Separator,
};
```

**Key styling decisions**:

- `Popup` bakes in `dropdownMenuClassName` styles + animation from Select pattern (`origin-(--transform-origin) data-starting-style:scale-98 data-starting-style:opacity-0`)
- `Item` bakes in `dropdownMenuItemClassName` styles, using `data-highlighted` instead of `hover:`/`focus:` (Base UI Menu uses this data attribute for keyboard + mouse highlighting)
- `Positioner` defaults `sideOffset={1}` matching current popover usage
- All subcomponents accept `className` for consumer overrides via `cn()`

### Phase 2: Convert Simple Menus (3 files)

Convert in order of complexity:

#### 2a. `collections-list-section.tsx` — CollectionsHeaderOptionsPopover

- **Current**: Popover with 1 "Add Collection" Button item
- **Change**: Replace Popover imports with Menu wrapper. Button item becomes `Menu.Item`
- **File**: `src/pageComponents/dashboard/sidePane/collections-list-section.tsx`
- **Mobile portal**: Preserve `container` prop on `Menu.Portal`

#### 2b. `sidePaneUserDropdown.tsx`

- **Current**: Popover with 1 "Sign Out" div item (`role="menuitem"` manually added)
- **Change**: Replace Popover with Menu wrapper. Remove manual `role="menuitem"`, `onKeyDown` handler, and `tabIndex`. `Menu.Item` handles all of this
- **File**: `src/pageComponents/dashboard/sidePane/sidePaneUserDropdown.tsx`
- **Mobile portal**: Preserve `container` prop

#### 2c. `add-to-collection-popover.tsx`

- **Current**: Popover with dynamic list of collection Button items
- **Change**: Replace Popover with Menu wrapper. Each collection Button becomes `Menu.Item`
- **File**: `src/pageComponents/dashboard/cardSection/add-to-collection-popover.tsx`

### Phase 3: Convert Hybrid Menus (2 files)

These use the **Menu + Popover swap** pattern.

#### 3a. `collection-options-popover.tsx`

- **Current**: Popover with Favorite/Share/Delete items. Share transitions to ShareContent sub-view inline. Delete opens DeleteCollectionModal
- **Change**:
  - Menu for the 3 action items (Favorite, Share, Delete)
  - Share item: clicking closes Menu and opens a Popover with ShareContent anchored to the same trigger
  - Favorite and Delete items: standard `Menu.Item` (close on click, trigger action)
  - State management: `currentView: "menu" | "share"` — Menu renders when `"menu"`, Popover renders when `"share"`
  - Both Menu and Popover controlled via `open`/`onOpenChange`
- **File**: `src/pageComponents/dashboard/sidePane/collection-options-popover.tsx`
- **Mobile portal**: Preserve on both Menu.Portal and Popover.Portal

#### 3b. `header-options-popover.tsx`

- **Current**: Popover with 6 conditional items (View, Sort, Share, Clear Trash, Rename, Delete). View/Sort/Share/Clear Trash transition to sub-views inline
- **Change**:
  - Menu for all 6 action items
  - **Immediate actions** (Rename, Delete): standard `Menu.Item` — close on click, trigger action
  - **Sub-view actions** (View, Sort, Share, Clear Trash): clicking closes Menu and opens a Popover with the respective sub-view content
  - State: `currentView: null | "view" | "sort" | "share" | "trash"` — Menu renders when `null`, Popover renders for any sub-view
  - Both Menu and Popover controlled via open state
  - Remove eslint-disable comments for `jsx-a11y/no-static-element-interactions` and `jsx-a11y/click-events-have-key-events`
  - Replace raw `<div onClick>` items with `Menu.Item`
- **File**: `src/pageComponents/dashboard/dashboardLayout/header-options-popover.tsx`

### Phase 4: Cleanup

- [x] Check if `dropdownMenuClassName` and `dropdownMenuItemClassName` in `commonClassNames.ts` are still used after migration
  - `addBookmarkDropdown.tsx` uses `dropdownMenuClassName` — still needed
  - `bookmarksViewDropdown.tsx` and `bookmarksSortDropdown.tsx` use `dropdownMenuItemClassName` — still needed
  - **Result**: Both exports remain. Remove only if all references are eliminated
- [x] Remove any manual `role` attributes (`role="menuitem"`) that are now handled by Base UI
- [x] Remove manual `onKeyDown` handlers for Enter/Space that are now handled by `Menu.Item`
- [x] Remove eslint-disable comments in `header-options-popover.tsx`
- [x] Verify `data-popup-open` attribute works on `Menu.Trigger` for trigger visibility toggling (used in `sidePaneUserDropdown.tsx`)

## Acceptance Criteria

- [x] Menu wrapper created at `src/components/ui/recollect/menu.tsx` with compound export pattern
- [x] All 5 popover-to-menu conversions complete
- [x] Arrow key navigation works in all menus
- [x] Escape closes menus (and sub-view popovers) entirely
- [x] Mobile portal containers preserved and functional
- [x] Entry/exit animations match Select component pattern
- [x] No eslint-disable comments for accessibility rules in converted files
- [x] No manual `role="menuitem"` or keyboard handlers — Base UI handles it
- [x] `pnpm lint:types` passes
- [x] `pnpm build` passes

## Dependencies & Risks

- **Base UI Menu API**: `@base-ui/react` v1.2.0 is installed and includes the `menu` module. Verify `closeOnClick` prop exists on `Menu.Item` (needed if we discover edge cases)
- **Menu + Popover swap complexity**: The hybrid pattern in Phase 3 adds state management. If it proves too complex, fallback is keeping those 2 files as Popover (still convert the 3 simpler ones)
- **`data-popup-open` on Menu.Trigger**: Must verify this attribute exists — used for CSS-based trigger visibility in sidebar popovers. If missing, use controlled `open` state with a data attribute

## References

- Brainstorm: `docs/brainstorms/2026-03-09-popover-to-menu-migration-brainstorm.md`
- Select wrapper (reference pattern): `src/components/ui/recollect/select.tsx`
- Dialog wrapper (reference pattern): `src/components/ui/recollect/dialog.tsx`
- Common classNames: `src/utils/commonClassNames.ts:14-17`
- Base UI Menu module: `node_modules/@base-ui/react/menu/`

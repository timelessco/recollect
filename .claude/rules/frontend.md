---
paths: src/**/*.{ts,tsx}
---

# Frontend Patterns

## Compound Component Pattern

For complex UI (Combobox, Menu), export object with subcomponents:

```typescript
export const Combobox = {
	Root, // Context provider + main wrapper
	Input, // Text input
	Listbox, // Dropdown options container
	Option, // Individual option
	Chips, // Selected items display
	Chip, // Single chip
};

// Usage: <Combobox.Root><Combobox.Input /><Combobox.Listbox>...</Combobox.Listbox></Combobox.Root>
```

See `/src/components/ui/recollect/combobox/` for implementation.

## CSS & Layout

- Prefer CSS Grid over Flexbox when both work
- Use modern CSS: nesting, custom properties, container queries, subgrid, color functions
- Never use `position: absolute` unless strictly necessary
- Tailwind v4 only (never v3)

## HTML & Accessibility

- Use modern HTML: `<dialog>`, `popover` attribute
- Use pointer events -- never touch or mouse events directly
- Make static elements with click handlers use a valid role
- Never nest block-level elements inside inline elements (causes hydration errors):
  - No `<figure>`, `<div>`, `<section>`, `<article>` inside `<p>` tags
  - Use `<div>` instead of `<p>` when containing block-level elements

## TypeScript

- Always `as const` instead of literal types and type annotations
- Always `export type` / `import type` for types
- Never use `any`, `@ts-ignore`, enums, namespaces, or `const enum`
- Use function types instead of object types with call signatures

## JavaScript

- ES Modules only (never CommonJS)
- `fetch` only (never `axios`)
- Function declarations for named functions, arrow functions for callbacks
- `for...of` instead of `Array.forEach`
- Template literals over string concatenation (only when interpolating)
- Never create import cycles
- Never hardcode sensitive data

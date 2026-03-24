---
paths:
  - "src/**/*.{ts,tsx}"
---

## Frontend Patterns

### Compound Component Pattern

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

### Recollect-Specific Rules

- Tailwind v4 only (never v3)

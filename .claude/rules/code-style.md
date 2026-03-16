---
paths:
  - "src/**/*.{ts,tsx}"
---

## Code Style

### React & State

- Colocate code that changes together
- **Optimistic mutations**: Add Sentry breadcrumbs for cache misses and state inconsistencies

### React/Next.js Patterns

- **Props**: Always define TypeScript interfaces

### Styling

- **Custom CSS**: Only in `global.css` when absolutely necessary

### State Management

- **Zustand**: Store files in `/src/store`, TS interfaces, separate actions from state
- **React Query**: Key constants, custom hooks, error handling, optimistic updates

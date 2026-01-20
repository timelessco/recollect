---
paths: src/**/*.{ts,tsx}
---

# Frontend Rules

Comprehensive accessibility and code quality rules for frontend development.

## Accessibility Rules

### ARIA and Semantic HTML

- Never use `accessKey` attribute on any HTML element.
- Never set `aria-hidden="true"` on focusable elements.
- Never add ARIA roles, states, and properties to elements that don't support them.
- Never use distracting elements like `<marquee>` or `<blink>`.
- Always use the `scope` prop only on `<th>` elements.
- Never assign non-interactive ARIA roles to interactive HTML elements.
- Never assign interactive ARIA roles to non-interactive HTML elements.
- Never use explicit role property that's the same as the implicit/default role.
- Always ensure ARIA properties are valid for the element's supported roles.
- Always include all required ARIA attributes for elements with ARIA roles.
- Always ensure all ARIA properties (`aria-*`) are valid.
- Always use valid, non-abstract ARIA roles for elements with ARIA roles.
- Always use valid ARIA state and property values.
- Always use semantic elements instead of role attributes in JSX.

### Form and Input Accessibility

- Always ensure label elements have text content and are associated with an input.
- Always include a `type` attribute for button elements.
- Always use valid values for the `autocomplete` attribute on input elements.

### Keyboard Navigation

- Never assign `tabIndex` to non-interactive HTML elements.
- Never use positive integers for `tabIndex` property.
- Always assign `tabIndex` to non-interactive HTML elements with `aria-activedescendant`.
- Always make elements with interactive roles and handlers focusable.
- Always accompany `onClick` with at least one of: `onKeyUp`, `onKeyDown`, or `onKeyPress`.
- Always accompany `onMouseOver`/`onMouseOut` with `onFocus`/`onBlur`.

### Content Accessibility

- Never include "image", "picture", or "photo" in img `alt` prop.
- Always include a `title` element for SVG elements.
- Always give all elements requiring alt text meaningful information for screen readers.
- Always ensure anchors have content that's accessible to screen readers.
- Always give heading elements content that's accessible to screen readers (not hidden with `aria-hidden`).
- Always include a `lang` attribute on the html element.
- Always include a `title` attribute for iframe elements.
- Always include caption tracks for audio and video elements.
- Always ensure all anchors are valid and navigable.
- Always use correct ISO language/country codes for the `lang` attribute.
- Always use modern HTML features including `<dialog>` and the `popover` attribute.

### Interactive Elements

- Always make static elements with click handlers use a valid role attribute.
- Never use event handlers on non-interactive elements.
- Always use pointer events. Never use touch or mouse events directly.

## Code Quality Rules

### CSS and Styling

- Always use CSS Grid for layout when it makes sense. Never use Flexbox if Grid can be used instead.
- Never use `position: absolute` unless strictly necessary.
- Always use modern CSS features including nesting, custom properties, container queries, subgrid, and color functions.
- Always use Tailwind v4. Never use Tailwind v3.

### TypeScript Best Practices

- Always use TypeScript. Never use JavaScript.
- Always add appropriate TypeScript types and interfaces.
- Always import all methods, classes, and types used in the code.
- Never use primitive type aliases or misleading types.
- Never use empty type parameters in type aliases and interfaces.
- Never use any or unknown as type constraints.
- Never use the any type.
- Never use the TypeScript directive @ts-ignore.
- Never use TypeScript enums.
- Never use TypeScript namespaces.
- Never use TypeScript const enum.
- Never add type annotations to variables that are initialized with literal expressions.
- Always use `as const` instead of literal types and type annotations.
- Always use either `T[]` or `Array<T>` consistently.
- Always use `export type` for types.
- Always use `import type` for types.
- Always ensure all enum members are literal values.
- Always use function types instead of object types with call signatures.
- Never use void type outside of generic or return types.
- Never let variables evolve into any type through reassignments.
- Never use implicit any type on variable declarations.
- Never merge interfaces and classes unsafely.
- Never use overload signatures that aren't next to each other.
- Always use the namespace keyword instead of the module keyword to declare TypeScript namespaces.

### React/Next.js Specific Rules

**Compound Component Pattern** (for complex UI like Combobox, Menu):

```typescript
// Export object with subcomponents for composition
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

- Never use `<img>` elements in Next.js projects. Always use next/image.
- Never use `<head>` elements in Next.js projects (except in \_document.js).
- Never import next/document outside of pages/\_document.jsx in Next.js projects.
- Never use the next/head module in pages/\_document.js on Next.js projects.
- Never pass children as props.
- Never let children and dangerouslySetInnerHTML props on the same element.
- Never use Array index in keys.
- Never use dangerous JSX props.
- Never use `target="_blank"` without `rel="noopener"`.
- Never define React components inside other components.
- Never assign to React component props.
- Never insert comments as text nodes.
- Never assign JSX properties multiple times.
- Never return the return value of React.render.
- Never use shorthand assign when the variable appears on both sides.
- Never place semicolons incorrectly inside JSX elements.
- Always use `<>...</>` instead of `<Fragment>...</Fragment>`.
- Never add extra closing tags for components without children.
- Always ensure void (self-closing) elements don't have children.
- Always ensure all dependencies are correctly specified in React hooks.
- Always ensure all React hooks are called from the top level of component functions.

### JavaScript/TypeScript Code Quality

- Always use ES Modules. Never use CommonJS.
- Always set `"type": "module"` in `package.json`.
- Always use function declarations. Never use function expressions.
- Never use consecutive spaces in regular expression literals.
- Never use the `arguments` object.
- Never use the comma operator.
- Never write functions that exceed a given Cognitive Complexity score.
- Never use unnecessary boolean casts.
- Never use unnecessary callbacks with flatMap.
- Always use for...of statements instead of Array.forEach.
- Never create classes that only have static members.
- Never use this and super in static contexts.
- Never use unnecessary catch clauses.
- Never use unnecessary constructors.
- Never use unnecessary continue statements.
- Never export empty modules that don't change anything.
- Never use unnecessary escape sequences in regular expression literals.
- Never use unnecessary fragments.
- Never use unnecessary labels.
- Never use unnecessary nested block statements.
- Never rename imports, exports, and destructured assignments to the same name.
- Never use unnecessary string or template literal concatenation.
- Never use String.raw in template literals when there are no escape sequences.
- Never use useless case statements in switch statements.
- Never use ternary operators when simpler alternatives exist.
- Never use useless `this` aliasing.
- Never initialize variables to undefined.
- Never use void operators.
- Always use arrow functions instead of function expressions.
- Always use Date.now() to get milliseconds since the Unix Epoch.
- Always use .flatMap() instead of map().flat() when possible.
- Always use literal property access instead of computed property access.
- Never use parseInt() or Number.parseInt() when binary, octal, or hexadecimal literals work.
- Always use concise optional chaining instead of chained logical expressions.
- Always use regular expression literals instead of the RegExp constructor when possible.
- Never use number literal object member names that aren't base 10 or use underscore separators.
- Always remove redundant terms from logical expressions.
- Always use while loops instead of for loops when you don't need initializer and update expressions.

### Modern JavaScript

- Always use `fetch`. Never use `axios`.
- Always assume full modern browser support. Never include polyfills unless explicitly instructed.
- Always use the latest version of all libraries.
- Always use `String.slice()` instead of `String.substr()` and `String.substring()`.
- Never use template literals if you don't need interpolation.
- Never use `else` blocks when the `if` block breaks early.
- Never use yoda expressions.
- Never use Array constructors.
- Always use `at()` instead of integer index access.
- Always follow curly brace conventions.
- Always use `else if` instead of nested `if` statements in `else` clauses.
- Always use single `if` statements instead of nested `if` clauses.
- Always use `new` for all builtins except `String`, `Number`, and `Boolean`.
- Always use consistent accessibility modifiers on class properties and methods.
- Always use `const` declarations for variables that are only assigned once.
- Always put default function parameters and optional function parameters last.
- Always include a `default` clause in switch statements.
- Always initialize each enum member value explicitly.
- Always use the `**` operator instead of `Math.pow`.
- Always use `for-of` loops when you need the index to extract an item from the iterated array.
- Always use `node:assert/strict` over `node:assert`.
- Always use the `node:` protocol for Node.js builtin modules.
- Always use Number properties instead of global ones.
- Always use assignment operator shorthand where possible.
- Always use template literals over string concatenation.
- Always use `new` when throwing an error.
- Never throw non-Error values.
- Always use `String.trimStart()` and `String.trimEnd()` over `String.trimLeft()` and `String.trimRight()`.
- Always use standard constants instead of approximated literals.

### Best Practices

- Always include proper error handling and logging.
- Never have unused function parameters.
- Never have unused imports.
- Never have unused labels.
- Never have unused private class members.
- Never have unused variables.
- Never return a value from a function that has a 'void' return type.
- Always use isNaN() when checking for NaN.
- Always include key props in iterators and collection literals.
- Always ensure "for" loop update clauses move the counter in the right direction.
- Always ensure typeof expressions are compared to valid values.
- Always ensure generator functions contain yield.
- Never use await inside loops.
- Never use bitwise operators.
- Never use expressions where the operation doesn't change the value.
- Always ensure Promise-like statements are handled appropriately.
- Never create import cycles.
- Never hardcode sensitive data like API keys and tokens.
- Never let variable declarations shadow variables from outer scopes.

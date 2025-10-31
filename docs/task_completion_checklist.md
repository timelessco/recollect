# Task Completion Checklist

## 1. Code Quality ✓

- [ ] All TypeScript strict mode checks pass (`pnpm lint:types`)
- [ ] ESLint shows no errors or warnings (`pnpm fix:eslint`)
- [ ] Code is properly formatted (`pnpm fix:prettier`)
- [ ] CSS follows style guidelines (`pnpm fix:css`)
- [ ] No spelling mistakes in code/comments (`pnpm fix:spelling`)
- [ ] No unused code or dependencies (`pnpm fix:knip`)

## Essential Commands to Run After Completing Any Development Task

### 1. Code Formatting & Auto-fixing

```bash
# Format all code with Prettier
pnpm fix:prettier

# Auto-fix ESLint issues
pnpm fix:eslint

# Or run both via Turbo
pnpm fix
```

### 2. Comprehensive Code Quality Check

- [ ] All TypeScript strict mode checks pass (`pnpm lint:types`)
- [ ] ESLint shows no errors or warnings (`pnpm fix:eslint`)
- [ ] Code is properly formatted (`pnpm fix:prettier`)
- [ ] CSS follows style guidelines (`pnpm fix:css`)
- [ ] No spelling mistakes in code/comments (`pnpm fix:spelling`)
- [ ] No unused code or dependencies (`pnpm fix:knip`)

This single command validates:

- ✅ **TypeScript**: Type checking and compilation
- ✅ **ESLint**: Code quality and React patterns
- ✅ **Prettier**: Code formatting consistency
- ✅ **Knip**: Unused dependencies, exports, and types
- ✅ **CSS**: Stylelint validation
- ✅ **Markdown**: Documentation formatting
- ✅ **Spelling**: CSpell dictionary validation

### 3. Build Verification (Recommended)

```bash
# Ensure the application builds successfully
pnpm build
```

## Quality Gates by Task Type

### After Adding/Modifying Components

1. **Format**: `pnpm fix:prettier`
2. **Lint**: `pnpm lint:eslint`
3. **Type Check**: `pnpm lint:types`
4. **Accessibility**: Verify ARIA compliance in components
5. **Build**: `pnpm build` (to catch any build-time issues)

### After Styling Changes

1. **CSS Lint**: `pnpm lint:css`
2. **Format**: `pnpm fix:prettier`
3. **TailwindCSS**: Verify class sorting is correct
4. **Build**: `pnpm build` (to ensure CSS compilation)

### After Utility/Helper Functions

1. **Type Check**: `pnpm lint:types`
2. **Unused Code**: `pnpm lint:knip`
3. **Format**: `pnpm fix:prettier`
4. **Test**: Verify function behavior (when tests exist)

### After Documentation Changes

1. **Markdown**: `pnpm fix:md`
2. **Spelling**: `pnpm fix:spelling`
3. **Format**: `pnpm fix:prettier`

### After Dependency Changes

1. **Package Check**: `pnpm check:packages`
2. **Unused Detection**: `pnpm lint:knip`
3. **Type Check**: `pnpm lint:types`
4. **Build**: `pnpm build`

## Pre-Commit Workflow

### Automatic (via Husky + lint-staged)

The following runs automatically on `git commit`:

- **Prettier formatting** on all staged files
- **Spell checking** dictionary updates
- **Conventional commit** message validation

### Manual Pre-commit Check

```bash
# Quick validation before committing
pnpm fix && pnpm lint:types && pnpm lint:eslint
```

## Common Issues & Solutions

### TypeScript Errors

- Run `pnpm lint:types` to see detailed type errors
- Ensure strict typing without `any` types
- Use type guards instead of type assertions

### ESLint Issues

- Run `pnpm fix:eslint` for auto-fixable issues
- Check accessibility rules for components
- Verify React hooks usage patterns

### Build Failures

- Check Next.js configuration in `next.config.ts`
- Verify environment variable validation
- Review import paths and exports

### Performance Issues

- Run `pnpm build:analyze` to check bundle size
- Use `pnpm build:sourcemap` for debugging

## Best Practices Checklist

### Code Quality

- [ ] No TypeScript errors (`pnpm lint:types`)
- [ ] No ESLint violations (`pnpm lint:eslint`)
- [ ] Code properly formatted (`pnpm lint:prettier`)
- [ ] No unused code (`pnpm lint:knip`)
- [ ] Accessibility compliant (ARIA, semantic HTML)

### Performance

- [ ] Bundle size impact minimal (`pnpm build:analyze`)
- [ ] Images optimized (use Next.js Image component)
- [ ] No unnecessary re-renders
- [ ] Proper code splitting (dynamic imports for large components)

### Architecture

- [ ] Follows established patterns
- [ ] Uses path aliases (@/components/, @/utils/)
- [ ] Proper component composition
- [ ] Immutable data handling

### Documentation

- [ ] JSDoc comments for public APIs
- [ ] README updates if needed
- [ ] Spell check passes (`pnpm lint:spelling`)

## Environment-Specific Considerations

### Development

- Use `pnpm dev` with hot reloading
- Enable source maps for debugging: `SOURCEMAP=true pnpm dev`

### Production Build

- Always run `pnpm build` before deployment
- Check bundle analysis: `ANALYZE=true pnpm build`
- Verify environment variables are set

### CI/CD

- All linting runs in parallel via Turbo
- Build verification on every commit
- Conventional commit message enforcement

## Quick Reference Commands

```bash
# The essentials (run after every task)
pnpm fix && pnpm build

# Fast feedback loop during development
pnpm fix:prettier && pnpm lint:eslint && pnpm lint:types

# Full quality assurance
pnpm lint && pnpm build:analyze
```

Following this checklist ensures code quality, maintainability, and production readiness for every task completion.

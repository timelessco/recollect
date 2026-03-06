# Suggested Commands

## Development Commands

### Starting Development

```bash
pnpm dev           # Start Next.js development server (port 3000)
pnpm dev:sourcemap # Start with source maps enabled
```

### Building & Production

```bash
pnpm build           # Build for production using Turbo
pnpm build:next      # Build Next.js directly
pnpm build:ci        # Build with env validation skipped
pnpm build:start     # Build and start production server
pnpm build:analyze   # Build with bundle analyzer
pnpm build:sourcemap # Build with source maps for debugging
pnpm start           # Start production server
```

## Quality Assurance Commands

### Linting & Formatting (All-in-One)

```bash
pnpm lint # Run ALL linting checks via Turbo
pnpm fix  # Auto-fix all (spelling → css → md → prettier → eslint via turbo deps)
```

### Individual Linting Commands

```bash
pnpm lint:eslint # Check ESLint rules
pnpm fix:eslint  # Auto-fix ESLint issues

pnpm lint:types # TypeScript type checking
# No auto-fix available for type errors

pnpm lint:css # Check CSS with Stylelint
pnpm fix:css  # Auto-fix CSS issues

pnpm lint:prettier # Check Prettier formatting
pnpm fix:prettier  # Auto-fix formatting

pnpm lint:md # Check Markdown files
pnpm fix:md  # Auto-fix Markdown issues

pnpm lint:spelling # Check spelling with cspell
pnpm fix:spelling  # Add unknown words to dictionary

pnpm lint:knip # Check for unused dependencies/exports
```

## Testing Commands

```bash
pnpm test         # Run tests (currently exits with 0)
pnpm cypress:open # Open Cypress test runner
```

## Dependency Management

```bash
pnpm install        # Install dependencies
pnpm check:engine   # Check Node.js version compatibility
pnpm check:packages # Check for duplicate packages
pnpm check:update   # Interactive dependency updates (patches)
```

## Git & Release Commands

```bash
pnpm prepare        # Set up Husky hooks (auto-runs on install)
pnpm release        # Create a new release (CI mode)
pnpm release:dryrun # Test release without publishing
```

## Utility Commands

```bash
pnpm contributors:add      # Add contributor to all-contributors
pnpm contributors:generate # Generate contributors list
```

## Environment Setup

1. Create `.env` file based on environment requirements
2. Ensure all required environment variables are set (validated by Zod)

## Common Development Workflow

```bash
# Initial setup
pnpm install

# Start development
pnpm dev

# Before committing (automatically runs via Husky)
pnpm lint
pnpm fix

# Build for production
pnpm build
pnpm start
```

## Turbo-Powered Commands

The project uses Turbo for efficient task running. Commands with Turbo support:

- `pnpm lint` - Runs all linting tasks in parallel
- `pnpm fix` - Runs ESLint fixes
- `pnpm build` - Optimized build process

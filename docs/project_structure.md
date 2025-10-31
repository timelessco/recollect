# Project Structure

## Directory Layout

```tree
.
├── cypress/                # E2E testing with Cypress
│   ├── e2e/               # Test specs
│   ├── fixtures/          # Test data
│   └── support/           # Custom commands and helpers
│
├── env/                   # Environment configuration
│   ├── client.js         # Client-side env schema
│   ├── server.js         # Server-side env schema
│   └── schema.js         # Zod validation schemas
│
├── public/                # Static assets
│   ├── app-svgs/         # Application SVG icons
│   ├── fonts/            # Custom fonts (Inter)
│   └── ...               # Other static files
│
├── src/                   # Source code
│   ├── async/            # Async utilities
│   │   ├── ai/           # AI/ML integrations
│   │   ├── mutationHooks/# React Query mutations
│   │   ├── queryHooks/   # React Query queries
│   │   └── uploads/      # File upload handlers
│   │
│   ├── components/       # Reusable UI components
│   │   ├── aria*/        # Accessible components
│   │   ├── atoms/        # Atomic design components
│   │   └── ...           # Other components
│   │
│   ├── hooks/            # Custom React hooks
│   │
│   ├── icons/            # Icon components
│   │   ├── actionIcons/  # Action-specific icons
│   │   ├── categoryIcons/# Category icons
│   │   └── social/       # Social media icons
│   │
│   ├── pageComponents/   # Page-specific components
│   │   ├── dashboard/    # Dashboard page components
│   │   ├── login/        # Login page components
│   │   └── settings/     # Settings page components
│   │
│   ├── pages/            # Next.js pages (routes)
│   │   ├── api/          # API routes
│   │   └── [category_id]/# Dynamic routes
│   │
│   ├── store/            # Zustand state management
│   │
│   ├── styles/           # Global styles
│   │
│   ├── types/            # TypeScript type definitions
│   │
│   └── utils/            # Utility functions
│       ├── supabaseClient.ts      # Supabase client
│       ├── supabaseServerClient.ts # Server-side Supabase
│       └── ...           # Other utilities
│
├── release-it/           # Release automation
└── scripts/              # Build and utility scripts
```

## Key Directories

### Source Code (`src/`)

- **`async/`** - Asynchronous operations, API calls, and data fetching

  - AI integrations (Google Generative AI, LangChain)
  - React Query hooks for mutations and queries
  - Supabase CRUD operations
  - File upload handlers

- **`components/`** - Reusable UI components

  - Aria-prefixed components for accessibility
  - Atomic design components
  - Common UI elements (modals, dropdowns, tooltips)

- **`hooks/`** - Custom React hooks for shared logic

  - Debouncing, mobile detection, routing helpers
  - Data transformation hooks

- **`icons/`** - SVG icon components organized by type

  - Action icons, category icons, social icons
  - Consistent icon component structure

- **`pageComponents/`** - Page-specific components

  - Dashboard layout and functionality
  - Login/authentication components
  - Settings page components

- **`pages/`** - Next.js routing

  - API routes for server-side operations
  - Dynamic routing with `[category_id]`
  - Main entry point (`_app.tsx`)

- **`store/`** - Global state management with Zustand

- **`utils/`** - Shared utility functions
  - Supabase client configurations
  - Helper functions and constants
  - Toast messages and common class names

### Configuration Files

- **`next.config.js`** - Next.js configuration
- **`tailwind.config.cjs`** - TailwindCSS configuration
- **`tsconfig.json`** - TypeScript configuration
- **`turbo.json`** - Turbo monorepo task configuration
- **`package.json`** - Project dependencies and scripts
- **`.prettierrc.json`** - Code formatting rules
- **`stylelint.config.js`** - CSS linting rules
- **`knip.ts`** - Unused dependency detection

### Testing & Quality

- **`cypress/`** - E2E testing setup
- **`cspell.json`** - Spell checking configuration
- **`project-words.txt`** - Custom dictionary

### Deployment & CI

- **`vercel.json`** - Vercel deployment configuration
- **`sentry.*.config.ts`** - Error monitoring setup
- **`release-it/`** - Automated release configuration

## Important Files

- **`package.json`** - Project configuration, scripts, and dependencies
- **`README.md`** - Project documentation and setup guide
- **`.env`** - Environment variables (create from template)
- **`next.config.js`** - Next.js configuration with plugins
- **`tsconfig.json`** - TypeScript strict mode configuration

## File Naming Conventions

- **Components**: PascalCase (e.g., `AriaDropdown.tsx`)
- **Utilities**: camelCase (e.g., `supabaseClient.ts`)
- **Hooks**: camelCase with `use` prefix (e.g., `useDebounce.ts`)
- **Types**: camelCase with descriptive names (e.g., `apiTypes.ts`)
- **Pages**: kebab-case for routes (e.g., `[category_id].tsx`)

## Environment Structure

The project uses a sophisticated environment variable system:

- Zod schemas for validation
- Separate client/server schemas
- Type-safe access throughout the application
- Required `NEXT_PUBLIC_` prefix for client variables

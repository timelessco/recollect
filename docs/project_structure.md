# Project Structure

This document provides a comprehensive guide to the project's file and folder organization, with special focus on API routing patterns.

## Table of Contents

- [Root Directory Structure](#root-directory-structure)
- [Source Code Organization](#source-code-organization)
- [API Routing Architecture](#api-routing-architecture)
- [Component Organization](#component-organization)
- [Configuration Files](#configuration-files)
- [Special Directories](#special-directories)
- [File Naming Conventions](#file-naming-conventions)
- [Import Path Patterns](#import-path-patterns)
- [Best Practices](#best-practices)
- [Quick Reference](#quick-reference)

---

## Root Directory Structure

```text
recollect/
├── .cursor/                # Cursor IDE rules and configurations
│   └── rules/             # Project-specific coding rules
├── .github/               # GitHub configuration and CI/CD
│   └── DEVELOPMENT.md    # Development guidelines
├── cypress/               # E2E testing suite
│   ├── e2e/              # Test specifications
│   ├── fixtures/         # Test data files
│   └── support/          # Custom commands and helpers
├── docs/                  # Project documentation
├── public/                # Static assets (images, fonts, icons)
├── scripts/               # Build and utility scripts
│   ├── env/              # Environment validation schemas
│   └── release-it/       # Release automation
├── src/                   # Application source code
├── supabase/             # Supabase configuration and migrations
│   ├── config.toml       # Supabase project config
│   └── migrations/       # Database migration files
└── package.json          # Project dependencies and scripts
```

---

## Source Code Organization

### `/src` Directory Overview

```text
src/
├── app/                   # Next.js App Router pages (newer)
│   ├── (guest)/          # Guest-only routes
│   ├── layout.tsx        # Root layout
│   └── error.tsx         # Error boundaries
├── async/                 # Async operations and data fetching
│   ├── ai/               # AI/ML integrations
│   ├── mutationHooks/    # React Query mutation hooks
│   ├── queryHooks/       # React Query query hooks
│   ├── supabaseCrudHelpers/  # Database CRUD utilities
│   └── uploads/          # File upload handlers
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── icons/                 # Icon components (68 files)
├── lib/                   # Third-party library configurations
│   ├── react-query/      # React Query setup
│   └── supabase/         # Supabase client configurations
├── pageComponents/        # Page-specific component compositions
│   ├── dashboard/        # Dashboard-specific components
│   ├── notFoundPage/     # 404 page components
│   └── settings/         # Settings page components
├── pages/                 # Next.js Pages Router (legacy & API routes)
│   ├── api/              # API route handlers
│   ├── [category_id]/    # Dynamic category routes
│   ├── _app.tsx          # App component wrapper
│   └── _document.tsx     # HTML document structure
├── store/                 # Zustand global state stores
├── styles/                # Global CSS and SCSS files
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions and helpers
```

### Key Directories Explained

#### `async/` - Asynchronous Operations

- **`ai/`** - AI/ML integrations (Google Generative AI, Transformers.js)
- **`mutationHooks/`** - React Query mutation hooks for data modifications
- **`queryHooks/`** - React Query query hooks for data fetching
- **`supabaseCrudHelpers/`** - Database CRUD utility functions
- **`uploads/`** - File upload handlers for images, documents, etc.

#### `components/` - Reusable UI Components

- **`aria*`** folders - Accessibility-first components using Ariakit
- **`atoms/`** - Basic building blocks following atomic design (button, input, label, etc.)
- **`ui/`** - Shadcn UI library components
- **`guest/`** - Components for non-authenticated users
- **`lightbox/`** - Image viewer components
- **`loadersSkeleton/`** - Loading state components
- **`providers/`** - React context providers

#### `hooks/` - Custom React Hooks

Shared logic for:

- Debouncing (`useDebounce.ts`)
- Mobile detection (`useIsMobileView.ts`)
- Routing helpers (`useGetCurrentUrlPath.ts`)
- Data transformation (`useGetFlattendPaginationBookmarkData.ts`)
- Permission checks (`useIsUserCategoryOwner.ts`)

#### `icons/` - SVG Icon Components

Organized by type (68 files total):

- Action icons (edit, delete, share, etc.)
- Category icons
- Social media icons
- Consistent component structure across all icons

#### `pageComponents/` - Page-Specific Components

Components tied to specific pages:

- **`dashboard/`** - Dashboard layout, card section, header, side pane
- **`notFoundPage/`** - 404 error page
- **`settings/`** - Account, profile, and API key settings

#### `pages/` - Next.js Routing

- API routes for server-side operations
- Dynamic routing with `[category_id]`
- Main entry point (`_app.tsx`)
- Document structure (`_document.tsx`)

#### `store/` - Global State Management

Zustand stores for client-side state that needs to be shared across components.

#### `utils/` - Shared Utilities

- Supabase client configurations (`supabaseClient.ts`, `supabaseServerClient.ts`)
- Helper functions and constants
- Toast messages and common class names
- Type utilities and validators

---

## API Routing Architecture

The project uses **two distinct API routing patterns**: the legacy flat structure and the modern versioned structure.

### Old API Structure (Flat/Resource-Based)

**Pattern**: `/api/<resource>/<action>.ts`

The legacy API routes are organized by resource type in a flat structure:

```text
src/pages/api/
├── bookmark/
│   ├── add-bookmark-min-data.ts
│   ├── add-remaining-bookmark-data.ts
│   ├── add-url-screenshot.ts
│   ├── delete-bookmark.ts
│   ├── fetch-bookmarks-count.ts
│   ├── fetch-bookmarks-data.ts
│   ├── fetch-bookmarks-view.ts
│   ├── move-bookmark-to-trash.ts
│   └── search-bookmarks.ts
├── category/
│   ├── add-category-to-bookmark.ts
│   ├── create-user-category.ts
│   ├── delete-user-category.ts
│   ├── fetch-user-categories.ts
│   ├── update-category-order.ts
│   └── update-user-category.ts
├── file/
│   ├── upload-file.ts
│   └── upload-file-remaining-data.ts
├── profiles/
│   ├── delete-user.tsx
│   ├── fetch-user-profile.tsx
│   ├── fetch-user-profile-pic.tsx
│   ├── update-user-profile.tsx
│   ├── update-username.tsx
│   └── remove-profile-pic.tsx
├── settings/
│   └── upload-profile-pic.ts
├── share/
│   ├── delete-shared-categories-user.ts
│   ├── fetch-shared-categories-data.ts
│   ├── send-collaboration-email.ts
│   ├── send-email.ts
│   └── update-shared-category-user-role.ts
├── tags/
│   ├── add-tag-to-bookmark.ts
│   ├── create-user-tags.ts
│   ├── fetch-user-tags.ts
│   └── remove-tag-from-bookmark.ts
├── fetch-public-category-bookmarks.ts
└── invite.ts
```

**Examples:**

- `POST /api/bookmark/add-bookmark-min-data` - Add minimal bookmark data
- `GET /api/category/fetch-user-categories` - Fetch user's categories
- `PUT /api/profiles/update-user-profile` - Update user profile
- `POST /api/tags/add-tag-to-bookmark` - Add tag to bookmark

### New API Structure (Versioned/REST-ful)

**Pattern**: `/api/v1/<resource>/<operation>/<specific-action>.ts`

The modern API routes follow a versioned, hierarchical structure:

```text
src/pages/api/v1/
├── bookmarks/
│   ├── add/
│   │   ├── data.tsx                    # Main add endpoint
│   │   ├── swagger.ts                  # API documentation
│   │   └── tasks/
│   │       ├── min-data.tsx            # Add minimal data task
│   │       ├── remaining.tsx           # Add remaining data task
│   │       ├── screenshot.tsx          # Screenshot capture task
│   │       └── queue-consumer.ts       # Process queue
│   ├── delete/
│   │   └── non-cascade.ts              # Non-cascading delete
│   ├── get/
│   │   ├── fetch-by-id.ts              # Fetch bookmark by ID
│   │   ├── get-media-type.ts           # Get media type
│   │   └── get-pdf-buffer.ts           # Get PDF buffer
│   └── insert.ts                       # Direct insert endpoint
├── bucket/
│   ├── get/
│   │   └── signed-url.tsx              # Get signed URL for S3
│   └── post/
├── user/
│   └── get/
│       └── provider.ts                 # Get user provider info
├── twitter/
│   ├── sync.ts                         # Sync Twitter bookmarks
│   ├── syncFolders.ts                  # Sync Twitter folders
│   ├── syncFoldersBookmarks.ts         # Sync folder bookmarks
│   └── sort-index.ts                   # Sort Twitter content
├── raindrop/
│   └── import.ts                       # Import from Raindrop
└── tests/
    └── file/
        └── post/
            └── upload.ts               # Test file upload
```

**Pattern Breakdown:**

1. **Version prefix**: `v1/` - Allows API evolution without breaking changes
2. **Resource**: `bookmarks/`, `user/`, `bucket/` - The entity being acted upon
3. **Operation type**: `get/`, `add/`, `delete/`, `post/` - HTTP method/operation
4. **Specific action**: `fetch-by-id.ts`, `signed-url.tsx` - Detailed operation name

**Examples:**

- `POST /api/v1/bookmarks/add/data` - Add bookmark with full data
- `POST /api/v1/bookmarks/add/tasks/screenshot` - Capture screenshot for bookmark
- `GET /api/v1/bookmarks/get/fetch-by-id` - Fetch bookmark by ID
- `DELETE /api/v1/bookmarks/delete/non-cascade` - Delete without cascading
- `GET /api/v1/bucket/get/signed-url` - Get S3 signed URL
- `GET /api/v1/user/get/provider` - Get user authentication provider
- `POST /api/v1/twitter/sync` - Sync Twitter bookmarks
- `POST /api/v1/raindrop/import` - Import from Raindrop

### API Routing Comparison

| Aspect           | Old Structure                         | New Structure (v1)                        |
| :--------------- | :------------------------------------ | :---------------------------------------- |
| **Pattern**      | `/api/<resource>/<action>`            | `/api/v1/<resource>/<operation>/<action>` |
| **Versioning**   | None                                  | Versioned (`v1`)                          |
| **Organization** | Flat, resource-based                  | Hierarchical, operation-based             |
| **Scalability**  | Limited                               | High (supports sub-tasks)                 |
| **Example**      | `/api/bookmark/add-bookmark-min-data` | `/api/v1/bookmarks/add/tasks/min-data`    |
| **Use Case**     | Legacy endpoints                      | New features & refactored APIs            |

### Task-Based Sub-Routes

The v1 API structure supports task-based sub-routes for complex operations:

```text
/api/v1/bookmarks/add/
├── data.tsx              # Main orchestrator endpoint
├── swagger.ts            # API documentation
└── tasks/
    ├── min-data.tsx      # Step 1: Save minimal data
    ├── remaining.tsx     # Step 2: Enrich with metadata
    ├── screenshot.tsx    # Step 3: Capture screenshot
    └── queue-consumer.ts # Step 4: Process background queue
```

This structure allows breaking down complex operations into manageable, testable units.

---

## Component Organization

### Component Directory Structure

```text
src/components/
├── ariaDisclosure/        # Accessible disclosure components
├── ariaDropdown/          # Accessible dropdown menus
├── ariaMultiSelect/       # Multi-select components
├── ariaSearchableSelect/  # Searchable select inputs
├── ariaSelect/            # Select dropdowns
├── ariaSlidingMenu/       # Sliding menu panels
├── atoms/                 # Atomic design components
│   ├── button.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── link.tsx
│   └── textarea.tsx
├── customDropdowns.tsx/   # Custom dropdown implementations
├── guest/                 # Guest-only UI components
├── lightbox/              # Image lightbox components
├── loadersSkeleton/       # Loading skeletons
├── providers/             # React context providers
├── scripts/               # Client-side scripts
├── ui/                    # Shadcn UI components
│   ├── accordion.tsx
│   ├── calendar.tsx
│   ├── card.tsx
│   ├── command.tsx
│   ├── popover.tsx
│   ├── scroll-area.tsx
│   └── separator.tsx
├── badge.tsx
├── collectionIcon.tsx
├── colorPicker.tsx
├── labelledComponent.tsx
├── modal.tsx
├── radioGroup.tsx
├── readmore.tsx
├── search-loader.tsx
├── slider.tsx
├── spinner.tsx
├── switch.tsx
├── tabs.tsx
├── toggledarkmode.tsx
├── tooltip.tsx
├── userAvatar.tsx
└── VideoPlayer.tsx
```

**Component Guidelines:**

- **aria\*** folders: Accessibility-first components using Ariakit
- **atoms/**: Basic building blocks following atomic design
- **ui/**: Shadcn UI library components
- **Custom components**: Feature-specific implementations

### Page Components

```text
src/pageComponents/
├── dashboard/
│   ├── cardSection/           # Bookmark card displays
│   ├── header/                # Dashboard header
│   ├── sidePane/              # Sidebar navigation
│   ├── bookmarksSkeleton.tsx  # Loading skeleton
│   └── ...                    # Other dashboard components
├── notFoundPage/
│   └── notFoundPage.tsx       # 404 page
└── settings/
    ├── accountSettings.tsx
    ├── apiKeySettings.tsx
    ├── profileSettings.tsx
    └── ...                    # Other settings components
```

---

## Configuration Files

### Root Configuration Files

```text
recollect/
├── .env.example               # Environment variable template
├── .gitignore                # Git ignore patterns
├── .prettierrc.json          # Prettier formatting rules (or prettier.config.js)
├── cspell.json               # Spell checker configuration
├── cypress.config.ts         # Cypress E2E test configuration
├── eslint.config.js          # ESLint flat config
├── knip.ts                   # Unused code detection
├── next.config.ts            # Next.js configuration
├── next-sitemap.config.cjs   # Sitemap generation
├── package.json              # Dependencies and scripts
├── pnpm-lock.yaml            # pnpm lockfile
├── postcss.config.cjs        # PostCSS configuration
├── prettier.config.js        # Prettier config (JS version)
├── stylelint.config.js       # CSS/SCSS linting rules
├── tsconfig.json             # TypeScript configuration
├── turbo.json                # Turbo build cache config
└── vercel.json               # Vercel deployment config
```

### Environment Configuration

```text
scripts/env/
├── schema.js                 # Zod validation schemas
├── client.js                 # Client-side env vars
├── server.js                 # Server-side env vars
└── utils.js                  # Environment utilities
```

**Environment Variable System:**

- **Validation**: Zod schemas for type-safe environment variables
- **Separation**: Separate client/server schemas
- **Client variables**: Must have `NEXT_PUBLIC_` prefix
- **Server variables**: No prefix required
- **Type safety**: Validated at build time and runtime

---

## Special Directories

### `/public` - Static Assets

```text
public/
├── app-svgs/              # Application SVG files
│   ├── errorImgPlaceholder.svg
│   └── logo-diamond.svg
├── fonts/
│   └── inter/            # Inter font family
│       ├── inter-latin-400-normal.woff2
│       ├── inter-latin-600-normal.woff2
│       └── inter-latin-700-normal.woff2
├── bookmarks-signup-1.png
├── dashboard-screenshot.png
├── favicon.ico
├── logo.png
├── robots.txt
├── sitemap.xml
└── sprite.svg
```

### `/supabase` - Database Configuration

```text
supabase/
├── config.toml           # Supabase project configuration
└── migrations/           # SQL migration files (timestamped)
    ├── 20231201000000_initial_schema.sql
    ├── 20231215000000_add_bookmarks.sql
    └── ...
```

### `/cypress` - E2E Testing

```text
cypress/
├── e2e/
│   ├── api-tests/        # API endpoint tests
│   └── bookmarks-tests/  # Bookmark feature tests
├── fixtures/
│   └── example.json      # Test data
└── support/
    ├── commands.ts       # Custom Cypress commands
    └── e2e.ts           # Global test setup
```

### `/docs` - Documentation

```text
docs/
├── api_logging_rules.md
├── bookmark-queue-implementation.md
├── code_style_conventions.md
├── frontend_rules.md
├── migration-bookmark-categories-many-to-many.md
├── project_overview.md
├── project_structure.md              # This document
├── sentry_rules.md
├── supabase_dev_branch_setup.md
├── supabase_local_development.md
├── supabase_prod_to_local_migration.md
├── suggested_commands.md
├── task_completion_checklist.md
└── url-processing/
    ├── file_index.md
    ├── quick_reference.md
    └── summary.md
```

### `/.cursor` - Cursor IDE Rules

```text
.cursor/
└── rules/                # Project-specific coding rules
    ├── supabase-create-db-functions.mdc
    ├── supabase-create-migration.mdc
    ├── supabase-create-rls-policies.mdc
    ├── supabase-declarative-database-schema.mdc
    ├── supabase-nextjs-rules.mdc
    ├── supabase-postgres-sql-style-guide.mdc
    ├── supabase-use-realtime.mdc
    └── supabase-writing-edge-functions.mdc
```

---

## File Naming Conventions

### General Rules

| File Type            | Convention                  | Example                                      |
| :------------------- | :-------------------------- | :------------------------------------------- |
| **React Components** | PascalCase                  | `AriaDropdown.tsx`, `UserAvatar.tsx`         |
| **Pages**            | kebab-case or PascalCase    | `api-documentation.tsx`, `[category_id].tsx` |
| **Utilities**        | camelCase                   | `supabaseClient.ts`, `constants.ts`          |
| **Hooks**            | camelCase with `use` prefix | `useDebounce.ts`, `useIsMobileView.ts`       |
| **Types**            | camelCase                   | `apiTypes.ts`, `supabaseTypes.ts`            |
| **API Routes**       | kebab-case                  | `add-bookmark.ts`, `fetch-user-profile.tsx`  |
| **Configuration**    | Various                     | `next.config.ts`, `tsconfig.json`            |

### API Route Naming

**Old API Routes:**

- Pattern: `<verb>-<resource>-<detail>.ts`
- Examples:
  - `add-bookmark-min-data.ts`
  - `fetch-user-categories.ts`
  - `update-category-order.ts`

**New API Routes (v1):**

- Pattern: `<descriptive-name>.ts` or `<resource>.tsx`
- Examples:
  - `data.tsx` (within `/bookmarks/add/`)
  - `fetch-by-id.ts` (within `/bookmarks/get/`)
  - `signed-url.tsx` (within `/bucket/get/`)

---

## Import Path Patterns

### Absolute Imports

The project is configured for absolute imports from `src/`:

```typescript
// ✅ Good: Absolute imports
import { Button } from "components/atoms/button";
import { useDebounce } from "hooks/useDebounce";
import { supabaseClient } from "utils/supabaseClient";

// ❌ Avoid: Relative imports for cross-directory imports
import { Button } from "../../../components/atoms/button";
```

### Common Import Patterns

```typescript
// Components
import { Modal } from "components/modal";
import { Tooltip } from "components/tooltip";

// Hooks
import { useIsMobileView } from "hooks/useIsMobileView";

// Utils
import { cn } from "utils/classNames";
import { CONSTANTS } from "utils/constants";

// Types
import type { Bookmark } from "types/supabaseTypes";

// Stores
import { useUserStore } from "store/userStore";

// API calls (React Query)
import { useAddBookmark } from "async/mutationHooks/useAddBookmark";
```

---

## Best Practices

### When to Use Each API Structure

**Use Old API Structure (`/api/<resource>/<action>`) when:**

- Maintaining existing endpoints
- Simple CRUD operations
- No breaking changes planned

**Use New API Structure (`/api/v1/<resource>/<operation>/<action>`) when:**

- Creating new features
- Refactoring existing APIs
- Complex multi-step operations
- Need for task-based execution
- Building public APIs that require versioning

### File Organization Guidelines

1. **Colocation**: Keep related files close together
2. **Single Responsibility**: One component/function per file
3. **Index Files**: Use `index.ts` for clean exports (sparingly)
4. **Type Definitions**: Colocate types with their usage or use `/types` for shared types
5. **Test Files**: Use `.test.ts` or `.spec.ts` suffix, place near the code being tested

### Migration Path

When migrating from old to new API structure:

1. **Create v1 equivalent**: Build new endpoint in `/api/v1/`
2. **Add deprecation notice**: Update old endpoint with deprecation warning
3. **Update clients**: Migrate frontend/external consumers
4. **Monitor usage**: Track old endpoint usage
5. **Remove old endpoint**: After grace period, remove deprecated endpoint

Example migration:

```typescript
// Old: /api/bookmark/add-bookmark-min-data.ts
// New: /api/v1/bookmarks/add/tasks/min-data.tsx

// Step 1: Keep old endpoint, add warning
console.warn(
	"This endpoint is deprecated. Use /api/v1/bookmarks/add/tasks/min-data",
);

// Step 2: Update all frontend calls to use v1
// Step 3: Remove old endpoint after migration
```

---

## Quick Reference

### Common Paths

| What                | Path                                                  |
| :------------------ | :---------------------------------------------------- |
| Old API routes      | `src/pages/api/<resource>/<action>.ts`                |
| New API routes      | `src/pages/api/v1/<resource>/<operation>/<action>.ts` |
| UI Components       | `src/components/<component>.tsx`                      |
| Page Components     | `src/pageComponents/<page>/<component>.tsx`           |
| React Hooks         | `src/hooks/use<Hook>.ts`                              |
| Type Definitions    | `src/types/<types>.ts`                                |
| Utils               | `src/utils/<util>.ts`                                 |
| Global State        | `src/store/<store>.ts`                                |
| Database Migrations | `supabase/migrations/<timestamp>_<name>.sql`          |

### Key Files

- `src/pages/_app.tsx` - Application entry point
- `src/pages/_document.tsx` - HTML document structure
- `src/pages/api/v1/bookmarks/add/data.tsx` - Modern bookmark creation
- `src/utils/constants.ts` - Application constants
- `src/site-config.ts` - Site configuration
- `src/lib/supabase/client.ts` - Supabase client setup
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

---

## Related Documentation

- [Project Overview](./project_overview.md) - High-level project architecture
- [Code Style Conventions](./code_style_conventions.md) - Coding standards
- [Frontend Rules](./frontend_rules.md) - Frontend development guidelines
- [API Logging Rules](./api_logging_rules.md) - API logging standards
- [Supabase Local Development](./supabase_local_development.md) - Local setup guide

---

**Last Updated:** November 26, 2025

# Development

## Table of Contents

- [Development](#development)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
  - [Configuration](#configuration)
  - [Installing the dependencies](#installing-the-dependencies)
  - [Add the env file](#add-the-env-file)
  - [Running the project locally](#running-the-project-locally)
  - [Building the project](#building-the-project)
  - [Deploying the project](#deploying-the-project)
  - [More DX scripts](#more-dx-scripts)
    - [Prettier](#prettier)
    - [Eslint](#eslint)
    - [Stylelint](#stylelint)
    - [Markdown](#markdown)
    - [Check Types](#check-types)
    - [Check unused dependencies, exports \& types](#check-unused-dependencies-exports--types)
    - [Check Spelling](#check-spelling)
    - [Test](#test)
  - [Setting up Supabase for Local Development](#setting-up-supabase-for-local-development)
    - [Quick Start](#quick-start)
    - [Working with Database Migrations](#working-with-database-migrations)
    - [Comprehensive Setup Guide](#comprehensive-setup-guide)
    - [Google OAuth Setup](#google-oauth-setup)
    - [Database Webhooks](#database-webhooks)

## Prerequisites

Before you get started, you will need to have the following tools installed on
your machine:

- **[Node.js][1]** (version 12 or later)
- **[pnpm][2]** (version 5 or later) or **[npm][3]** or **[yarn][4]** (version 6
  or later)
- **[Git][5]** (optional, but recommended for version control)

> This repository includes a list of suggested VS Code extensions. It's a good
> idea to use [VS Code][6] and accept its suggestion to install them, as they'll
> help with development.

## Getting Started

## Configuration

The project uses environmental variables for configuration. You can set the
environmental variables in a **`.env`** file in the root directory of the
project. The **`.env`** file should contain key-value pairs in the following
format:

- **`NEXT_PUBLIC_SITE_URL`** (required): The URL of the frontend App of the
  project.

> Adding a new environmental variable requires a zod schema update in the `env`
> folder and a new entry in the `schema.js` file in the `serverSchema` variable
> or `clientSchema` variable.

## Installing the dependencies

You can run the project locally by

```shell
git clone https://github.com/timelessco/recollect.git
cd recollect
pnpm install
```

This will download and install all the required dependencies for the project.

## Add the env file

You need to create a `.env` file and add all the environmental variables as per
the `env.local.txt` file

## Running the project locally

```bash
pnpm dev
```

Open <http://localhost:3000> with your browser to see the result.

You can start editing the page by modifying `src/pages/index.js`. The page
auto-updates as you edit the file

## Building the project

To build the project to a production environment, you can use the

```bash
pnpm build
```

to build the production-ready version of the project. This will create a
**`.next`** directory with the compiled code and static assets.

Run the above built application locally using

```bash
pnpm start
```

## Deploying the project

Guide on how to deploy Next.js to various [hosting providers][7].

## More DX scripts

> Check for all the below errors in one command using [Turborepo][8]

`pnpm lint`

> AutoFix all the linting errors in one command using [Turborepo][8]

`pnpm fix`

### Prettier

[Prettier][9] is used to format code. It should be applied automatically when
you save files in VS Code or make a Git commit.

> Check the formatting errors

`pnpm lint:prettier`

> AutoFix the formatting errors

`pnpm fix:prettier`

> This package includes several forms of linting to enforce consistent code
> quality and styling. Each should be shown in VS Code, and can be run manually
> on the command-line:

### Eslint

Extends all the necessary rulesets from [eslint-config-canonical][10] for the
Next.js project that lints JavaScript and TypeScript source files

> Check for the linting errors

`pnpm lint:eslint`

> AutoFix the linting errors

`pnpm fix:eslint`

### Stylelint

([Stylelint][11]): Checks all css files

> Check the css linting errors

`pnpm lint:css`

> AutoFix the css linting errors

`pnpm fix:css`

### Markdown

([Markdownlint][12]): Checks all Markdown files

> Check the markdown linting errors

`pnpm lint:md`

> AutoFix the markdown linting errors

`pnpm fix:md`

### Check Types

([TypeScript][13]): Checks all TypeScript files

> Check TypeScript types

`pnpm lint:types`

### Check unused dependencies, exports & types

([knip][14]): Checks all unused dependencies, exports & types

> Check the spelling errors

`pnpm lint:knip`

### Check Spelling

([cspell][15]): Spell checks across all source files

> Check the spelling errors

`pnpm lint:spelling`

### Test

> Run the test suite

`pnpm test`

## Setting up Supabase for Local Development

This project uses **Supabase migrations** for database schema management. All database setup is automated through migration files.

### Quick Start

```bash
# Start local Supabase (Docker required)
npx supabase start

# Check status and get credentials
npx supabase status

# Access local services
# Studio Dashboard: http://localhost:54323
# API Gateway: http://localhost:54321
# Database: postgresql://postgres:postgres@localhost:54322/postgres
```

### Working with Database Migrations

```bash
# Create a new migration
npx supabase migration new <migration_name>

# Generate migration from UI changes
npx supabase db diff -f <migration_name>

# Apply migrations and reset database
npx supabase db reset
```

### Comprehensive Setup Guide

For detailed instructions including troubleshooting, environment configuration, and best practices, see:

📖 **[Supabase Local Development Guide](../docs/supabase_local_development.md)**

This guide covers:

- Complete local development workflow
- Making schema changes with migrations
- Troubleshooting common issues
- Database operations and commands
- Data management and seeding

### Google OAuth Setup

To enable Google login, configure OAuth in your Supabase project:

1. Follow the [Supabase Google Login Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
2. Add credentials to your `.env.local`:

   ```env
   DEV_SUPABASE_AUTH_GOOGLE_CLIENT_ID=your-client-id
   DEV_SUPABASE_AUTH_GOOGLE_SECRET=your-client-secret
   ```

### Database Webhooks

After running migrations, manually enable **Database Webhooks** in Supabase Studio:

1. Go to **Database → Integrations → Postgres Modules**
2. Enable "Database Webhooks"
3. Configure webhook triggers as needed

**Note**: When setting webhook URLs for local development, use your machine's local IP instead of `localhost` (Docker limitation). See the [local development guide](../docs/supabase_local_development.md) for details.

[1]: https://nodejs.org/en/
[2]: https://pnpm.io/
[3]: https://www.npmjs.com/
[4]: https://yarnpkg.com/
[5]: https://git-scm.com/
[6]: https://code.visualstudio.com
[7]: https://nextjs.org/docs/deployment
[8]: https://turbo.build/repo
[9]: https://prettier.io
[10]: https://github.com/gajus/eslint-config-canonical
[11]: https://stylelint.io/
[12]: https://github.com/DavidAnson/markdownlint
[13]: https://www.typescriptlang.org/
[14]: https://github.com/webpro/knip
[15]: https://cspell.org

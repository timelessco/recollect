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
  - [API Documentation with Swagger](#api-documentation-with-swagger)
    - [Accessing the API Documentation](#accessing-the-api-documentation)
    - [Project Structure](#project-structure)
    - [Writing API Specifications](#writing-api-specifications)
    - [Best Practices](#best-practices)
    - [Example: Adding a New API Specification](#example-adding-a-new-api-specification)
    - [References](#references)

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

### Required Environment Variables

#### Server-side Variables

- **`SUPABASE_SERVICE_KEY`** (required): Supabase service role key for admin operations
- **`GOOGLE_GEMINI_TOKEN`** (required): Google Gemini API token for AI features
- **`API_KEY_ENCRYPTION_KEY`** (required): Key for encrypting user API keys
- **`INTERNAL_API_KEY`** (required): Secret key for authenticating internal background job APIs
- **`RECOLLECT_SERVER_API`** (optional): URL for external Recollect server API
- **`RECOLLECT_SERVER_API_KEY`** (optional): API key for external Recollect server
- **`IMAGE_CAPTION_URL`** (optional): URL for image caption generation service
- **`RESEND_KEY`** (optional): Resend API key for email services
- **`DEV_SUPABASE_SERVICE_KEY`** (optional): Local development Supabase service key

#### Client-side Variables

- **`NEXT_PUBLIC_SITE_URL`** (required): The URL of the frontend App
- **`NEXT_PUBLIC_SUPABASE_URL`** (required): Supabase project URL
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (required): Supabase anonymous key
- **`NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID`** (required): Cloudflare R2 account ID
- **`NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID`** (required): Cloudflare R2 access key
- **`NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY`** (required): Cloudflare R2 secret key
- **`NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL`** (required): Cloudflare R2 public bucket URL
- **`NEXT_PUBLIC_DEV_SUPABASE_URL`** (optional): Local development Supabase URL
- **`NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY`** (optional): Local development Supabase anon key
- **`NEXT_PUBLIC_SENTRY_DSN`** (optional): Sentry DSN for error tracking

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

You need to create a `.env` file and add all the environmental variables. See the environment configuration section below for required variables.

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

## API Documentation with Swagger

This project uses **Swagger UI** (via [swagger-ui-react][16]) to provide interactive API documentation based on the **OpenAPI 3.0** specification.

### Accessing the API Documentation

Once the development server is running:

```bash
pnpm dev
```

Navigate to <http://localhost:3000/api-documentation> to view the interactive API documentation.

### Project Structure

The API documentation is organized as follows:

```plaintext
src/
├── pages/
│   ├── api-documentation.tsx          # Swagger UI page component
│   └── api/
│       └── v1/
│           └── bookmarks/
│               └── add/
│                   ├── swagger.ts     # OpenAPI specification
│                   ├── data.tsx       # Main bookmark add endpoint
│                   └── tasks/
│                       ├── min-data.tsx      # Min data task
│                       ├── screenshot.tsx    # Screenshot task
│                       └── remaining.tsx     # Remaining data task
```

### Writing API Specifications

API specifications are defined using the **OpenAPI 3.0** format with TypeScript types from `openapi-types`:

```typescript
import { type OpenAPIV3 } from "openapi-types";

const apiSpec: OpenAPIV3.Document = {
	openapi: "3.0.0",
	info: {
		title: "Your API Title",
		version: "1.0.0",
		description: "API description",
	},
	paths: {
		// Define your API endpoints here
	},
	components: {
		schemas: {
			// Define reusable schemas here
		},
	},
};

export default apiSpec;
```

### Best Practices

1. **Keep specs close to implementation**: Place `swagger.ts` files in the same directory as the API endpoints they document
2. **Use TypeScript types**: Leverage `OpenAPIV3` types for compile-time validation
3. **Define reusable schemas**: Use `components.schemas` for common data structures
4. **Document responses**: Include all possible response codes (200, 400, 401, 403, 500, etc.)
5. **Add descriptions**: Provide clear descriptions for endpoints, parameters, and schemas
6. **Tag your endpoints**: Use tags to group related API endpoints

### Example: Adding a New API Specification

1. Create your API endpoint file (e.g., `src/pages/api/v1/users/[id].tsx`)
2. Create a corresponding `swagger.ts` file in the same directory
3. Define your OpenAPI specification:

   ```typescript
   import { type OpenAPIV3 } from "openapi-types";

   const userApiSpec: OpenAPIV3.Document = {
   	openapi: "3.0.0",
   	info: {
   		title: "User API",
   		version: "1.0.0",
   	},
   	paths: {
   		"/api/v1/users/{id}": {
   			get: {
   				summary: "Get user by ID",
   				parameters: [
   					{
   						name: "id",
   						in: "path",
   						required: true,
   						schema: { type: "string" },
   					},
   				],
   				responses: {
   					"200": {
   						description: "User found",
   						content: {
   							"application/json": {
   								schema: {
   									$ref: "#/components/schemas/User",
   								},
   							},
   						},
   					},
   				},
   			},
   		},
   	},
   	components: {
   		schemas: {
   			User: {
   				type: "object",
   				properties: {
   					id: { type: "string" },
   					name: { type: "string" },
   					email: { type: "string" },
   				},
   			},
   		},
   	},
   };

   export default userApiSpec;
   ```

4. Import and add it to `src/pages/api-documentation.tsx`:

   ```typescript
   import userApiSpec from "./api/v1/users/swagger";

   // Add to SwaggerUI component
   <SwaggerUI spec={userApiSpec} />
   ```

### References

- **OpenAPI Specification**: <https://swagger.io/specification/>
- **Swagger UI React**: <https://github.com/swagger-api/swagger-ui/tree/master/docs/usage/react-integration.md>
- **OpenAPI Types**: <https://www.npmjs.com/package/openapi-types>

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
[16]: https://github.com/swagger-api/swagger-ui

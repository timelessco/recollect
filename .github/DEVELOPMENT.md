# Development

## Table of Contents

- [Development](#development)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
  - [Configuration](#configuration)
  - [Installing the dependencies](#installing-the-dependencies)
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
    - [Check package.json](#check-packagejson)
    - [Test](#test)
  - [Add google login](#add-google-login)
  - [Things to do in supabase](#things-to-do-in-supabase)
    - [Create tables](#create-tables)
    - [Create buckets](#create-buckets)
    - [Make search api work](#make-search-api-work)
    - [Add triggers](#add-triggers)

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
https://github.com/timelessco/bookmark-tags.git
cd bookmark-tags
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

> Check for all the below errors in one command using [Turbo Repo][8]

`pnpm lint`

> AutoFix all the linting errors in one command using [Turbo Repo][8]

`pnpm format`

### Prettier

[Prettier][9] is used to format code. It should be applied automatically when
you save files in VS Code or make a Git commit.

> Check the formatting errors

`pnpm lint:prettier`

> AutoFix the formatting errors

`pnpm format:prettier`

> This package includes several forms of linting to enforce consistent code
> quality and styling. Each should be shown in VS Code, and can be run manually
> on the command-line:

### Eslint

Extends all the necessary rulesets from [eslint-config-canonical][10] for the
Next.js project that lints JavaScript and TypeScript source files

> Check for the linting errors

`pnpm lint:eslint`

> AutoFix the linting errors

`pnpm format:eslint`

### Stylelint

([Stylelint][11]): Checks all css files

> Check the css linting errors

`pnpm lint:csslint`

> AutoFix the css linting errors

`pnpm format:csslint`

### Markdown

([Markdownlint][12]): Checks all Markdown files

> Check the markdown linting errors

`pnpm lint:csslint`

> AutoFix the markdown linting errors

`pnpm format:csslint`

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

### Check package.json

([npm-package-json-lint][16]): Lints the `package.json` file

> Check the package.json linting errors

`pnpm lint:package-json`

### Test

> Run the test suite

`pnpm test`

## Add google login

To enable google login please reffer [supabase google login](https://supabase.com/docs/guides/auth/social-login/auth-google)

## Things to do in supabase

Once you have created a new project in supabase and added the env as per
`env.local.txt` file you need to fo the following

### Create tables

Create the following tables in supabase using the following sql commands in the
supabase sql editor

```sql
create table
  public.bookmark_tags (
    id bigint generated by default as identity,
    created_at timestamp with time zone null default now(),
    bookmark_id bigint null,
    tag_id bigint null,
    user_id uuid null,
    constraint bookmark_tags_pkey primary key (id),
    constraint bookmark_tags_bookmark_id_fkey foreign key (bookmark_id) references bookmarks_table (id),
    constraint bookmark_tags_tag_id_fkey foreign key (tag_id) references tags (id),
    constraint bookmark_tags_user_id_fkey foreign key (user_id) references auth.users (id)
  ) tablespace pg_default;


  create table
  public.bookmarks_table (
    id bigint generated by default as identity,
    user_id uuid not null,
    inserted_at timestamp with time zone not null default timezone ('utc'::text, now()),
    title extensions.citext null,
    url text null,
    description text null,
    "ogImage" text null,
    screenshot text null,
    category_id bigint not null default '0'::bigint,
    trash boolean not null default false,
    type text null,
    meta_data jsonb null,
    constraint todos_pkey primary key (id),
    constraint bookmarks_table_category_id_fkey foreign key (category_id) references categories (id),
    constraint bookmarks_table_user_id_fkey foreign key (user_id) references profiles (id)
  ) tablespace pg_default;

  create unique index unique_url_category_id on public.bookmarks_table using btree (url, category_id)
where
  (
    (category_id is not null)
    and (category_id <> 0)
  ) tablespace pg_default;

create index if not exists idx_title_description on public.bookmarks_table using btree (title, description) tablespace pg_default;


create table
  public.categories (
    id bigint generated by default as identity,
    created_at timestamp with time zone null default now(),
    category_name text null,
    user_id uuid null,
    category_slug character varying not null,
    is_public boolean not null default false,
    icon character varying null default 'file'::character varying,
    category_views json null default '{ 	"moodboardColumns": [ 		30 	], 	"cardContentViewArray": ["cover", "title", "info"], 	"bookmarksView": "moodboard", 	"sortBy": "date-sort-acending" }'::json,
    order_index bigint null,
    icon_color text null default '#000000'::text,
    constraint categories_pkey primary key (id),
    constraint categories_category_slug_key unique (category_slug),
    constraint categories_user_id_fkey foreign key (user_id) references profiles (id)
  ) tablespace pg_default;

  -- inserts the uncategorised collection into the table
  insert into categories (id, category_name, category_slug) values (0, '00uncategorized', '00uncategorized');


  create table
  public.profiles (
    id uuid not null,
    email text null,
    user_name character varying null,
    profile_pic character varying null,
    bookmarks_view json null default '{ 	"moodboardColumns": [ 		30 	], 	"cardContentViewArray": ["cover", "title", "info"], 	"bookmarksView": "moodboard", 	"sortBy": "date-sort-acending" }'::json,
    category_order bigint[] null,
    constraint profiles_pkey primary key (id),
    constraint profiles_email_key unique (email),
    constraint profiles_user_name_key unique (user_name),
    constraint profiles_id_fkey foreign key (id) references auth.users (id),
    constraint bookmarks_view_check check (
      (
        (
          (bookmarks_view -> 'moodboardColumns'::text) is not null
        )
        and (
          (bookmarks_view -> 'cardContentViewArray'::text) is not null
        )
        and (
          (bookmarks_view -> 'bookmarksView'::text) is not null
        )
        and ((bookmarks_view -> 'sortBy'::text) is not null)
      )
    )
  ) tablespace pg_default;


  create table
  public.shared_categories (
    id bigint generated by default as identity,
    created_at timestamp with time zone null default now(),
    category_id bigint not null,
    email character varying null,
    edit_access boolean not null default false,
    user_id uuid not null,
    category_views json not null default '{   "moodboardColumns": [     30   ],   "cardContentViewArray": [     "cover",     "title",     "info"   ],   "bookmarksView": "moodboard",   "sortBy": "date-sort-acending" }'::json,
    is_accept_pending boolean null default true,
    constraint shared_categories_pkey primary key (id),
    constraint shared_categories_category_id_fkey foreign key (category_id) references categories (id),
    constraint shared_categories_user_id_fkey foreign key (user_id) references profiles (id)
  ) tablespace pg_default;


  create table
  public.tags (
    id bigint generated by default as identity,
    created_at timestamp with time zone null default now(),
    name text null,
    user_id uuid null,
    constraint tags_pkey primary key (id),
    constraint tags_user_id_fkey foreign key (user_id) references auth.users (id)
  ) tablespace pg_default;
```

## Create buckets

In supabase storage create the following buckets `bookmarks`, `user_profile` and
`files` and have these buckets as public.

## Make search api work

For search to work we need to first enable the `pg_trgm` extensions under you
supabase projects extensions. After this you need to create a fuction with the
following query

```sql
CREATE OR REPLACE FUNCTION public.search_bookmarks("search_text" varchar)
RETURNS TABLE (
    id int8,
    user_id uuid,
    inserted_at timestamptz,
    title citext,
    url text,
    description text,
    ogImage text,
    screenshot text,
    category_id int8,
    trash bool,
    type text,
    meta_data jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
        SELECT *
        FROM bookmarks_table b
        WHERE
            (search_text % ANY(STRING_TO_ARRAY(b.title || b.description, ' ')))
            OR EXISTS (
                SELECT 1
                FROM jsonb_each_text(b.meta_data) x(key, value)
                WHERE key = 'img_caption' AND value ILIKE '%' || search_text || '%'
            );
END;
$$;
```

## Add triggers

Create a trigger with the following query

```sql
-- inserts a row into public.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id,email)
  values (new.id, new.email);
  return new;
end;
$$;


-- trigger the function every time a user is created
drop trigger on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

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
[16]: https://npmpackagejsonlint.org/

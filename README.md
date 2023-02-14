# Next React App

## Introduction

Built using the [Next.js framework](https://nextjs.org/) and written in
TypeScript & other amazing technologies mentioned below to build a modern web
application.

### Stack

- [react](https://reactjs.org/)
- [next.js](https://nextjs.org/)
- [typeScript](https://www.typescriptlang.org/)
- [zod](https://github.com/colinhacks/zod)
- [tailwindcss](https://tailwindcss.com/)
- [eslint](https://eslint.org/)
- [prettier](https://prettier.io/)
- [stylelint](https://stylelint.io/)
- [jest](https://jestjs.io/)
- [react-testing-library](https://testing-library.com/docs/react-testing-library/intro/)
- [next-seo](https://github.com/garmeeh/next-seo#readme)
- [next-sitemap](https://github.com/iamvishnusankar/next-sitemap)
- [pnpm](https://pnpm.io/)
- [husky](https://typicode.github.io/husky/#/)
- [lint-staged](https://github.com/okonet/lint-staged#readme)
- [commitlint](https://commitlint.js.org/#/)
- [gacp](https://github.com/vivaxy/gacp#readme)
- [release-it](https://github.com/release-it/release-it#readme)

## Getting Started

## **Prerequisites**

Before you get started, you will need to have the following tools installed on
your machine:

- **[Node.js](https://nodejs.org/en/)** (version 12 or later)
- **[pnpm](https://pnpm.io/)** (version 5 or later) or
  **[npm](https://www.npmjs.com/)** or **[yarn](https://yarnpkg.com/)** (version
  6 or later)
- **[Git](https://git-scm.com/)** (optional, but recommended for version
  control)

### **Cloning the Git repository**

If you have Git installed, you can clone the Git repository using the following
command:

```bash
git clone https://github.com/navin-moorthy/next-react-app.git
```

## Installing the dependencies

After you have set the environmental variables in the **`.env`** file, you can
run the project locally by

```bash
pnpm install
or
npm install
or
yarn install
```

This will download and install all the required dependencies for the project.

## Running the project locally

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

Open http://localhost:3000 with your browser to see the result.

You can start editing the page by modifying `src/pages/index.js`. The page
auto-updates as you edit the file

## **Building the project**

To build the project to a production environment, you can use the

```bash
pnpm build
# or
npm run build
# or
yarn build
```

to build the production-ready version of the project. This will create a
**`.next`** directory with the compiled code and static assets.

Run the above built application locally using

```bash
pnpm start
# or
npm run start
# or
yarn start
```

## **Deploying the project**

You can then deploy the **`.next`** directory to your production environment
using a static file server, such as **[NGINX](https://www.nginx.com/)**.

## More DX scripts

## Linting

> Check for all the below linting errors in one command

`pnpm lint`

> AutoFix all the below linting errors in one command

`pnpm format`

## Eslint

> Extend **react-app** configs, **react-app/jest**, **prettier** &
> **@next/next** configs

> Check for the linting errors

`pnpm lint:eslint`

> AutoFix the linting errors

`pnpm format:eslint`

## Prettier

> Used in conjuction with Eslint with `eslint-plugin-prettier` &
> `eslint-config-prettier`

> Check the formatting errors

`pnpm lint:prettier`

> AutoFix the formatting errors

`pnpm format:prettier`

## Stylelint

> Check the css formatting errors

`pnpm lint:csslint`

> AutoFix the css formatting errors

`pnpm format:csslint`

## Check Types

> Check TypeScript types

`pnpm lint:types`

## Test

> Run the test suite

`pnpm test`

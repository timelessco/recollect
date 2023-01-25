# Getting started :
Guide explaining how to get started with running the api in your local machine 

## Installation :

```
npm i
# or 
yarn 
```

# Running dev and prod server
Running dev
```
npm run dev
# or
yarn dev
```

Running prod 

```
npm run build // this generates build file 
# then
npm run start // this starts prod server 

# or

yarn build // this generates build file
# then 
yarn start // this starts prod server
```

## Adding env vars 

### For Auth
You need to create your google oAuth credentials and add your `google client id` and `google client secret`

```
GOOGLE_ID=
GOOGLE_SECRET=
```

This app uses [supabase](https://supabase.com/) for database and auth, so you will have to create a new project here and then add the following as env vars

supabase public env vars, these can be found in your supabase projects settings

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your supabase projects anon key>
NEXT_PUBLIC_SUPABASE_URL=<your supabase projects url>
```

supabase private env vars, these too can be found in your supabase projects settings

> NOTE: these are to be only used on next api side , not on the client side, hence they dont have NEXT_PUBLIC in env names


```
SUPABASE_SERVICE_KEY=<your supbase projects service key>
SUPABASE_JWT_SECRET_KEY=<your supbase projects jwt secret>
```

These are all the env you will end up with 

```
GOOGLE_ID=
GOOGLE_SECRET=
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your supabase projects anon key>
NEXT_PUBLIC_SUPABASE_URL=<your supabase projects url>
SUPABASE_SERVICE_KEY=<your supbase projects service key>
SUPABASE_JWT_SECRET_KEY=<your supbase projects jwt secret>
```

Having all these env vars will get the auth and api side of things working for the app.
# Self-host documentation

## Hosting Front end on Vercel

Go to the following URL

<https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftimelessco%2Frecollect&env=SUPABASE_SERVICE_KEY,NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_SUPABASE_URL>

This will ask the following env variables

Note: you will have a create a project in [Supabase](https://supabase.com/) to get the env variables

```env
SUPABASE_SERVICE_KEY: Supabase project service key got from Supabase dashboard
NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase project anon key got from Supabase dashboard
NEXT_PUBLIC_SUPABASE_URL: Supabase project url got from Supabase dashboard
```

Adding these env variables will deploy your app in Vercel !

---

## Self-hosting Supabase

Follow the following steps to self-host Supabase

### Running Supabase locally

- Follow the steps as mentioned in <https://supabase.com/docs/guides/self-hosting/docker>, in this example, we are going to follow the docker version and get Supabase running locally
- In local Supabase `SQL editor` <http://localhost:8000/project/default/sql/1> add the following as per <https://github.com/timelessco/recollect/blob/main/.github/DEVELOPMENT.md#things-to-do-in-supabase> to add all the needed tables functions and triggers

Now you should have Supabase running with all the needed tables, functions, and triggers for the project!

### Make storage work

Add the following RLS policies in your locally running Supabase

```sql
add policy under storage.objects
INSERT
Enable insert for authenticated users only
SELECT
Enable read access for all users
```

### Make email work

This example is using [Resend](https://resend.com/home). Update the following in the `docker/.env` file

```env
SMTP_ADMIN_EMAIL=noreply@example-email.dev
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=<resend_pass>
SMTP_SENDER_NAME=<name>
```

### Disable Confirm email

By default once user logs in they will have to confirm their email via a confirmation mail. If you want to disable this then in the `docker/.env` file update `ENABLE_EMAIL_AUTOCONFIRM` to disable the confirm email in signup

### Make Google auth work

To make this work in the `docker/docker-compose.yaml` file as per <https://github.com/orgs/supabase/discussions/4885> discussion add the following

```env
GOTRUE_EXTERNAL_GOOGLE_ENABLED: ${ENABLE_GOOGLE_SIGNUP}
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
GOTRUE_EXTERNAL_GOOGLE_SECRET: ${GOOGLE_CLIENT_SECRET}
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: http://localhost:8000/auth/v1/callback
```

You will have to get `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from [Google Console](https://console.cloud.google.com/apis/credentials). After this update the `redirect_uri` in the Google console

### In the Front end

Update all the env variables as per <https://github.com/timelessco/recollect/blob/main/env.local.txt>. The updated env variables should point out to the Supabase self hosted version

### Setting up Recollect server keys, this is used for screenshot apis that run on other servers like awz or Hetzner

```env
RECOLLECT_SERVER_API: ${RECOLLECT_SERVER_API}
RECOLLECT_SERVER_API_KEY: ${RECOLLECT_SERVER_API_KEY}
```

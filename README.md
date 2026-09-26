# Coach Skill — Value Selling Workshop

Next.js site for Coach Skill's Value Selling Workshop: marketing pages, a £25 deposit via Stripe Checkout, and an admin dashboard for reviewing sign-ups.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in values — see below
npm run db:migrate           # create data/app.db
npm run db:seed              # add the "value-selling" workshop
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If port 3000 is taken, Next picks another port; keep `NEXT_PUBLIC_BASE_URL` in sync with it so Stripe redirects land in the right place.

## Environment

All variables are documented in [`.env.example`](.env.example). The essentials:

| Variable | Needed for |
| --- | --- |
| `STRIPE_SECRET_KEY` | Creating checkout sessions (`sk_test_…` in dev) |
| `STRIPE_WEBHOOK_SECRET` | Recording paid sign-ups from `/api/stripe-webhook` |
| `NEXT_PUBLIC_BASE_URL` | Stripe success/cancel redirect URLs |
| `AUTH_SECRET` (or `NEXTAUTH_SECRET`) | Admin sessions — `/admin` returns 503 without it |
| `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` (or `ADMIN_PASSWORD`) | Admin login |
| `N8N_WEBHOOK_SECRET` | Accepting sign-ups from n8n |

A bcrypt hash must have every `$` escaped as `\$` in `.env.local`, or Next will mangle it. `.env.example` has a command that prints it already escaped.

## Features

- **Pages** — `/` (book a discovery call), `/discovery-call` (step-by-step discovery call form), `/workshop` (Value Selling Workshop + checkout), `/meet-monika` (coach profile), `/landing` (About Coach Skill), `/client-login` (placeholder until client accounts exist).
- **Checkout** — "Secure your place" collects name and email, then redirects to Stripe Checkout for the £25 deposit. Uses `STRIPE_PRICE_ID` if set, otherwise an inline £25 price. On return to `/workshop`, `?checkout=success|canceled` shows a banner.
- **Sign-ups** — Stored in SQLite (`signups` table), created by:
  - **Stripe** — `checkout.session.completed` events on `POST /api/stripe-webhook`. In Stripe Dashboard → Developers → Webhooks, point an endpoint at `https://your-domain.com/api/stripe-webhook`. Locally, use `stripe listen --forward-to localhost:3000/api/stripe-webhook`.
  - **n8n** — `POST /api/webhooks/n8n` with `Authorization: Bearer <N8N_WEBHOOK_SECRET>` (or `X-Webhook-Secret`) and a JSON body `{ "workshopSlug", "name", "email", "id" }`, plus optional `phone` and `company`. `id` makes retries idempotent.
- **Discovery call spam protection** — `POST /api/discovery-call` requires a signed, time-stamped token from `GET /api/discovery-call` (signed with `AUTH_SECRET`), allows 5 submissions per IP per hour, and quietly drops submissions that fill the hidden honeypot field, arrive within 4 seconds of the token, or contain more than 2 links. See [`lib/spam.ts`](lib/spam.ts).
- **Admin** — Sign in at `/admin/login`. `/admin` lists sign-ups filtered by workshop and status; each can be marked accepted, on hold or declined, with notes. Protected by `middleware.ts` and NextAuth credentials auth.

## Database

SQLite via [Drizzle ORM](https://orm.drizzle.team) and `better-sqlite3`. The default file is `data/app.db` (git-ignored); override it with `SQLITE_PATH`.

- Schema: [`lib/db/schema.ts`](lib/db/schema.ts). Tables are `workshops` and `signups`.
- After changing the schema: `npm run db:generate` to write a migration into `drizzle/`, then `npm run db:migrate`.
- `npm run db:seed` inserts the `value-selling` workshop if it doesn't already exist.

The `db:*` scripts don't load `.env.local`. If you use a custom `SQLITE_PATH`, or want the seeded workshop to store Stripe IDs, pass the values inline:

```bash
SQLITE_PATH=data/app.db STRIPE_PRICE_ID=price_123 npm run db:seed
```

## Project structure

```
├── app/
│   ├── page.tsx                 # Home — book a discovery call
│   ├── discovery-call/          # Discovery call form
│   ├── workshop/                # Value Selling Workshop + checkout
│   ├── client-login/            # Placeholder
│   ├── landing/                 # About Coach Skill
│   ├── meet-monika/             # Coach profile
│   ├── admin/                   # Dashboard + login
│   └── api/
│       ├── create-checkout-session/
│       ├── stripe-webhook/
│       ├── webhooks/n8n/
│       ├── admin/signups/       # List + update sign-ups (auth required)
│       └── auth/[...nextauth]/
├── components/                  # Page sections, checkout button/banner, admin table
├── contexts/CheckoutContext.tsx # Checkout modal state
├── lib/db/                      # Drizzle client, schema, queries
├── drizzle/                     # SQL migrations
├── scripts/                     # migrate + seed
├── auth.ts                      # NextAuth config
├── middleware.ts                # Guards /admin
└── public/assets/               # Logo, poster, coach portrait
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed the default workshop |

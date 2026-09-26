# Coach Skill

Next.js site for Coach Skill: marketing pages, a discovery call form, the Value Selling Workshop with a £25 Stripe deposit, and a client portal — an admin area for Monika to manage clients, and a private area for each client.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in values — see below
npm run db:migrate           # create data/app.db
npm run db:seed              # add the "value-selling" workshop
npm run admin:create -- you@example.com "Your Name"   # prints a link to set your password
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If port 3000 is taken, Next picks another port; keep `NEXT_PUBLIC_BASE_URL` in sync with it (or leave it unset locally) so Stripe redirects and email links land in the right place.

## Environment

All variables are documented in [`.env.example`](.env.example). The essentials:

| Variable | Needed for |
| --- | --- |
| `STRIPE_SECRET_KEY` | Creating checkout sessions (`sk_test_…` in dev) |
| `STRIPE_WEBHOOK_SECRET` | Recording paid sign-ups from `/api/stripe-webhook` |
| `NEXT_PUBLIC_BASE_URL` | Stripe redirects and links in emails |
| `AUTH_SECRET` (or `NEXTAUTH_SECRET`) | Login sessions and form tokens — `/admin` and `/portal` return 503 without it |
| `RESEND_API_KEY` | Sending invites, password resets and notifications (from `mail.coachskill.co.uk`) |
| `N8N_WEBHOOK_SECRET` | Accepting sign-ups from n8n |

## Features

- **Pages** — `/` (book a discovery call), `/discovery-call` (step-by-step discovery call form), `/workshop` (Value Selling Workshop + checkout), `/meet-monika` (coach profile), `/landing` (About Coach Skill), `/login` (admins and clients).
- **Checkout** — "Secure your place" collects name and email, then redirects to Stripe Checkout for the £25 deposit. Uses `STRIPE_PRICE_ID` if set, otherwise an inline £25 price. On return to `/workshop`, `?checkout=success|canceled` shows a banner.
- **Sign-ups** — Stored in SQLite (`signups` table), created by:
  - **Stripe** — `checkout.session.completed` events on `POST /api/stripe-webhook`. In Stripe Dashboard → Developers → Webhooks, point an endpoint at `https://your-domain.com/api/stripe-webhook`. Locally, use `stripe listen --forward-to localhost:3000/api/stripe-webhook`.
  - **n8n** — `POST /api/webhooks/n8n` with `Authorization: Bearer <N8N_WEBHOOK_SECRET>` (or `X-Webhook-Secret`) and a JSON body `{ "workshopSlug", "name", "email", "id" }`, plus optional `phone` and `company`. `id` makes retries idempotent.
- **Discovery call spam protection** — `POST /api/discovery-call` requires a signed, time-stamped token from `GET /api/discovery-call` (signed with `AUTH_SECRET`), allows 5 submissions per IP per hour, and quietly drops submissions that fill the hidden honeypot field, arrive within 4 seconds of the token, or contain more than 2 links. See [`lib/spam.ts`](lib/spam.ts).
- **Workshop signups** — `/admin/signups` lists sign-ups filtered by workshop and status; each can be marked accepted, on hold or declined, with notes.

## Client portal

Accounts live in the `users` table with a role of `admin` or `client`; everyone signs in at `/login` and lands in their own area.

**Admin (`/admin`)**
- **Overview** — active clients, unread messages, sessions in the next 7 days and new discovery requests.
- **Discovery requests** — "Work with … & send invite" turns a request into a client and emails them a link to create their account. Their discovery answers stay attached as their goals.
- **Clients** — portal status (no account / invited / active), next session and unread messages at a glance. Clients can also be added directly.
- **Client page** — messages, notes (private, or shared with the client as an update), sessions (UK time, with an optional meeting link), goals, and status (active / paused / completed). Invites can be resent from here.

**Client (`/portal`)** — next session, latest update, goals, all sessions, all shared updates, messages with the coach, and account settings.

**Emails** (via Resend, from `EMAIL_FROM`) — account invites, password resets, and notifications for new messages, shared updates and booked sessions. To avoid an email per message, a message only triggers an email when the recipient has nothing else unread. Without `RESEND_API_KEY`, emails are logged to the server console and the admin sees invite links on screen to send themselves.

**Security**
- Invite and reset links are single-use, stored only as hashes, and expire after 7 days (invites) or 1 hour (resets). Issuing a new link cancels the old one.
- Passwords are bcrypt-hashed, at least 10 characters. Changing or resetting a password signs out every other session.
- Login and reset requests are rate-limited.
- `middleware.ts` routes people by role, and every page and server action re-checks the user against the database ([`lib/dal.ts`](lib/dal.ts)).

**Admin accounts** are created from the command line — there's no public sign-up:

```bash
npm run admin:create -- monika@example.com "Monika Kozlowska"
```

It prints a one-time link to set a password. Running it again for an existing admin issues a fresh link (useful if one expires).

## Database

SQLite via [Drizzle ORM](https://orm.drizzle.team) and `better-sqlite3`. The default file is `data/app.db` (git-ignored); override it with `SQLITE_PATH`.

- Schema: [`lib/db/schema.ts`](lib/db/schema.ts). Tables: `workshops`, `signups`, `discovery_calls`, and for the portal `clients`, `users`, `password_tokens`, `client_notes`, `coaching_sessions` and `messages`.
- After changing the schema: `npm run db:generate` to write a migration into `drizzle/`, then `npm run db:migrate`.
- `npm run db:seed` inserts the `value-selling` workshop if it doesn't already exist.

The `db:*` and `admin:create` scripts read `.env.local`, so `SQLITE_PATH` and Stripe IDs set there are picked up.

## Deploying

The live site (https://coachskill.co.uk) runs on a Linode server under pm2, behind nginx with a Let's Encrypt certificate. To deploy whatever is on GitHub's `main`:

```bash
git push
./scripts/deploy.sh
```

The server clones the new commit into its own release folder, installs dependencies (reusing the previous ones if `package-lock.json` hasn't changed), builds, backs up the database, runs migrations, then switches over and restarts. The old release keeps serving until the switch, and if the new one fails its health check it switches straight back. `./scripts/deploy.sh rollback` returns to the previous release (database migrations aren't undone, so keep them additive).

Server layout (`/opt/coachskill`): `releases/` (last 5), `current` → the live release, `shared/.env.local` (live settings), `shared/data/app.db` (live database), `backups/` (last 20 database backups). SSH access uses the `coachskill-live` host alias with the `~/.ssh/coachskill_deploy` key.

Server-side tasks, e.g. creating an admin:

```bash
ssh coachskill-live 'cd /opt/coachskill/current && npm run admin:create -- monika@example.com "Monika Kozlowska"'
```

## Project structure

```
├── app/
│   ├── page.tsx                 # Home — book a discovery call
│   ├── discovery-call/          # Discovery call form
│   ├── workshop/                # Value Selling Workshop + checkout
│   ├── login/, forgot-password/, set-password/  # Sign-in pages
│   ├── portal/                  # Client area
│   ├── actions/                 # Server actions (auth, admin, portal)
│   ├── landing/                 # About Coach Skill
│   ├── meet-monika/             # Coach profile
│   ├── admin/                   # Admin area: overview, clients, discovery requests, signups
│   └── api/
│       ├── create-checkout-session/
│       ├── stripe-webhook/
│       ├── webhooks/n8n/
│       ├── admin/signups/       # List + update sign-ups (auth required)
│       └── auth/[...nextauth]/
├── components/                  # Page sections, checkout, discovery flow, admin/portal/auth UI
├── contexts/CheckoutContext.tsx # Checkout modal state
├── lib/db/                      # Drizzle client, schema, queries
├── lib/                         # Accounts, access checks (dal), portal queries, email, spam protection
├── drizzle/                     # SQL migrations
├── scripts/                     # migrate, seed, create-admin, deploy.sh
├── ecosystem.config.cjs         # pm2 config for the live server
├── auth.ts                      # NextAuth config
├── middleware.ts                # Routes /admin and /portal by role
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
| `npm run admin:create -- <email> "<name>"` | Create an admin (or re-issue their set-password link) |

# Coach Skill — Value Selling Workshop

A Next.js landing page for the Value Selling Workshop deposit, built for Coach Skill.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment (`.env.local`)

1. **Stripe**
   - `STRIPE_SECRET_KEY` — from [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikeys).
   - `NEXT_PUBLIC_BASE_URL` — your public URL (e.g. dev tunnel or production). Used for Stripe success/cancel redirects.
   - Optional: `STRIPE_PRICE_ID`, `STRIPE_PRODUCT_ID`, `NEXT_PUBLIC_STRIPE_IMAGE_URL` for Stripe Checkout.
   - Optional (recommended): `STRIPE_WEBHOOK_SECRET` — so completed payments automatically update “sold” quantity. In Stripe Dashboard → Developers → Webhooks, add endpoint `https://your-domain.com/api/stripe-webhook` and select `checkout.session.completed`.

2. **Admin login**
   - `ADMIN_EMAIL` — email you use to sign in to the admin area.
   - `ADMIN_PASSWORD` — password for admin login.
   - `NEXTAUTH_SECRET` — random string (e.g. `openssl rand -base64 32`). Required for NextAuth.
   - `NEXTAUTH_URL` — full URL of the app (e.g. `http://localhost:3000` in dev, or your production URL).

3. Run the app; “Secure your place” opens the modal; after name/email, “Pay £25” redirects to Stripe Checkout.

## Project Structure

```
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Homepage
│   └── globals.css     # Global styles
├── components/
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── Benefits.tsx
│   ├── Coach.tsx
│   ├── WorkshopDetails.tsx
│   ├── CheckoutModal.tsx   # Client component — payment form
│   └── Footer.tsx
└── public/
    └── assets/             # Images (logo, poster, coach portrait)
```

## Features

- **Landing page** — Workshop info, benefits, coach section, payment
- **Checkout modal** — Two-step flow: name/email → redirect to Stripe Checkout for £25 deposit
- **Stripe** — Checkout Session API; success/cancel redirects and banner
- **Admin** — Sign in at `/admin/login` (use `ADMIN_EMAIL` and `ADMIN_PASSWORD`). From `/admin` you can manage **product quantities**: set max quantity and sold count per product. Checkout is blocked when a product has no spots left, and the “Secure your place” button shows spots left and is disabled when fully booked.
- **Inventory** — Stored in `data/inventory.json`. Optional Stripe webhook updates “sold” when a payment completes.
- **Responsive** — Mobile and desktop layouts

## Future Additions

- API routes for other form submissions
- Additional pages (e.g. success, workshop schedule)
- Analytics, SEO

## Build

```bash
npm run build
npm start
```

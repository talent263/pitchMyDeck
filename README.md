# PitchMyDeck

An App Router SaaS foundation for generating target-contextual pitch decks from rough notes and a public URL.

## Start

1. Copy `.env.example` to `.env.local` and add an OpenAI API key.
2. Run `npm install` and `npm run dev`.

## Architecture

- `lib/schemas.ts`: Zod-backed API/domain contracts for slides, decks, and generation input.
- `lib/url-extractor.ts`: server-only readable-text extraction with public-network checks, content-type validation, size limits, and timeouts.
- `app/api/generate-deck/route.ts`: validates input, extracts context, calls OpenAI JSON mode, and validates the generated deck before responding.
- `components/SlideViewer.tsx`: keyboard-accessible, themed, animated viewer with fullscreen presentation mode.
- `app/api/export/pptx/route.ts` and `utils/exportToPptx.ts`: server-generated PPTX download flow using PptxGenJS.

## SaaS upgrade

The starter now includes Auth.js v5 authentication (credentials, email magic link, Google, GitHub), Prisma/PostgreSQL account and payment records, protected deck/export APIs, Stripe Checkout/webhooks, and Paynow/EcoCash signed callbacks. Generate the Prisma client then migrate before starting:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

Configure the provider values in `.env.local`. Payment access is granted only from verified Stripe or Paynow callbacks; browser redirects never grant credits. Guests may generate one preview but cannot export.

For production, add Redis rate limiting, a durable generation queue, URL reputation/proxy controls, transaction reconciliation/polling for Paynow, and persist the support endpoint to your selected helpdesk or chat service.

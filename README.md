# Bellavita Live - Playwright Regression Suite

Playwright + TypeScript (Page Object Model) regression suite for the real Bellavita Shopify
storefront, https://bellavitaorganic.com/ (customised Dawn theme). Covers PLP, PDP, cart and a
GoKwik COD checkout. Separate from `bellavitaHeadless` (Selenium/Java, Hydrogen storefront).

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env   # then fill in the values below
```

| Variable | Purpose |
|---|---|
| `BASE_URL` | `https://bellavitaorganic.com/` |
| `PREVIEW_THEME_ID` | Theme to test. The live theme for regression, or a ticket's preview theme. Empty = whatever is published. |
| `TEST_PHONE` | KwikPass/GoKwik test phone. Its OTP is delivered by email. Unset = checkout test skipped. |
| `OTP_SENDER_EMAIL` | Address the OTP mail arrives from. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` | Gmail API access for reading the OTP. Same credentials as `bellavitaHeadless`. |

`global-setup.ts` opens `/?preview_theme_id=<PREVIEW_THEME_ID>` once and saves the session to
`auth/storefront.json`. Every test reuses it, so all pages render that theme.

### Cloudflare

bellavitaorganic.com is behind Cloudflare. The suite never tries to solve challenges. If one
appears, the run stops with a clear error. Runs from office/home machines currently pass.
GitHub-hosted runners use datacenter IPs and may get challenged. If they do, use a self-hosted
runner on an office machine (`runs-on: self-hosted`).

### Refresh token expiry

If the Google OAuth app's consent screen is in "Testing" mode, refresh tokens expire after 7 days
and the OTP reader fails with `invalid_grant`. Fix: regenerate the token with `bellavitaHeadless`'s
`GoogleRefreshTokenGenerator`, update `.env` and the GitHub secret, and switch the consent
screen to "In production".

## Running tests

```bash
npm test                         # full suite (checkout places a real COD order)
npm run test:no-checkout         # everything except the COD order
npm run test:headed
npm run report                   # open the last HTML report
```

Test COD orders are placed from `TEST_PHONE` and auto-cancelled by a Shopify Flow on the store.

## CI

`.github/workflows/regression.yml` runs from the Actions tab before each release (optionally
with a different theme ID or without checkout). It publishes the Playwright HTML report to GitHub
Pages under `runs/<run number>/` and posts a one-line summary with the link to Slack.

Repository setup:
- **Secrets:** `TEST_PHONE`, `OTP_SENDER_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_REFRESH_TOKEN`, `SLACK_WEBHOOK_URL` (incoming webhook for #bellavita-daily-scrum)
- **Variables:** `LIVE_THEME_ID` (currently `131249733678`)
- **Pages:** Settings → Pages → deploy from branch `gh-pages`

## Structure

```
pages/                  Page objects
  BasePage.ts             Navigation helper; fails fast on a Cloudflare challenge
  CloudflareChallenge.ts  Challenge detection (no solving)
  StorePasswordPage.ts    Shopify password-gate unlock (unused on live)
  CollectionPage.ts       PLP product grid
  ProductPage.ts          PDP: title, price, quantity, add to cart
  CartDrawer.ts           Cart drawer; counts/totals via /cart.js
  CheckoutPage.ts         GoKwik iframe: phone, OTP, COD, thank-you
utils/GmailOtpReader.ts   Fetches the GoKwik OTP mail via the Gmail REST API
fixtures/pages.ts         Wires page objects into `test`
test-data/products.ts     Product and collection handles
tests/                    plp, pdp, cart, checkout specs
scripts/slack-summary.mjs CI Slack summary
```

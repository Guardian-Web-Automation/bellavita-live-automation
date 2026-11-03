import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { StorePasswordPage } from './pages/StorePasswordPage';
import { CloudflareChallenge } from './pages/CloudflareChallenge';

dotenv.config();

const AUTH_FILE = path.join(__dirname, 'auth', 'storefront.json');

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0].use.baseURL as string;
  const storePassword = process.env.STORE_PASSWORD;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Visiting the preview link once sets its session cookie (Shopify's preview_theme_id, VWO's
  // preview params), which the saved storage state then carries into every test. PREVIEW_URL is a
  // ticket's full preview link; PREVIEW_THEME_ID is the shorthand for a bare theme preview.
  const themeId = process.env.PREVIEW_THEME_ID;
  const entryUrl =
    process.env.PREVIEW_URL ||
    (themeId ? new URL(`/?preview_theme_id=${themeId}`, baseURL).toString() : baseURL);
  await page.goto(entryUrl, { waitUntil: 'domcontentloaded' });

  // A Cloudflare challenge here means BASE_URL points at the protected domain rather than a
  // theme preview URL. Fail the whole run up front instead of every test failing on it.
  try {
    await new CloudflareChallenge(page).failIfPresent();
  } catch (err) {
    await browser.close();
    throw err;
  }

  const passwordPage = new StorePasswordPage(page);
  if (await passwordPage.isShown()) {
    if (!storePassword) {
      await browser.close();
      throw new Error(
        'Store is password-protected but STORE_PASSWORD is not set. Add it to a .env file (see .env.example).'
      );
    }
    await passwordPage.unlock(storePassword);
  }

  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();
}

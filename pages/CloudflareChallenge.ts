import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Detects Cloudflare's "Verify you are human" interstitial in front of the storefront.
 *
 * The suite never tries to solve the challenge. bellavitaorganic.com sits behind Cloudflare, so
 * runs target a theme preview URL that does not hit it. If a challenge does appear, BASE_URL
 * points at the wrong host, and we fail fast with a message saying so.
 */
export class CloudflareChallenge extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * True if the current page looks like a Cloudflare challenge/interstitial.
   */
  async isPresent(): Promise<boolean> {
    const title = await this.page.title().catch(() => '');
    if (/just a moment|attention required|verify you are human/i.test(title)) {
      return true;
    }

    const markers = this.page.locator(
      '#challenge-form, .cf-turnstile, iframe[src*="challenges.cloudflare.com"]'
    );
    return (await markers.count()) > 0;
  }

  /**
   * Throws if a challenge is on the page, so the run stops instead of asserting against it.
   */
  async failIfPresent(): Promise<void> {
    if (await this.isPresent()) {
      throw new Error(
        `Cloudflare challenge served at ${this.page.url()}. Point BASE_URL at a theme preview URL ` +
          'that bypasses Cloudflare (see README), not the bellavitaorganic.com domain.'
      );
    }
  }
}

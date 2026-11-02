import { Page } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string = '/'): Promise<void> {
    // Many storefront themes pull in heavy marketing scripts/images, so the
    // default "load" wait is slow and flaky; DOM readiness is all tests need.
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.failOnCloudflareChallenge();
  }

  /**
   * Stops the test with a clear message if Cloudflare challenged the navigation instead of
   * serving the storefront. Lazy import avoids a circular dependency (CloudflareChallenge
   * extends BasePage).
   */
  protected async failOnCloudflareChallenge(): Promise<void> {
    const { CloudflareChallenge } = await import('./CloudflareChallenge');
    if (this instanceof CloudflareChallenge) return; // don't recurse
    await new CloudflareChallenge(this.page).failIfPresent();
  }

  async title(): Promise<string> {
    return this.page.title();
  }

  async currentUrl(): Promise<string> {
    return this.page.url();
  }
}

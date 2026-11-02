import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Collection / product-listing page (PLP).
 *
 * NOTE (theme-specific): Bellavita's Dawn grid is `ul#product-grid > li.grid__item`, with the
 * card title in `a.card-information__text`.
 */
export class CollectionPage extends BasePage {
  private readonly productCards = this.page.locator('#product-grid > li.grid__item');

  constructor(page: Page) {
    super(page);
  }

  async openByHandle(handle: string): Promise<void> {
    await this.goto(`/collections/${handle}`);
  }

  async productCardCount(): Promise<number> {
    await this.productCards.first().waitFor({ state: 'visible' });
    return this.productCards.count();
  }

  /** Clicks a card's title link and returns its href so callers can assert where it went. */
  async clickProductCard(index: number = 0): Promise<string> {
    const link = this.productCards.nth(index).locator('a.card-information__text').first();
    await link.waitFor({ state: 'visible' });
    const href = (await link.getAttribute('href')) ?? '';
    // The page's animated promo strips keep the grid from ever settling, so Playwright's
    // "stable" actionability check never passes. The link is verified visible above.
    await link.click({ force: true });
    return href;
  }

  async productCardTitle(index: number = 0): Promise<string> {
    const text = await this.productCards.nth(index).locator('a.card-information__text').first().textContent();
    return text?.trim() ?? '';
  }
}

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

type Cart = {
  item_count: number;
  total_price: number;
  items: { handle: string; quantity: number }[];
};

/**
 * Cart drawer.
 *
 * NOTE (theme-specific): Bellavita's `<cart-drawer>` also lists "you may also like" product cards
 * as <li>s, so a cart line is identified by its `cart-remove-button` rather than by tag. Counts and
 * totals come from Shopify's `/cart.js` rather than the DOM: the drawer re-renders asynchronously,
 * and promotions can auto-add free gift lines (e.g. the Diwali silver coin), so callers reason
 * about the product they added, not raw line counts.
 */
export class CartDrawer extends BasePage {
  private readonly drawer = this.page.locator('cart-drawer');
  private readonly lineItems = this.drawer.locator('li:has(cart-remove-button)');
  private readonly checkoutButton = this.drawer.locator('button.revamp-checkout-btn');
  private readonly emptyState = this.drawer.locator('.mini-cart__empty');

  constructor(page: Page) {
    super(page);
  }

  private async cart(): Promise<Cart> {
    return this.page.evaluate(async () => (await fetch('/cart.js')).json());
  }

  async isOpen(): Promise<boolean> {
    return this.lineItems
      .first()
      .waitFor({ state: 'visible' })
      .then(() => true)
      .catch(() => false);
  }

  async itemCount(): Promise<number> {
    return (await this.cart()).item_count;
  }

  async cartTotalCents(): Promise<number> {
    return (await this.cart()).total_price;
  }

  async quantityOf(handle: string): Promise<number> {
    return (await this.cart()).items.find((i) => i.handle === handle)?.quantity ?? 0;
  }

  async lineItemCount(): Promise<number> {
    return this.lineItems.count();
  }

  private lineFor(handle: string) {
    return this.lineItems.filter({ has: this.page.locator(`a[href*="/products/${handle}"]`) }).first();
  }

  async increaseQuantityOf(handle: string): Promise<void> {
    await this.lineFor(handle).locator('button[name="plus"]').click();
  }

  async removeLine(handle: string): Promise<void> {
    const line = this.lineFor(handle);
    // The <cart-remove-button> wrapper has no box of its own; the clickable control is inside it.
    await line.locator('cart-remove-button :is(a, button):visible').first().click();
    // Removal is an AJAX round-trip; the line stays in the DOM until it resolves.
    await line.waitFor({ state: 'detached' }).catch(() => {});
  }

  async isEmpty(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  async checkout(): Promise<void> {
    // The button carries a `disabled` class until the drawer finishes recalculating.
    await this.drawer.locator('button.revamp-checkout-btn:not(.disabled)').waitFor({ timeout: 15_000 }).catch(() => {});
    await this.checkoutButton.click();
  }
}

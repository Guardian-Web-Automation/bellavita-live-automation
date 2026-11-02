import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Product detail page (PDP).
 *
 * NOTE (theme-specific): Bellavita runs a customised Dawn theme. The page also renders
 * recommendation carousels with their own `.search-atc` "ADD TO CART" buttons and prices, so
 * locators target the main product form's classes. The theme renders two submit buttons (desktop
 * `.bs-atc-btn` and a smaller sticky one) plus hidden `.notify-me-btn` variants, so add-to-cart
 * filters to a visible, non-notify button.
 */
export class ProductPage extends BasePage {
  private readonly productTitle = this.page.locator('h1.product__heading').first();
  private readonly salePrice = this.page.locator('.price-item--sale:visible').first();
  private readonly quantityInput = this.page.locator('form.shopify-product-form input.quantity__input:visible').first();
  private readonly quantityIncreaseButton = this.page.locator('button.quantity__button[name="plus"]:visible').first();
  private readonly quantityDecreaseButton = this.page.locator('button.quantity__button[name="minus"]:visible').first();
  private readonly addToCartButton = this.page
    .locator('button.product-form__submit:not(.notify-me-btn):visible')
    .first();

  constructor(page: Page) {
    super(page);
  }

  async openByHandle(handle: string): Promise<void> {
    await this.goto(`/products/${handle}`);
  }

  async titleText(): Promise<string> {
    return (await this.productTitle.textContent())?.trim() ?? '';
  }

  async priceText(): Promise<string> {
    return (await this.salePrice.textContent())?.trim() ?? '';
  }

  async quantityValue(): Promise<string> {
    return this.quantityInput.inputValue();
  }

  async quantityMax(): Promise<string | null> {
    return this.quantityInput.getAttribute('max');
  }

  async increaseQuantity(): Promise<void> {
    await this.quantityIncreaseButton.click();
  }

  async decreaseQuantity(): Promise<void> {
    await this.quantityDecreaseButton.click();
  }

  async addToCart(): Promise<void> {
    // The AJAX add-to-cart handler binds only after page scripts load (pages open on
    // `domcontentloaded`), so an early click silently no-ops. Wait for the network to settle.
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await this.addToCartButton.click();
    await this.page.locator('cart-drawer cart-remove-button').first().waitFor({ state: 'attached' }).catch(() => {});
  }
}

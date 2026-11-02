import { test, expect } from '../fixtures/pages';
import { products } from '../test-data/products';

test.describe('Product detail page', () => {
  test.beforeEach(async ({ productPage }) => {
    await productPage.openByHandle(products.primary.handle);
  });

  test('loads with a title and price', async ({ productPage }) => {
    expect((await productPage.titleText()).length).toBeGreaterThan(0);
    expect(await productPage.priceText()).toMatch(/₹\s?[\d,]+/);
  });

  test('quantity selector increases and decreases within its allowed max', async ({ productPage }) => {
    const startValue = await productPage.quantityValue();
    const max = await productPage.quantityMax();

    await productPage.increaseQuantity();
    const afterIncrease = await productPage.quantityValue();
    if (max === null || parseInt(startValue, 10) < parseInt(max, 10)) {
      expect(parseInt(afterIncrease, 10)).toBe(parseInt(startValue, 10) + 1);
    } else {
      expect(parseInt(afterIncrease, 10)).toBeLessThanOrEqual(parseInt(max, 10));
    }

    await productPage.decreaseQuantity();
    const afterDecrease = await productPage.quantityValue();
    expect(parseInt(afterDecrease, 10)).toBeLessThanOrEqual(parseInt(afterIncrease, 10));
  });

  test('adding to cart opens the cart drawer with the item', async ({ productPage, cartDrawer }) => {
    await productPage.addToCart();
    expect(await cartDrawer.isOpen()).toBeTruthy();
    expect(await cartDrawer.quantityOf(products.primary.handle)).toBe(1);
  });
});

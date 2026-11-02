import { test, expect } from '../fixtures/pages';
import { products } from '../test-data/products';

const handle = products.primary.handle;

test.describe('Cart', () => {
  test.beforeEach(async ({ productPage }) => {
    await productPage.openByHandle(handle);
    await productPage.addToCart();
  });

  test('added item appears in the cart drawer with a non-zero total', async ({ cartDrawer }) => {
    expect(await cartDrawer.isOpen()).toBeTruthy();
    expect(await cartDrawer.quantityOf(handle)).toBe(1);
    expect(await cartDrawer.cartTotalCents()).toBeGreaterThan(0);
  });

  test('increasing quantity in the drawer updates the cart', async ({ cartDrawer }) => {
    await cartDrawer.increaseQuantityOf(handle);
    await expect.poll(() => cartDrawer.quantityOf(handle), { timeout: 20_000 }).toBe(2);
  });

  test('removing the product takes it out of the cart', async ({ cartDrawer }) => {
    await cartDrawer.removeLine(handle);
    await expect.poll(() => cartDrawer.quantityOf(handle), { timeout: 20_000 }).toBe(0);
  });
});

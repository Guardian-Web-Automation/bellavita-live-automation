import { test, expect } from '../fixtures/pages';
import { products } from '../test-data/products';

/**
 * End-to-end COD checkout: PDP -> add to cart -> GoKwik -> OTP login -> Cash on Delivery.
 * Places a real order on every run; the store's Shopify Flow auto-cancels orders from the test
 * phone number. Requires TEST_PHONE, OTP_SENDER_EMAIL and the GOOGLE_* OTP-reader credentials.
 */
test.describe('Checkout', () => {
  test('guest can place a COD order through GoKwik', async ({ productPage, cartDrawer, checkoutPage }) => {
    test.skip(!process.env.TEST_PHONE, 'TEST_PHONE not set');
    test.setTimeout(180_000);

    await productPage.openByHandle(products.primary.handle);
    await productPage.addToCart();
    expect(await cartDrawer.isOpen()).toBeTruthy();

    await cartDrawer.checkout();
    expect(await checkoutPage.isOpen()).toBeTruthy();

    await checkoutPage.loginWithOtp(process.env.TEST_PHONE!);
    await checkoutPage.placeCodOrder();

    const orderId = await checkoutPage.waitForThankYou();
    test.info().annotations.push({ type: 'order', description: orderId });
    expect(orderId).toMatch(/Order ID/i);
  });
});

import { test as base } from '@playwright/test';
import { StorePasswordPage } from '../pages/StorePasswordPage';
import { ProductPage } from '../pages/ProductPage';
import { CartDrawer } from '../pages/CartDrawer';
import { CollectionPage } from '../pages/CollectionPage';
import { CheckoutPage } from '../pages/CheckoutPage';

type Pages = {
  storePasswordPage: StorePasswordPage;
  productPage: ProductPage;
  cartDrawer: CartDrawer;
  collectionPage: CollectionPage;
  checkoutPage: CheckoutPage;
};

export const test = base.extend<Pages>({
  storePasswordPage: async ({ page }, use) => {
    await use(new StorePasswordPage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cartDrawer: async ({ page }, use) => {
    await use(new CartDrawer(page));
  },
  collectionPage: async ({ page }, use) => {
    await use(new CollectionPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
});

export { expect } from '@playwright/test';

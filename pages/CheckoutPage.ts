import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { waitForOtp } from '../utils/GmailOtpReader';

/**
 * GoKwik checkout. The whole flow (mobile login, OTP, payment) renders inside an iframe overlaid
 * on the storefront rather than redirecting to a separate checkout domain. Selectors are ported
 * from bellavitaHeadless's CheckoutPage.java (same GoKwik widget on both storefronts).
 */
export class CheckoutPage extends BasePage {
  private readonly frame = this.page.frameLocator('iframe.gokwik-iframe');
  private readonly phoneInput = this.frame.locator('#phone-input');
  private readonly continueButton = this.frame.locator('#continue-button');
  private readonly otpPrompt = this.frame.getByText('Enter OTP sent to').first();
  // The four OTP boxes are drawn over one 4-digit input.
  private readonly otpInput = this.frame.locator('input[autocomplete="one-time-code"]');
  private readonly codOption = this.frame.locator("[data-testid='payment-method-cod']");
  // GoKwik intermittently shows a "Please confirm the order" prepaid-nudge popup before placing COD.
  private readonly confirmButton = this.frame.getByRole('button', { name: 'Confirm', exact: true });

  constructor(page: Page) {
    super(page);
  }

  async isOpen(): Promise<boolean> {
    return this.phoneInput
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
  }

  /** Enters the phone number, then fetches the emailed OTP and submits it. */
  async loginWithOtp(phone: string): Promise<void> {
    const since = Math.floor(Date.now() / 1000) - 30;
    await this.phoneInput.fill(phone);
    // The first click often lands while GoKwik's loading overlay is up; the OTP sheet then opens over
    // the button, so Playwright keeps retrying a click that already worked. The prompt appearing is
    // the real success signal.
    await Promise.race([
      this.continueButton.click().catch(() => {}),
      this.otpPrompt.waitFor({ state: 'visible', timeout: 30_000 }),
    ]);
    await this.otpPrompt.waitFor({ state: 'visible', timeout: 30_000 });
    const otp = await waitForOtp(since);
    await this.otpInput.pressSequentially(otp, { delay: 100 });
  }

  /** Selects Cash on Delivery, which places the order; confirms the nudge popup if it appears. */
  async placeCodOrder(): Promise<void> {
    await this.codOption.click({ timeout: 30_000 });
    await this.confirmButton.click({ timeout: 5_000 }).catch(() => {});
  }

  /**
   * COD top-level-navigates out of the iframe to the order confirmation, which is either GoKwik's
   * `/thank-you` page or Shopify's customer-account order page (`account.<domain>/orders/<token>`,
   * rendered inside an iframe). Returns the order number, e.g. "BVO379249063921".
   */
  async waitForThankYou(): Promise<string> {
    await this.page.waitForURL(/thank-you|\/orders\//, { waitUntil: 'commit', timeout: 60_000 });
    let orderNumber = '';
    await expect
      .poll(
        async () => {
          for (const frame of this.page.frames()) {
            const text = await frame
              .locator('h1, h2, p')
              .filter({ hasText: /^\s*Order( ID)?[:\s#]+[A-Z0-9-]{5,}/ })
              .first()
              .textContent({ timeout: 1_000 })
              .catch(() => null);
            const match = text?.match(/Order(?: ID)?[:\s#]+([A-Z0-9-]{5,})/);
            if (match) return (orderNumber = match[1]);
          }
          return '';
        },
        { timeout: 30_000, message: 'order confirmation with an order number' }
      )
      .not.toBe('');
    return orderNumber;
  }
}

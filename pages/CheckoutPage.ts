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
  // On this storefront the four OTP digit boxes are drawn over a single unlabelled input that
  // GoKwik auto-focuses, so the OTP screen is detected by its prompt and the digits are typed.
  private readonly otpPrompt = this.frame.getByText('Enter OTP sent to').first();
  private readonly otpInput = this.frame.locator('input:focus').first();
  private readonly codOption = this.frame.locator("[data-testid='payment-method-cod']");
  // GoKwik intermittently shows a "Please confirm the order" prepaid-nudge popup before placing COD.
  private readonly confirmButton = this.frame.getByRole('button', { name: 'Confirm', exact: true });
  private readonly thankYouHeading = this.page.locator('h2', { hasText: 'Thanks for your order' });
  private readonly orderIdText = this.page.locator('p', { hasText: 'Order ID' });

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
    await this.continueButton.click();
    await this.otpPrompt.waitFor({ state: 'visible', timeout: 30_000 });
    const otp = await waitForOtp(since);
    await this.otpInput.pressSequentially(otp, { delay: 100 });
  }

  /** Selects Cash on Delivery, which places the order; confirms the nudge popup if it appears. */
  async placeCodOrder(): Promise<void> {
    await this.codOption.click();
    await this.confirmButton.click({ timeout: 5_000 }).catch(() => {});
  }

  /** COD top-level-navigates out of the iframe to GoKwik's thank-you page. */
  async waitForThankYou(): Promise<string> {
    await this.page.waitForURL(/thank-you/, { timeout: 60_000 });
    await expect(this.thankYouHeading).toBeVisible();
    return (await this.orderIdText.textContent())?.trim() ?? '';
  }
}

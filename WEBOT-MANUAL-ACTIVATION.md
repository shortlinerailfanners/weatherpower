# WeBot manual subscription activation

This replaces Firebase Realtime Database / webhook-based plan activation with activation codes stored in the customer's browser.

## Customer flow

1. Customer chooses **Supporter** or **Fable Unlimited** in WeBot.
2. Stripe Checkout opens and accepts the recurring subscription.
3. Customer is told that activation can take **up to 2 days**.
4. WeatherPower checks the payment in Stripe.
5. WeatherPower generates a code for the exact Stripe email and paid plan.
6. Customer opens WeBot and signs in on the device/browser they use.
7. Customer selects **Enter activation code**, enters the Stripe email and code, and reloads WeBot.

## Owner flow

Open `webot-activation-admin.html`.

1. Check the customer in Stripe first.
2. Enter the exact Stripe checkout email.
3. Choose Supporter or Fable Unlimited.
4. Choose the expiration date. The default 35-day code works well for a monthly subscription and gives a small grace period.
5. Generate and copy the code or complete customer message.
6. Send the code to the customer.

The admin tool stores a local log on the owner's browser. Stripe remains the real payment and subscription record.

## Patching the current WeBot build

Open `webot-manual-activation-patcher.html` and select the newest single-file WeBot HTML.

The patcher:

- runs completely inside the browser;
- does not upload or expose the HTML or embedded API key;
- embeds `webot-activation-core.js` and `webot-manual-activation.js` into the selected file;
- downloads a new single HTML file or ZIP;
- adds an activation-code modal to Billing and Settings;
- changes the old Stripe refresh button to **Enter activation code**;
- shows the up-to-2-days activation notice.

## Files

- `webot-activation-core.js` — creates, validates, and installs device-local codes.
- `webot-manual-activation.js` — drop-in WeBot billing/settings interface.
- `webot-activation-admin.html` — owner code generator and local code history.
- `webot-activate.html` — standalone customer activation page for the same web origin.
- `webot-manual-activation-patcher.html` — patches any recent single-file WeBot HTML and creates a new ZIP.

## Storage behavior

Activation is stored in browser `localStorage` using WeBot's existing plan-state format. Codes include:

- the selected plan;
- a hash of the Stripe checkout email;
- issue and expiration times;
- an optional shortened Stripe payment reference;
- an integrity check to catch altered or damaged codes.

The installer updates the base WeBot plan key and any existing signed-in account-specific plan keys found on the device.

## Important limitations

This is a frontend-only entitlement system. It avoids paid Firebase database/functions, but it is not equivalent to secure server-side Stripe verification.

- A determined user with coding knowledge can inspect or alter browser code and local storage.
- Clearing browser data removes activation.
- A new browser or device requires another code.
- Cancellation does not remotely revoke an already-issued code; expiration controls access.
- Use short expiration periods and verify each renewal in Stripe before issuing another code.

For stronger automatic verification later, use a low-cost serverless webhook or Stripe Entitlements. This manual system is intended for a small, owner-reviewed customer base.

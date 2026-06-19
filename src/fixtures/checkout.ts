export const checkoutVariants = [
  "good-a11y",
  "no-label",
  "icon-only-button",
  "duplicate-names",
  "hidden-noise"
] as const;

export type CheckoutVariant = (typeof checkoutVariants)[number];

export const defaultCheckoutVariant: CheckoutVariant = "good-a11y";

const variantSet = new Set<string>(checkoutVariants);

interface FieldOptions {
  id: string;
  testId: string;
  label: string;
  type?: "email" | "text" | "tel";
  autocomplete?: string;
  placeholder?: string;
  labelMode?: "label" | "placeholder-only" | "weak";
}

export function parseCheckoutVariant(value: string | null | undefined): CheckoutVariant {
  if (value && variantSet.has(value)) {
    return value as CheckoutVariant;
  }

  return defaultCheckoutVariant;
}

export function renderCheckoutPage(variant: CheckoutVariant): string {
  const content = [
    renderHeader(variant),
    renderCheckoutForm(variant),
    renderVariantNoise(variant)
  ].join("\n");

  return `<!doctype html>
<html lang="en">
${renderHead()}
<body data-ai-ready="true" data-test="checkout-app" data-variant="${escapeHtml(variant)}">
${content}
</body>
</html>`;
}

function renderHead(): string {
  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A11y Agent Lab - Checkout Fixture</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
      color: #1f2937;
      background: #f5f7fb;
    }

    body {
      margin: 0;
      min-height: 100vh;
    }

    .page-shell {
      width: min(960px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 48px;
    }

    header {
      margin-bottom: 24px;
    }

    h1,
    h2 {
      margin: 0;
      line-height: 1.2;
      letter-spacing: 0;
    }

    h1 {
      font-size: 2rem;
      color: #111827;
    }

    h2 {
      margin-top: 28px;
      font-size: 1.2rem;
      color: #243b53;
    }

    p {
      margin: 8px 0 0;
      max-width: 62ch;
    }

    form {
      display: grid;
      gap: 20px;
      padding: 24px;
      border: 1px solid #d7dee8;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 10px 24px rgb(31 41 55 / 0.08);
    }

    fieldset {
      display: grid;
      gap: 14px;
      min-width: 0;
      padding: 0;
      border: 0;
    }

    legend {
      padding: 0;
      font-weight: 700;
      color: #111827;
    }

    label {
      display: grid;
      gap: 6px;
      font-weight: 650;
    }

    input,
    select {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #9aa8ba;
      border-radius: 6px;
      padding: 10px 12px;
      font: inherit;
      background: #ffffff;
      color: #111827;
    }

    .field-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .checkbox-label {
      display: flex;
      gap: 10px;
      align-items: center;
      font-weight: 600;
    }

    .checkbox-label input {
      width: auto;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }

    button {
      min-height: 42px;
      border: 0;
      border-radius: 6px;
      padding: 10px 16px;
      font: inherit;
      font-weight: 700;
      color: #ffffff;
      background: #1769aa;
      cursor: pointer;
    }

    button.secondary {
      color: #1769aa;
      background: #e8f2fb;
    }

    button.icon-button {
      width: 42px;
      padding: 0;
      font-size: 1.35rem;
    }

    .inline-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }

    .weak-label {
      color: #697586;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .visually-hidden-noise {
      display: none;
    }

    @media (max-width: 680px) {
      .field-row {
        grid-template-columns: 1fr;
      }

      form {
        padding: 18px;
      }
    }
  </style>
</head>`;
}

function renderHeader(variant: CheckoutVariant): string {
  return `<div class="page-shell">
  <header data-test="checkout-header">
    <h1>Checkout</h1>
    <p data-test="variant-note">Fixture variant: ${escapeHtml(variant)}</p>
  </header>`;
}

function renderCheckoutForm(variant: CheckoutVariant): string {
  return `<main data-test="checkout-main">
  <form data-test="checkout-form" method="post" action="/checkout/complete">
    <h2>Shipping details</h2>
    <fieldset data-test="shipping-section">
      <legend>Contact and address</legend>
      ${renderTextField({
        id: "full-name",
        testId: "full-name",
        label: "Full name",
        autocomplete: "name",
        placeholder: "Jordan Lee"
      })}
      ${renderTextField({
        id: "email",
        testId: "email",
        label: "Email address",
        type: "email",
        autocomplete: "email",
        placeholder: "jordan@example.com",
        labelMode: variant === "no-label" ? "placeholder-only" : "label"
      })}
      ${renderTextField({
        id: "street-address",
        testId: "street-address",
        label: "Street address",
        autocomplete: "street-address",
        placeholder: "120 Research Way",
        labelMode: variant === "no-label" ? "weak" : "label"
      })}
      <div class="field-row">
        ${renderTextField({
          id: "city",
          testId: "city",
          label: "City",
          autocomplete: "address-level2",
          placeholder: "Portland"
        })}
        ${renderTextField({
          id: "postal-code",
          testId: "postal-code",
          label: "Postal code",
          autocomplete: "postal-code",
          placeholder: "97205"
        })}
      </div>
    </fieldset>

    <h2>Payment</h2>
    <fieldset data-test="payment-section">
      <legend>Card details</legend>
      ${renderTextField({
        id: "card-number",
        testId: "card-number",
        label: "Card number",
        autocomplete: "cc-number",
        placeholder: "4242 4242 4242 4242",
        labelMode: variant === "no-label" ? "placeholder-only" : "label"
      })}
      <div class="field-row">
        ${renderTextField({
          id: "expiry",
          testId: "expiry",
          label: "Expiration date",
          autocomplete: "cc-exp",
          placeholder: "12/30"
        })}
        ${renderTextField({
          id: "security-code",
          testId: "security-code",
          label: "Security code",
          autocomplete: "cc-csc",
          placeholder: "123"
        })}
      </div>
    </fieldset>

    ${renderVariantControls(variant)}

    <label class="checkbox-label" for="save-info">
      <input id="save-info" data-test="save-info" name="saveInfo" type="checkbox">
      Save my details for next time
    </label>

    <div class="actions" data-test="checkout-actions">
      <button data-test="place-order" type="submit">Place order</button>
      <button class="secondary" data-test="back-to-cart" type="button">Back to cart</button>
    </div>
  </form>
</main>
</div>`;
}

function renderTextField(options: FieldOptions): string {
  const type = options.type ?? "text";
  const autocomplete = options.autocomplete
    ? ` autocomplete="${escapeHtml(options.autocomplete)}"`
    : "";
  const placeholder = options.placeholder ? ` placeholder="${escapeHtml(options.placeholder)}"` : "";
  const input = `<input id="${escapeHtml(options.id)}" data-test="${escapeHtml(
    options.testId
  )}" name="${escapeHtml(options.id)}" type="${type}"${autocomplete}${placeholder}>`;

  if (options.labelMode === "placeholder-only") {
    return `<div data-test="${escapeHtml(options.testId)}-field">
      ${input}
    </div>`;
  }

  if (options.labelMode === "weak") {
    return `<div data-test="${escapeHtml(options.testId)}-field">
      <span class="weak-label">${escapeHtml(options.label)}</span>
      ${input}
    </div>`;
  }

  return `<label for="${escapeHtml(options.id)}" data-test="${escapeHtml(options.testId)}-field">
      ${escapeHtml(options.label)}
      ${input}
    </label>`;
}

function renderVariantControls(variant: CheckoutVariant): string {
  if (variant === "icon-only-button") {
    return `<section class="inline-controls" aria-labelledby="discount-heading" data-test="discount-section">
      <h2 id="discount-heading">Discount</h2>
      <input id="discount-code" data-test="discount-code" name="discount-code" type="text" aria-label="Discount code" placeholder="CODE">
      <button class="icon-button secondary" data-test="apply-discount" type="button"><span aria-hidden="true">+</span></button>
    </section>`;
  }

  if (variant === "duplicate-names") {
    return `<section class="inline-controls" aria-labelledby="delivery-heading" data-test="delivery-options">
      <h2 id="delivery-heading">Delivery options</h2>
      <button class="secondary" data-test="apply-standard-shipping" type="button">Apply</button>
      <button class="secondary" data-test="apply-express-shipping" type="button">Apply</button>
      <button class="secondary" data-test="apply-gift-wrap" type="button">Apply</button>
    </section>`;
  }

  return `<section class="inline-controls" aria-labelledby="discount-heading" data-test="discount-section">
      <h2 id="discount-heading">Discount</h2>
      <label for="discount-code">Discount code</label>
      <input id="discount-code" data-test="discount-code" name="discount-code" type="text" placeholder="CODE">
      <button class="secondary" data-test="apply-discount" type="button">Apply discount</button>
    </section>`;
}

function renderVariantNoise(variant: CheckoutVariant): string {
  if (variant !== "hidden-noise") {
    return "";
  }

  return `<div class="visually-hidden-noise" data-test="hidden-noise-root" hidden>
  <nav aria-label="Legacy account navigation">
    <a href="/legacy/orders" data-test="hidden-orders-link">Orders</a>
    <a href="/legacy/payment" data-test="hidden-payment-link">Payment</a>
  </nav>
  <form action="/legacy/checkout" method="post" data-test="hidden-checkout-form">
    <label for="legacy-email">Email</label>
    <input id="legacy-email" name="legacy-email" type="email" value="old@example.test">
    <button type="submit">Submit</button>
  </form>
  <div data-test="hidden-copy">
    <p>Legacy checkout copy and inactive promotional controls for DOM serialization experiments.</p>
    <button type="button">Apply</button>
    <button type="button">Apply</button>
  </div>
</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

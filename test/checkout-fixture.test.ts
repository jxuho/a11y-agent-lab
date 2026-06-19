import { describe, expect, it } from "vitest";

import {
  checkoutVariants,
  parseCheckoutVariant,
  renderCheckoutPage
} from "../src/fixtures/checkout.js";

describe("checkout fixture", () => {
  it("renders every variant with the app-ready marker and stable test hooks", () => {
    for (const variant of checkoutVariants) {
      const html = renderCheckoutPage(variant);

      expect(html).toContain('body data-ai-ready="true"');
      expect(html).toContain(`data-variant="${variant}"`);
      expect(html).toContain('data-test="checkout-form"');
      expect(html).toContain('data-test="place-order"');
    }
  });

  it("falls back to the good accessibility variant for unknown query values", () => {
    expect(parseCheckoutVariant(undefined)).toBe("good-a11y");
    expect(parseCheckoutVariant("unknown")).toBe("good-a11y");
    expect(parseCheckoutVariant("hidden-noise")).toBe("hidden-noise");
  });

  it("keeps the good accessibility variant explicitly labelled", () => {
    const html = renderCheckoutPage("good-a11y");

    expect(html).toContain('<label for="email"');
    expect(html).toContain('<label for="street-address"');
    expect(html).toContain('<button data-test="place-order" type="submit">Place order</button>');
  });

  it("renders intentional degraded accessibility variants", () => {
    expect(renderCheckoutPage("no-label")).not.toContain('<label for="email"');
    expect(renderCheckoutPage("icon-only-button")).toContain('data-test="apply-discount"');
    expect(renderCheckoutPage("duplicate-names").match(/>Apply<\/button>/g)).toHaveLength(3);
    expect(renderCheckoutPage("hidden-noise")).toContain('data-test="hidden-noise-root"');
  });
});

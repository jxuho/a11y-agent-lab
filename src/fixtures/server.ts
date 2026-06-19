import { createServer } from "node:http";
import { URL } from "node:url";

import {
  checkoutVariants,
  parseCheckoutVariant,
  renderCheckoutPage
} from "./checkout.js";

const defaultPort = 4310;

export function createFixtureServer() {
  return createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");

    if (requestUrl.pathname === "/checkout") {
      const variant = parseCheckoutVariant(requestUrl.searchParams.get("variant"));
      const html = renderCheckoutPage(variant);

      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      });
      response.end(html);
      return;
    }

    if (requestUrl.pathname === "/" || requestUrl.pathname === "/checkout/") {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      });
      response.end(renderIndexPage());
      return;
    }

    response.writeHead(404, {
      "content-type": "text/plain; charset=utf-8"
    });
    response.end("Not found");
  });
}

export function getFixturePort(value: string | undefined): number {
  if (!value) {
    return defaultPort;
  }

  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid fixture port: ${value}`);
  }

  return port;
}

function renderIndexPage(): string {
  const links = checkoutVariants
    .map(
      (variant) =>
        `<li><a data-test="variant-link-${variant}" href="/checkout?variant=${variant}">${variant}</a></li>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A11y Agent Lab Fixtures</title>
</head>
<body data-ai-ready="true" data-test="fixture-index">
  <main>
    <h1>A11y Agent Lab Fixtures</h1>
    <h2>Checkout</h2>
    <ul>
      ${links}
    </ul>
  </main>
</body>
</html>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = getFixturePort(process.env.FIXTURE_PORT);
  const server = createFixtureServer();

  server.listen(port, () => {
    console.log(`A11y Agent Lab checkout fixture: http://localhost:${port}/checkout?variant=good-a11y`);
  });
}

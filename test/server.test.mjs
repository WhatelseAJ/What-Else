import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../server.mjs";

test("serves the app entry point", async t => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  assert.match(await page.text(), /What Else/);

  for (const asset of ["/style.css", "/script.js"]) {
    const response = await fetch(base + asset);
    assert.equal(response.status, 200, asset);
  }
});

test("rejects unsupported methods", async t => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}`, { method: "POST" });
  assert.equal(response.status, 405);
});

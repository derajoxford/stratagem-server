/**
 * Minimal Deno shim for raw Base44 edge functions.
 * We call the provided handler ONCE with a synthetic Request and
 * capture its Response (or object).
 */
export const Deno = {
  serve(handler: (req: Request) => Response | Promise<Response> | any) {
    // Use Node's global WHATWG Request (available in Node 20+)
    const req = new Request("http://localhost/_shim", { method: "POST" });
    // Fire handler once and store result on global for our adapter to read
    Promise.resolve(handler(req))
      .then((out) => {
        // Store on global for the adapter to read back
        (globalThis as any).__DENO_LAST_RESPONSE__ = out;
      })
      .catch((err) => {
        (globalThis as any).__DENO_LAST_RESPONSE__ = { error: String(err) };
      });
    // Return a no-op server-like object
    return { close() {/* noop */} };
  }
};

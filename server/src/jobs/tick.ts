type Any = any;

function pickTickExport(mod: any) {
  if (!mod) return null;
  const candidates = [mod.gameTick, mod.handler, mod.run, mod.default];
  return candidates.find((f) => typeof f === 'function') || null;
}

export async function runTick() {
  try {
    // Install Deno shim so raw code can call Deno.serve(...)
    const { Deno } = require('../shims/deno');
    (globalThis as Any).Deno = Deno;

    // Load the raw file. It will likely call Deno.serve(handler) immediately.
    const raw = require('../base44/functions/gameTick');

    // If it's an exported function, try calling it too (some files export a function as well).
    const fn = pickTickExport(raw);
    let directCallResult: Any = undefined;
    if (fn) {
      try { directCallResult = await fn(); }
      catch { try { directCallResult = await fn({}); } catch { /* ignore */ } }
    }

    // See what the Deno.serve handler produced
    let out = (globalThis as Any).__DENO_LAST_RESPONSE__;
    // If it's a real Response, try to extract JSON/body
    if (out && typeof out === 'object' && 'json' in out && typeof out.json === 'function') {
      try { out = await (out as Response).json(); } catch { /* not json */ }
    }

    return { ok: true, via: "denoShim", handlerResult: out, directCallResult };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || String(err),
      stack: err?.stack?.split('\n').slice(0, 5)
    };
  }
}

// Minimal stub for Base44 SDK so raw functions don't crash.
// We'll log what the raw code tries to access.

type Any = any;

export function createClientFromRequest(_req: Any) {
  const log = (...args: Any[]) => console.log("[B44 SDK shim]", ...args);

  const fakeEntity = (name: string) => ({
    get: async (id: string) => (log(`${name}.get`, id), { id }),
    filter: async (_q: Any) => (log(`${name}.filter`, _q), []),
    create: async (data: Any) => (log(`${name}.create`, data), { id: "new", ...data }),
    update: async (id: string, data: Any) => (log(`${name}.update`, id, data), { id, ...data }),
    delete: async (id: string) => (log(`${name}.delete`, id), { id })
  });

  const client = {
    auth: {
      me: async () => (log("auth.me"), { id: "fake-user", email: "fake@user" })
    },
    // Guess common entities your code may touch; add more as we see logs:
    entities: {
      Nation: fakeEntity("Nation"),
      War: fakeEntity("War"),
      BattleLog: fakeEntity("BattleLog"),
      ResourceLedger: fakeEntity("ResourceLedger"),
      Faction: fakeEntity("Faction"),
      MarketOrder: fakeEntity("MarketOrder"),
      GameConfig: fakeEntity("GameConfig"),
      Message: fakeEntity("Message"),
    }
  };

  log("createClientFromRequest called; returning stub client");
  return client;
}

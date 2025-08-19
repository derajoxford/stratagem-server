// src/_base44_raw/gameTick.ts
//
// Node + Prisma rewrite of Base44 gameTick.
// - Keeps same flow: lock GameState → batch nations → update treasury → update wars' tactical points → advance turn → unlock.
// - Reads war_settings from GameConfig.config_data_json (same shape your code expects).
// - No Deno or Base44 SDK.

import { prisma } from '../lib/db';

/** -------- helpers -------- */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Generic retry with backoff (useful for transient DB hiccups)
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 250): Promise<T> {
  let err: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      err = e;
      const jitter = Math.random() * 150;
      const wait = baseDelay * Math.pow(2, attempt - 1) + jitter;
      if (attempt === maxRetries) break;
      console.warn(`[retry] ${e?.message || e}; waiting ${wait.toFixed(0)}ms (attempt ${attempt}/${maxRetries})`);
      await delay(wait);
    }
  }
  throw err;
}

const BATCH_SIZE = 10;

/** -------- main entry called by /api/admin/tick -------- */
export async function runGameTick() {
  console.log('[tick] Game tick process started.');

  // 1) Lock GameState (create if missing)
  let gameState = await retryWithBackoff(() =>
    prisma.gameState.findFirst()
  );

  if (gameState?.is_processing) {
    return {
      success: false,
      error: 'Turn is already being processed.',
      status: 409
    };
  }

  if (!gameState) {
    gameState = await retryWithBackoff(() =>
      prisma.gameState.create({
        data: { current_turn_number: 1, is_processing: true }
      })
    );
  } else {
    await retryWithBackoff(() =>
      prisma.gameState.update({
        where: { id: gameState!.id },
        data: { is_processing: true }
      })
    );
  }

  try {
    // 2) Load config & data
    const [configRow, nations, alliances, wars] = await Promise.all([
      retryWithBackoff(() => prisma.gameConfig.findFirst({ orderBy: { createdAt: 'desc' } })),
      retryWithBackoff(() => prisma.nation.findMany({ where: { active: true } })),
      // alliances are optional in this pass; we fetch to mirror original shape
      retryWithBackoff(() => prisma.alliance.findMany({ where: { active: true } }).catch(() => Promise.resolve([]))),
      retryWithBackoff(() => prisma.war.findMany({ where: { status: 'active' } })),
    ]);

    if (!configRow) throw new Error('GameConfig not found.');
    let gameConfig: any;
    try {
      gameConfig = typeof configRow.config_data_json === 'string'
        ? JSON.parse(configRow.config_data_json as any)
        : configRow.config_data_json;
    } catch {
      throw new Error('GameConfig.config_data_json is not valid JSON');
    }
    const warSettings = gameConfig?.war_settings;
    if (!warSettings) throw new Error('GameConfig.war_settings is missing');

    // 3) Batch nations: update treasury, optionally write transactions
    const nationBatches: typeof nations[] = [];
    for (let i = 0; i < nations.length; i += BATCH_SIZE) {
      nationBatches.push(nations.slice(i, i + BATCH_SIZE));
    }

    console.log(`[tick] Processing ${nations.length} nations in ${nationBatches.length} batches.`);
    let nationsProcessed = 0;

    for (let batchIdx = 0; batchIdx < nationBatches.length; batchIdx++) {
      const batch = nationBatches[batchIdx];

      // Build all writes for this batch
      const writes: Promise<any>[] = [];
      for (const n of batch) {
        // In your original code, turnIncome was 0 (placeholder). Keep it for now.
        const turnIncome = 0;

        if (turnIncome > 0) {
          writes.push(
            prisma.financialTransaction.create({
              data: {
                nationId: n.id,
                transaction_type: 'inflow',
                category: 'Taxes',
                sub_category: 'National Income',
                amount: turnIncome,
                new_balance: (n.treasury ?? 0) + turnIncome,
                turn_number: gameState.current_turn_number,
              }
            })
          );
        }

        writes.push(
          prisma.nation.update({
            where: { id: n.id },
            data: { treasury: (n.treasury ?? 0) + turnIncome }
          })
        );

        nationsProcessed++;
      }

      if (writes.length) {
        await retryWithBackoff(() => prisma.$transaction(writes));
      }

      console.log(`[tick] Batch ${batchIdx + 1} complete.`);
      if (batchIdx < nationBatches.length - 1) {
        const betweenBatchDelay = 400 + Math.random() * 350;
        console.log(`[tick] Sleeping ${betweenBatchDelay.toFixed(0)}ms before next batch.`);
        await delay(betweenBatchDelay);
      }
    }

    // 4) Wars: add tactical points per war_settings
    if (wars.length) {
      const updates = wars.map((w) =>
        prisma.war.update({
          where: { id: w.id },
          data: {
            attacker_tactical_points: Math.min(
              warSettings.max_tactical_points,
              (w.attacker_tactical_points ?? 0) + warSettings.tactical_points_per_turn
            ),
            defender_tactical_points: Math.min(
              warSettings.max_tactical_points,
              (w.defender_tactical_points ?? 0) + warSettings.tactical_points_per_turn
            )
          }
        })
      );
      await retryWithBackoff(() => prisma.$transaction(updates));
    }
    console.log(`[tick] Processed ${wars.length} active wars.`);

    // 5) Advance turn & unlock
    const nextTurn = (gameState.current_turn_number ?? 1) + 1;
    await retryWithBackoff(() =>
      prisma.gameState.update({
        where: { id: gameState!.id },
        data: {
          current_turn_number: nextTurn,
          is_processing: false,
          last_turn_processed_at: new Date()
        }
      })
    );

    console.log(`[tick] Game tick complete. New turn is #${nextTurn}.`);

    return {
      success: true,
      message: `Turn ${gameState.current_turn_number} processed. New turn is #${nextTurn}.`,
      nationsProcessed,
      warsProcessed: wars.length
    };
  } catch (error: any) {
    console.error('[tick] Game tick failed:', error);

    // Best-effort unlock
    try {
      const gs = await prisma.gameState.findFirst();
      if (gs?.is_processing) {
        await prisma.gameState.update({ where: { id: gs.id }, data: { is_processing: false } });
        console.log('[tick] Unlocked game state after failure.');
      }
    } catch (unlockErr) {
      console.error('[tick] CRITICAL: Failed to unlock game state after an error.', unlockErr);
    }

    return { success: false, error: error?.message || String(error) };
  }
}

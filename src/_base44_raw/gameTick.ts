
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// Helper function to delay execution with randomization
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function with retry logic and added jitter for rate limiting
const retryWithBackoff = async (fn, maxRetries = 4, baseDelay = 500) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (error.message.includes('rate limit') || error.message.includes('Rate limit') || error.status === 429) {
                if (attempt === maxRetries) {
                    throw new Error(`Rate limit exceeded after ${maxRetries} attempts`);
                }
                const jitter = Math.random() * 500; // Add 0-500ms of random jitter
                const delayTime = baseDelay * Math.pow(2, attempt - 1) + jitter;
                console.log(`Rate limit hit, retrying in ${delayTime.toFixed(0)}ms (attempt ${attempt}/${maxRetries})`);
                await delay(delayTime);
            } else {
                throw error;
            }
        }
    }
};

const BATCH_SIZE = 10; // Process 10 nations at a time

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const serviceClient = base44.asServiceRole;

    try {
        console.log("Game tick process started.");

        // Lock the game state to prevent concurrent processing
        const gameStates = await retryWithBackoff(() => serviceClient.entities.GameState.list());
        let gameState = gameStates[0];

        if (gameState && gameState.is_processing) {
            return new Response(JSON.stringify({ success: false, error: 'Turn is already being processed.' }), { status: 409 });
        }

        if (gameState) {
            await retryWithBackoff(() => serviceClient.entities.GameState.update(gameState.id, { is_processing: true }));
        } else {
            gameState = await retryWithBackoff(() => serviceClient.entities.GameState.create({ current_turn_number: 1, is_processing: true }));
        }

        // Load necessary game data
        const [gameConfigs, allNations, allAlliances, activeWars] = await Promise.all([
            retryWithBackoff(() => serviceClient.entities.GameConfig.list()),
            retryWithBackoff(() => serviceClient.entities.Nation.filter({ active: true })),
            retryWithBackoff(() => serviceClient.entities.Alliance.filter({ active: true })),
            retryWithBackoff(() => serviceClient.entities.War.filter({ status: 'active' }))
        ]);

        if (gameConfigs.length === 0) throw new Error("GameConfig not found.");
        const gameConfig = JSON.parse(gameConfigs[0].config_data_json);
        const warSettings = gameConfig.war_settings; // CRITICAL FIX: Define warSettings

        const nationResources = await retryWithBackoff(() => serviceClient.entities.Resource.list());
        const resourceMap = new Map(nationResources.map(r => [r.nation_id, r]));

        const nationMilitaries = await retryWithBackoff(() => serviceClient.entities.Military.list());
        const militaryMap = new Map(nationMilitaries.map(m => [m.nation_id, m]));

        // Process nations in batches
        const nationBatches = [];
        for (let i = 0; i < allNations.length; i += BATCH_SIZE) {
            nationBatches.push(allNations.slice(i, i + BATCH_SIZE));
        }
        
        console.log(`Processing ${allNations.length} nations in ${nationBatches.length} batches.`);
        let nationsProcessed = 0;

        for (const [batchIndex, nationBatch] of nationBatches.entries()) {
            console.log(`Processing nation batch ${batchIndex + 1}/${nationBatches.length}...`);
            const nationUpdatePromises = [];
            const resourceUpdatePromises = [];
            const transactionPromises = [];

            for (const nation of nationBatch) {
                const resources = resourceMap.get(nation.id);
                if (!resources) continue;

                let turnIncome = 0;
                // Add income logic here in the future if needed

                // Create transaction record
                if (turnIncome > 0) {
                     transactionPromises.push(
                        serviceClient.entities.FinancialTransaction.create({
                            nation_id: nation.id,
                            transaction_type: 'inflow',
                            category: 'Taxes',
                            sub_category: 'National Income',
                            amount: turnIncome,
                            new_balance: (nation.treasury || 0) + turnIncome,
                            turn_number: gameState.current_turn_number,
                        })
                    );
                }

                nationUpdatePromises.push(
                    serviceClient.entities.Nation.update(nation.id, {
                        treasury: (nation.treasury || 0) + turnIncome
                    })
                );
                
                nationsProcessed++;
            }

            // Execute batch updates with randomized delay
            if (nationUpdatePromises.length > 0) {
                await retryWithBackoff(() => Promise.all(nationUpdatePromises));
                await delay(150 + Math.random() * 200); // Jitter: 150-350ms
            }
            if (resourceUpdatePromises.length > 0) {
                await retryWithBackoff(() => Promise.all(resourceUpdatePromises));
                await delay(150 + Math.random() * 200); // Jitter: 150-350ms
            }
            if(transactionPromises.length > 0) {
                await retryWithBackoff(() => Promise.all(transactionPromises));
                await delay(150 + Math.random() * 200); // Jitter: 150-350ms
            }

            console.log(`Batch ${batchIndex + 1} complete.`);
            if (batchIndex < nationBatches.length - 1) {
                const betweenBatchDelay = 400 + Math.random() * 350; // Jitter: 400-750ms delay
                console.log(`Delaying for ${betweenBatchDelay.toFixed(0)}ms before next batch.`);
                await delay(betweenBatchDelay);
            }
        }
        
        // Process wars: add tactical points
        const warUpdatePromises = [];
        for (const war of activeWars) {
            warUpdatePromises.push(
                serviceClient.entities.War.update(war.id, {
                    attacker_tactical_points: Math.min(
                        warSettings.max_tactical_points,
                        (war.attacker_tactical_points || 0) + warSettings.tactical_points_per_turn
                    ),
                    defender_tactical_points: Math.min(
                        warSettings.max_tactical_points,
                        (war.defender_tactical_points || 0) + warSettings.tactical_points_per_turn
                    )
                })
            );
        }
        if (warUpdatePromises.length > 0) {
            await retryWithBackoff(() => Promise.all(warUpdatePromises));
        }
        console.log(`Processed ${activeWars.length} active wars.`);

        // Finalize turn processing
        const nextTurnNumber = gameState.current_turn_number + 1;
        await retryWithBackoff(() => serviceClient.entities.GameState.update(gameState.id, {
            current_turn_number: nextTurnNumber,
            is_processing: false,
            last_turn_processed_at: new Date().toISOString()
        }));

        console.log(`Game tick complete. New turn is #${nextTurnNumber}.`);

        return new Response(JSON.stringify({
            success: true,
            message: `Turn ${gameState.current_turn_number} processed. New turn is #${nextTurnNumber}.`,
            nationsProcessed: nationsProcessed,
            warsProcessed: activeWars.length
        }), { status: 200 });

    } catch (error) {
        console.error("Game tick failed:", error);
        
        // Attempt to unlock the game state on failure
        try {
            const gameStates = await serviceClient.entities.GameState.list();
            if (gameStates.length > 0 && gameStates[0].is_processing) {
                await serviceClient.entities.GameState.update(gameStates[0].id, { is_processing: false });
                console.log("Successfully unlocked game state after failure.");
            }
        } catch (unlockError) {
            console.error("CRITICAL: Failed to unlock game state after an error.", unlockError);
        }

        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
});

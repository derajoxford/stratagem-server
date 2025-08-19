import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// Helper function to delay execution with more generous random jitter
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// More conservative retry logic with longer delays and more jitter
const retryWithBackoff = async (fn, maxRetries = 5, baseDelay = 1500) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (error.message.includes('rate limit') || error.message.includes('Rate limit') || error.status === 429) {
                if (attempt === maxRetries) {
                    throw new Error(`Rate limit exceeded after ${maxRetries} attempts`);
                }
                // Much more aggressive jitter and longer base delays
                const jitter = Math.random() * 1000 + 500; // 500-1500ms jitter
                const delayTime = baseDelay * Math.pow(2, attempt - 1) + jitter;
                console.log(`Rate limit hit, retrying in ${delayTime.toFixed(0)}ms (attempt ${attempt}/${maxRetries})`);
                await delay(delayTime);
            } else {
                throw error;
            }
        }
    }
};

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const serviceClient = base44.asServiceRole;

    try {
        console.log('=== processEnvironmentalTurn starting ===');
        
        // Parse request body to check for target_turn_number
        let targetTurnNumber = null;
        try {
            const requestBody = await req.json();
            targetTurnNumber = requestBody.target_turn_number || null;
            console.log('Target turn number from request:', targetTurnNumber);
        } catch (parseError) {
            console.log('No valid JSON body provided, will auto-determine turn number');
        }

        // Load game state and config with more conservative approach
        console.log('Loading game state and config...');
        await delay(Math.random() * 300 + 100); // Initial jitter
        
        const gameStates = await retryWithBackoff(() => serviceClient.entities.GameState.list());
        await delay(Math.random() * 200 + 100);
        
        const gameConfigs = await retryWithBackoff(() => serviceClient.entities.GameConfig.list());
        await delay(Math.random() * 200 + 100);

        if (gameStates.length === 0) {
            throw new Error('No GameState found');
        }
        if (gameConfigs.length === 0) {
            throw new Error('No GameConfig found');
        }

        const gameState = gameStates[0];
        const gameConfig = JSON.parse(gameConfigs[0].config_data_json);
        const envSettings = gameConfig.environmental_settings || {};
        
        // Determine which turn to process
        let turnToProcess;
        if (targetTurnNumber !== null) {
            turnToProcess = targetTurnNumber;
            console.log(`Processing specific target turn: ${turnToProcess}`);
        } else {
            // Auto-determine next turn to process
            const lastEnvTurn = gameState.last_environmental_turn_number || 0;
            turnToProcess = lastEnvTurn + 1;
            console.log(`Auto-determined turn to process: ${turnToProcess} (last processed: ${lastEnvTurn})`);
        }

        const currentGameTurn = gameState.current_turn_number || 1;
        
        // Validation checks
        if (turnToProcess > currentGameTurn) {
            return new Response(JSON.stringify({
                success: false,
                error: `Cannot process turn ${turnToProcess} - current game turn is only ${currentGameTurn}`,
                current_turn: currentGameTurn,
                last_environmental_turn: gameState.last_environmental_turn_number || 0
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (turnToProcess <= (gameState.last_environmental_turn_number || 0)) {
            return new Response(JSON.stringify({
                success: false,
                error: `Turn ${turnToProcess} has already been processed (last processed: ${gameState.last_environmental_turn_number})`,
                current_turn: currentGameTurn,
                last_environmental_turn: gameState.last_environmental_turn_number || 0
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Processing environmental turn ${turnToProcess}`);

        // Load cities and events with delays
        console.log('Loading cities and environmental events...');
        await delay(Math.random() * 300 + 200);
        
        const allCities = await retryWithBackoff(() => serviceClient.entities.City.list());
        await delay(Math.random() * 400 + 300);
        
        const environmentalEvents = await retryWithBackoff(() => serviceClient.entities.EnvironmentalEvent.filter({ 
            turn_number: turnToProcess, 
            processed: false 
        }));

        console.log(`Found ${allCities.length} cities and ${environmentalEvents.length} unprocessed environmental events for turn ${turnToProcess}`);

        // Process environmental events first with generous delays
        let globalPollutionIncrease = 0;
        let globalRadiationIncrease = 0;

        for (const [eventIndex, event] of environmentalEvents.entries()) {
            console.log(`Processing environmental event ${eventIndex + 1}/${environmentalEvents.length}: ${event.event_type}`);
            
            if (event.global_pollution_contribution) {
                globalPollutionIncrease += event.global_pollution_contribution;
            }
            if (event.global_radiation_contribution) {
                globalRadiationIncrease += event.global_radiation_contribution;
            }

            // Apply local effects to specific cities
            if (event.target_city_id && (event.pollution_increase_local || event.fallout_increase_local)) {
                const targetCity = allCities.find(city => city.id === event.target_city_id);
                if (targetCity) {
                    const updatedPollution = Math.min(100, (targetCity.pollution_level || 0) + (event.pollution_increase_local || 0));
                    const updatedFallout = (targetCity.fallout_level || 0) + (event.fallout_increase_local || 0);
                    
                    await retryWithBackoff(() => serviceClient.entities.City.update(event.target_city_id, {
                        pollution_level: updatedPollution,
                        fallout_level: updatedFallout
                    }));
                    
                    // Delay after city update
                    await delay(Math.random() * 300 + 200);
                }
            }

            // Mark event as processed
            await retryWithBackoff(() => serviceClient.entities.EnvironmentalEvent.update(event.id, { processed: true }));
            
            // Generous delay between events
            await delay(Math.random() * 400 + 300);
        }

        // Process cities with much smaller batches and longer delays
        const CITY_BATCH_SIZE = 5; // Reduced from 15 to 5
        const cityBatches = [];
        for (let i = 0; i < allCities.length; i += CITY_BATCH_SIZE) {
            cityBatches.push(allCities.slice(i, i + CITY_BATCH_SIZE));
        }

        let citiesProcessed = 0;

        for (const [batchIndex, cityBatch] of cityBatches.entries()) {
            console.log(`Processing city batch ${batchIndex + 1}/${cityBatches.length} (${cityBatch.length} cities)`);
            
            // Process cities one by one instead of in parallel to reduce rate limit pressure
            for (const city of cityBatch) {
                try {
                    const updates = await processCityEnvironmental(city, envSettings, gameConfig);
                    if (Object.keys(updates).length > 0) {
                        await retryWithBackoff(() => serviceClient.entities.City.update(city.id, updates));
                        citiesProcessed++;
                    }
                    
                    // Delay between each city update
                    await delay(Math.random() * 250 + 150);
                } catch (error) {
                    console.warn(`Failed to process city ${city.id}:`, error.message);
                    // Continue processing other cities even if one fails
                }
            }
            
            // Much longer delay between batches
            if (batchIndex < cityBatches.length - 1) {
                await delay(Math.random() * 800 + 600); // 600-1400ms delay between batches
            }
        }

        // Apply natural decay to global indices
        const currentGlobalPollution = gameState.global_pollution_index || 0;
        const currentGlobalRadiation = gameState.global_radiation_index || 0;
        
        const pollutionDecay = (envSettings.global_pollution_decay_rate_percent || 0.5) / 100;
        const radiationDecay = (envSettings.global_radiation_decay_rate_percent || 2.0) / 100;
        
        const newGlobalPollution = Math.max(0, 
            currentGlobalPollution + globalPollutionIncrease - (currentGlobalPollution * pollutionDecay)
        );
        const newGlobalRadiation = Math.max(0,
            currentGlobalRadiation + globalRadiationIncrease - (currentGlobalRadiation * radiationDecay)
        );

        // Final delay before updating game state
        await delay(Math.random() * 400 + 300);

        // Update game state
        const gameStateUpdates = {
            last_environmental_turn_number: turnToProcess,
            last_environmental_processed_at: new Date().toISOString(),
            global_pollution_index: newGlobalPollution,
            global_radiation_index: newGlobalRadiation
        };

        await retryWithBackoff(() => serviceClient.entities.GameState.update(gameState.id, gameStateUpdates));

        console.log(`=== Environmental turn ${turnToProcess} completed ===`);
        console.log(`Cities processed: ${citiesProcessed}`);
        console.log(`Events processed: ${environmentalEvents.length}`);
        console.log(`Global pollution: ${currentGlobalPollution.toFixed(1)} → ${newGlobalPollution.toFixed(1)}`);
        console.log(`Global radiation: ${currentGlobalRadiation.toFixed(1)} → ${newGlobalRadiation.toFixed(1)}`);

        return new Response(JSON.stringify({
            success: true,
            message: `Environmental turn ${turnToProcess} processed successfully`,
            turn_processed: turnToProcess,
            cities_processed: citiesProcessed,
            events_processed: environmentalEvents.length,
            global_pollution_change: newGlobalPollution - currentGlobalPollution,
            global_radiation_change: newGlobalRadiation - currentGlobalRadiation,
            new_environmental_turn_number: turnToProcess
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Environmental processing error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

// Helper function to process environmental effects for a single city
async function processCityEnvironmental(city, envSettings, gameConfig) {
    const updates = {};
    
    // Calculate pollution from infrastructure
    const infrastructure = city.infrastructure || {};
    const pollutionFactors = envSettings.infrastructure_pollution_factors || {};
    
    let infrastructurePollution = 0;
    for (const [buildingType, count] of Object.entries(infrastructure)) {
        const pollutionFactor = pollutionFactors[buildingType] || 0;
        infrastructurePollution += (count || 0) * pollutionFactor;
    }
    
    // Apply natural decay to local pollution and fallout
    const currentPollution = city.pollution_level || 0;
    const currentFallout = city.fallout_level || 0;
    
    const pollutionDecayRate = (envSettings.local_pollution_decay_rate_percent || 1.5) / 100;
    const falloutDecayRate = (envSettings.local_fallout_decay_rate_percent || 5.0) / 100;
    
    // Calculate pollution from land (green spaces reduce pollution)
    const landArea = city.land_area || 0;
    const pollutionReductionFromLand = landArea * (envSettings.pollution_reduction_per_acre || 0.005);
    
    // Calculate new pollution level
    const newPollution = Math.max(0, Math.min(100,
        currentPollution + infrastructurePollution - (currentPollution * pollutionDecayRate) - pollutionReductionFromLand
    ));
    
    const newFallout = Math.max(0, currentFallout - (currentFallout * falloutDecayRate));
    
    if (Math.abs(newPollution - currentPollution) > 0.01) {
        updates.pollution_level = Math.round(newPollution * 100) / 100;
    }
    
    if (Math.abs(newFallout - currentFallout) > 0.01) {
        updates.fallout_level = Math.round(newFallout * 100) / 100;
    }
    
    // Calculate health score based on pollution and fallout
    const healthImpact = envSettings.health_score_pollution_impact || {};
    const pollutionHealthImpact = (newPollution || 0) * (healthImpact.local_pollution || -0.5);
    const falloutHealthImpact = (newFallout || 0) * (healthImpact.local_fallout || -2.0);
    
    const baseHealth = 100;
    const newHealthScore = Math.max(0, Math.min(100, 
        baseHealth + pollutionHealthImpact + falloutHealthImpact
    ));
    
    if (Math.abs(newHealthScore - (city.health_score || 100)) > 0.1) {
        updates.health_score = Math.round(newHealthScore * 10) / 10;
    }
    
    return updates;
}

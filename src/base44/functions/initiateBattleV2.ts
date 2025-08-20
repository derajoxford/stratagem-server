
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// Helper function to delay execution for rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function with retry logic for rate limiting
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (error.message.includes('rate limit') || error.message.includes('Rate limit') || error.status === 429) {
                if (attempt === maxRetries) {
                    throw new Error(`Rate limit exceeded after ${maxRetries} attempts`);
                }
                const delayTime = baseDelay * Math.pow(2, attempt - 1);
                console.log(`Rate limit hit, retrying in ${delayTime}ms (attempt ${attempt}/${maxRetries})`);
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
        console.log('=== initiateBattleV2 starting ===');

        // Authentication
        const user = await retryWithBackoff(() => base44.auth.me());
        if (!user) {
            throw new Error('Unauthorized');
        }

        // Parse request data
        const requestData = await req.json();
        const { war_id: warId, attack_type, units_committed: unitsCommitted, selected_target } = requestData;

        console.log('Battle Request:', { warId, attack_type, unitsCommitted, selected_target });

        if (!warId || !attack_type || !unitsCommitted) {
            throw new Error('Missing required fields: war_id, attack_type, and units_committed are required');
        }

        // Load game configuration
        const gameConfigs = await retryWithBackoff(() => serviceClient.entities.GameConfig.list());
        if (gameConfigs.length === 0) {
            throw new Error('Game configuration not found');
        }

        const gameConfig = JSON.parse(gameConfigs[0].config_data_json);
        const warSettings = gameConfig.war_settings;

        console.log('=== GAME CONFIG DEBUG ===');
        console.log('War Settings Keys:', Object.keys(warSettings));
        console.log('Unit Combat Strengths:', warSettings.unit_combat_strengths);
        console.log('Power Ratio Modifiers:', warSettings.power_ratio_modifiers);
        console.log(`${attack_type} Success Levels:`, warSettings[attack_type]?.success_levels);
        console.log('Max Resistance Damage:', warSettings.max_resistance_damage_per_attack);
        console.log('Final Resistance Damage Caps:', warSettings.final_resistance_damage_caps);

        // Load war and validate
        const currentWar = await retryWithBackoff(() => serviceClient.entities.War.get(warId));
        if (!currentWar || currentWar.status !== 'active') {
            throw new Error('War not found or not active');
        }

        // Load nations
        const [attackerNation, defenderNation] = await Promise.all([
            retryWithBackoff(() => serviceClient.entities.Nation.get(currentWar.attacker_nation_id)),
            retryWithBackoff(() => serviceClient.entities.Nation.get(currentWar.defender_nation_id))
        ]);

        // Determine which nation is the attacker in this battle
        const isAttackerInitiating = attackerNation.created_by === user.email;
        const battleAttackerNation = isAttackerInitiating ? attackerNation : defenderNation;
        const battleDefenderNation = isAttackerInitiating ? defenderNation : attackerNation;

        console.log(`Battle: ${battleAttackerNation.name} attacking ${battleDefenderNation.name}`);

        // Load military data
        const [attackerMilitary, defenderMilitary] = await Promise.all([
            retryWithBackoff(() => serviceClient.entities.Military.filter({ nation_id: battleAttackerNation.id })),
            retryWithBackoff(() => serviceClient.entities.Military.filter({ nation_id: battleDefenderNation.id }))
        ]);

        const attackerMil = attackerMilitary[0] || {};
        const defenderMil = defenderMilitary[0] || {};

        console.log('Raw Defender Military Object:', defenderMil);
        console.log('Raw Attacker Military Object:', attackerMil);

        // Validate unit commitment
        for (const [unitType, quantity] of Object.entries(unitsCommitted)) {
            const availableUnits = Number(attackerMil[unitType] || 0);
            if (quantity > availableUnits) {
                throw new Error(`Insufficient ${unitType}: have ${availableUnits}, trying to commit ${quantity}`);
            }
        }

        // Calculate combat power with proper null/undefined handling
        const unitStrengths = warSettings.unit_combat_strengths || {};
        
        let attackerPower = 0;
        console.log('=== ATTACKER POWER CALCULATION (SAFE) ===');
        for (const [unitType, quantity] of Object.entries(unitsCommitted)) {
            const unitStrength = Number(unitStrengths[unitType] || 0);
            const safeQuantity = Number(quantity || 0);
            const contribution = safeQuantity * unitStrength;
            attackerPower += contribution;
            console.log(`- ${safeQuantity} ${unitType} × ${unitStrength} = ${contribution}`);
        }
        console.log('Total Attacker Power (Safe):', attackerPower);

        // CRITICAL FIX: Safe defender power calculation
        let defenderPower = 0;
        console.log('=== DEFENDER POWER CALCULATION (SAFE) ===');
        
        // Define all possible unit types to ensure we check everything
        const allUnitTypes = ['soldiers', 'tanks', 'aircraft', 'warships', 'conventional_bombs', 'nuclear_weapons'];
        
        for (const unitType of allUnitTypes) {
            const rawQuantity = defenderMil[unitType];
            const safeQuantity = Number(rawQuantity) || 0; // Convert to number, default to 0 if NaN/null/undefined
            const unitStrength = Number(unitStrengths[unitType]) || 0;
            const contribution = safeQuantity * unitStrength;
            
            console.log(`- Raw: ${rawQuantity}, Safe: ${safeQuantity} ${unitType} × ${unitStrength} = ${contribution}`);
            
            // Additional safety check before adding to total
            if (isNaN(contribution)) {
                console.log(`WARNING: NaN contribution detected for ${unitType}, skipping`);
                continue;
            }
            
            defenderPower += contribution;
        }
        
        console.log('Total Defender Power (Safe):', defenderPower);
        
        // Final safety check for defenderPower
        if (isNaN(defenderPower)) {
            console.log('ERROR: defenderPower is still NaN after safe calculation, setting to 0');
            defenderPower = 0;
        }

        // Calculate power ratio with safe division
        let powerRatio;
        if (defenderPower === 0) {
            powerRatio = 999; // Overwhelming advantage when defender has no power
            console.log('Defender has zero power - setting power ratio to 999');
        } else {
            powerRatio = attackerPower / defenderPower;
        }
        
        console.log('=== POWER RATIO CALCULATION (SAFE) ===');
        console.log('Attacker Power:', attackerPower);
        console.log('Defender Power:', defenderPower);
        console.log('Power Ratio:', powerRatio);

        // CRITICAL FIX: Apply power ratio modifiers correctly
        const powerRatioModifiers = warSettings.power_ratio_modifiers || {};
        let rollModifier = 0;

        console.log('=== POWER RATIO MODIFIERS DEBUG ===');
        console.log('Available modifiers:', powerRatioModifiers);
        console.log('Current power ratio:', powerRatio);

        if (powerRatio < 0.3) {
            rollModifier = powerRatioModifiers.severely_outgunned || -25;
            console.log('Applied: severely_outgunned modifier:', rollModifier);
        } else if (powerRatio < 0.6) {
            rollModifier = powerRatioModifiers.significantly_outgunned || -15;
            console.log('Applied: significantly_outgunned modifier:', rollModifier);
        } else if (powerRatio < 0.9) {
            rollModifier = powerRatioModifiers.slightly_outgunned || -8;
            console.log('Applied: slightly_outgunned modifier:', rollModifier);
        } else if (powerRatio <= 1.1) {
            rollModifier = powerRatioModifiers.even_match || 0;
            console.log('Applied: even_match modifier:', rollModifier);
        } else if (powerRatio <= 2.0) {
            rollModifier = powerRatioModifiers.slight_advantage || 8;
            console.log('Applied: slight_advantage modifier:', rollModifier);
        } else if (powerRatio <= 4.0) {
            rollModifier = powerRatioModifiers.significant_advantage || 15;
            console.log('Applied: significant_advantage modifier:', rollModifier);
        } else {
            rollModifier = powerRatioModifiers.overwhelming_advantage || 25;
            console.log('Applied: overwhelming_advantage modifier:', rollModifier);
        }

        console.log('Final roll modifier to be applied:', rollModifier);

        // Generate battle roll
        const baseRoll = Math.floor(Math.random() * 100) + 1;
        const finalRoll = Math.max(1, Math.min(200, baseRoll + rollModifier));

        console.log('=== ROLL CALCULATION DEBUG ===');
        console.log('Power Ratio:', powerRatio.toFixed(3));
        console.log('Roll Modifier Applied:', rollModifier);
        console.log('Base Roll (1-100):', baseRoll);
        console.log('Final Roll (clamped 1-200):', finalRoll);

        // Determine outcome based on success levels
        const successLevels = warSettings[attack_type]?.success_levels || [];
        if (successLevels.length === 0) {
            throw new Error(`No success levels configured for attack type: ${attack_type}`);
        }

        console.log('=== OUTCOME DETERMINATION DEBUG ===');
        console.log(`Available success levels for ${attack_type}:`, successLevels);

        let selectedOutcome = null;
        for (const level of successLevels) {
            console.log(`Checking level "${level.name}": roll ${finalRoll} in range ${level.min_roll}-${level.max_roll}?`);
            if (finalRoll >= level.min_roll && finalRoll <= level.max_roll) {
                selectedOutcome = level;
                console.log(`✓ Selected outcome: ${level.name} (multiplier: ${level.multiplier})`);
                break;
            }
        }

        if (!selectedOutcome) {
            console.log('⚠️  No matching outcome found, using first level as fallback');
            selectedOutcome = successLevels[0];
        }

        const outcomeMultiplier = selectedOutcome.multiplier || 1;

        // Calculate resistance damage using configured values
        const baseDamage = warSettings.max_resistance_damage_per_attack?.[attack_type] || 1;
        const effectiveDamage = baseDamage * outcomeMultiplier;
        const hardCap = warSettings.final_resistance_damage_caps?.[attack_type] || baseDamage;
        const finalResistanceDamage = Math.min(effectiveDamage, hardCap);

        console.log('=== RESISTANCE DAMAGE DEBUG ===');
        console.log(`Base Damage (${attack_type}):`, baseDamage);
        console.log('Outcome Multiplier:', outcomeMultiplier);
        console.log('Effective Damage:', effectiveDamage);
        console.log(`Hard Cap (${attack_type}):`, hardCap);
        console.log('Final Resistance Damage:', finalResistanceDamage);

        // Calculate attacker losses
        const lossConfig = warSettings.attacker_loss_config?.[attack_type] || {};
        const attackerLosses = {};
        let totalAttackerLosses = 0;

        for (const [unitType, quantity] of Object.entries(unitsCommitted)) {
            const unitLossConfig = lossConfig[unitType] || { base_rate: 0.1, max_rate: 0.5 };
            const lossMultiplier = Math.max(0, 2 - outcomeMultiplier);
            const effectiveLossRate = Math.min(unitLossConfig.base_rate * lossMultiplier, unitLossConfig.max_rate);
            const losses = Math.floor(quantity * effectiveLossRate);
            
            if (losses > 0) {
                attackerLosses[unitType] = losses;
                totalAttackerLosses += losses;
            }
        }

        console.log('=== ATTACKER LOSSES DEBUG ===');
        console.log('Loss Multiplier (2 - outcome_multiplier):', 2 - outcomeMultiplier);
        console.log('Attacker Losses:', attackerLosses);
        console.log('Total Attacker Losses:', totalAttackerLosses);

        // Calculate defender losses (simplified for now)
        const defenderLosses = {};
        let totalDefenderLosses = 0;

        // Basic defender loss calculation - can be enhanced later
        for (const [unitType, quantity] of Object.entries(defenderMil)) {
            if (quantity > 0) {
                const baseLossRate = 0.05 * outcomeMultiplier; // Defenders lose more when attacker does better
                const losses = Math.floor(quantity * baseLossRate);
                if (losses > 0) {
                    defenderLosses[unitType] = losses;
                    totalDefenderLosses += losses;
                }
            }
        }

        console.log('=== DEFENDER LOSSES DEBUG ===');
        console.log('Defender Losses:', defenderLosses);
        console.log('Total Defender Losses:', totalDefenderLosses);

        // Calculate loot based on outcome and defender's treasury
        const defenderTreasury = battleDefenderNation.treasury || 0;
        const baseLootPercent = warSettings.loot_settings?.base_loot_pool_percent_of_defender_treasury || 1;
        const maxLootPool = defenderTreasury * (baseLootPercent / 100);
        
        const outcomeLootConfig = warSettings.loot_settings?.per_outcome_loot_percent?.[selectedOutcome.name] || { min_percent: 1, max_percent: 5 };
        const lootPercent = Math.random() * (outcomeLootConfig.max_percent - outcomeLootConfig.min_percent) + outcomeLootConfig.min_percent;
        const lootAmount = Math.floor(maxLootPool * (lootPercent / 100));

        console.log('=== LOOT CALCULATION DEBUG ===');
        console.log('Defender Treasury:', defenderTreasury);
        console.log('Base Loot Pool %:', baseLootPercent);
        console.log('Max Loot Pool:', maxLootPool);
        console.log(`Loot Config for "${selectedOutcome.name}":`, outcomeLootConfig);
        console.log('Loot Percent Roll:', lootPercent);
        console.log('Final Loot Amount:', lootAmount);

        // Update military units (subtract losses)
        if (Object.keys(attackerLosses).length > 0) {
            const updatedAttackerMilitary = { ...attackerMil };
            for (const [unitType, losses] of Object.entries(attackerLosses)) {
                updatedAttackerMilitary[unitType] = Math.max(0, (updatedAttackerMilitary[unitType] || 0) - losses);
            }
            await retryWithBackoff(() => serviceClient.entities.Military.update(attackerMil.id, updatedAttackerMilitary));
        }

        if (Object.keys(defenderLosses).length > 0) {
            const updatedDefenderMilitary = { ...defenderMil };
            for (const [unitType, losses] of Object.entries(defenderLosses)) {
                updatedDefenderMilitary[unitType] = Math.max(0, (updatedDefenderMilitary[unitType] || 0) - losses);
            }
            await retryWithBackoff(() => serviceClient.entities.Military.update(defenderMil.id, updatedDefenderMilitary));
        }

        // Update treasuries (loot transfer)
        if (lootAmount > 0) {
            await Promise.all([
                retryWithBackoff(() => serviceClient.entities.Nation.update(battleAttackerNation.id, { 
                    treasury: (battleAttackerNation.treasury || 0) + lootAmount 
                })),
                retryWithBackoff(() => serviceClient.entities.Nation.update(battleDefenderNation.id, { 
                    treasury: Math.max(0, (battleDefenderNation.treasury || 0) - lootAmount) 
                }))
            ]);
        }

        // Determine which side's resistance to reduce
        const attackerSide = isAttackerInitiating ? 'attacker' : 'defender';
        const defenderSide = isAttackerInitiating ? 'defender' : 'attacker';
        
        // Update war resistance and tactical points
        const actionPointCosts = warSettings.action_point_costs || {};
        const actionPointCost = actionPointCosts[attack_type] || 1;
        
        const updatedWar = await retryWithBackoff(() => serviceClient.entities.War.update(warId, {
            [`${defenderSide}_resistance_points`]: Math.max(0, currentWar[`${defenderSide}_resistance_points`] - finalResistanceDamage),
            [`${attackerSide}_tactical_points`]: Math.max(0, currentWar[`${attackerSide}_tactical_points`] - actionPointCost),
            total_battles: currentWar.total_battles + 1,
            [`total_casualties_${attackerSide}`]: currentWar[`total_casualties_${attackerSide}`] + totalAttackerLosses,
            [`total_casualties_${defenderSide}`]: currentWar[`total_casualties_${defenderSide}`] + totalDefenderLosses
        }));

        console.log('=== WAR UPDATE DEBUG ===');
        console.log(`Updated ${defenderSide} resistance:`, Math.max(0, currentWar[`${defenderSide}_resistance_points`] - finalResistanceDamage));
        console.log(`Updated ${attackerSide} tactical points:`, Math.max(0, currentWar[`${attackerSide}_tactical_points`] - actionPointCost));

        // Create battle log
        const battleLog = await retryWithBackoff(() => serviceClient.entities.BattleLog.create({
            war_id: warId,
            battle_number: currentWar.total_battles + 1,
            timestamp: new Date().toISOString(),
            attack_type,
            attacker_nation_id: battleAttackerNation.id,
            attacker_name: battleAttackerNation.name,
            defender_nation_id: battleDefenderNation.id,
            defender_name: battleDefenderNation.name,
            attacker_power: attackerPower,
            defender_power: defenderPower,
            power_ratio: powerRatio,
            base_roll: baseRoll,
            final_roll: finalRoll,
            outcome: selectedOutcome.name,
            outcome_multiplier: outcomeMultiplier,
            resistance_damage: finalResistanceDamage,
            attacker_losses: attackerLosses,
            defender_losses: defenderLosses,
            loot_gained: lootAmount,
            infrastructure_value_destroyed: 0,
            civilian_casualties: 0,
            ammo_consumed: 0, // TODO: Implement resource consumption
            gasoline_consumed: 0,
            defender_ammo_consumed: 0,
            defender_gasoline_consumed: 0,
            units_committed: unitsCommitted,
            selected_target: selected_target || ""
        }));

        console.log('=== BATTLE COMPLETE ===');
        console.log('Battle Log ID:', battleLog.id);

        return new Response(JSON.stringify({
            success: true,
            battleLog: battleLog,
            warUpdate: {
                resistance_damage: finalResistanceDamage,
                new_resistance: Math.max(0, currentWar[`${defenderSide}_resistance_points`] - finalResistanceDamage),
                tactical_points_remaining: Math.max(0, currentWar[`${attackerSide}_tactical_points`] - actionPointCost)
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('initiateBattleV2 error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// Helper function to delay execution
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
                const delayTime = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.log(`Rate limit hit, retrying in ${delayTime}ms (attempt ${attempt}/${maxRetries})`);
                await delay(delayTime);
            } else {
                throw error; // Re-throw non-rate-limit errors immediately
            }
        }
    }
};

Deno.serve(async (req) => {
    try {
        console.log('=== declareWar starting ===');
        const base44 = createClientFromRequest(req);
        const serviceClient = base44.asServiceRole;

        // Authentication
        const user = await retryWithBackoff(() => base44.auth.me());
        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse request data
        const requestData = await req.json();
        const defender_nation_id = requestData.defender_nation_id || requestData.targetNationId;
        const reason = requestData.reason || requestData.warReason;
        const war_name = requestData.war_name || requestData.warName;

        console.log('declareWar: Request data received:', requestData);
        console.log('declareWar: Extracted parameters:', { defender_nation_id, reason, war_name });

        if (!defender_nation_id || !reason) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Missing required fields: targetNationId/defender_nation_id and warReason/reason are required' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('declareWar: Starting war declaration process');
        console.log(`declareWar: Defender Nation ID: ${defender_nation_id}`);
        console.log(`declareWar: War Reason: ${reason}`);
        console.log(`declareWar: War Name: ${war_name || 'Not provided'}`);

        // Load game configuration with retry logic
        console.log('declareWar: Loading game configuration...');
        const gameConfigs = await retryWithBackoff(() => serviceClient.entities.GameConfig.list());
        if (gameConfigs.length === 0) {
            console.error('declareWar: No game configuration found');
            return new Response(JSON.stringify({ success: false, error: 'Game configuration not found' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let gameConfig;
        try {
            gameConfig = JSON.parse(gameConfigs[0].config_data_json);
            console.log('declareWar: Successfully parsed game configuration');
        } catch (parseError) {
            console.error('declareWar: Failed to parse game configuration:', parseError);
            return new Response(JSON.stringify({ success: false, error: 'Invalid game configuration format' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Read tactical points configuration correctly from the nested structure
        const warSettings = gameConfig?.war_settings;
        const startingTacticalPoints = warSettings?.tactical_points_on_war_start || 3;
        const maxTacticalPoints = warSettings?.max_tactical_points || 10;

        console.log('declareWar: Tactical Points Configuration:');
        console.log(`- Starting Tactical Points: ${startingTacticalPoints}`);
        console.log(`- Max Tactical Points: ${maxTacticalPoints}`);

        // Get attacker nation (current user's nation) with retry logic
        const attackerNations = await retryWithBackoff(() => base44.entities.Nation.filter({ created_by: user.email }));
        if (attackerNations.length === 0) {
            return new Response(JSON.stringify({ success: false, error: 'Attacker nation not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const attackerNation = attackerNations[0];
        console.log(`declareWar: Attacker Nation: ${attackerNation.name} (ID: ${attackerNation.id})`);

        // Get defender nation with retry logic
        const defenderNation = await retryWithBackoff(() => serviceClient.entities.Nation.get(defender_nation_id));
        if (!defenderNation) {
            return new Response(JSON.stringify({ success: false, error: 'Defender nation not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        console.log(`declareWar: Defender Nation: ${defenderNation.name} (ID: ${defenderNation.id})`);

        // Check if nations are already at war with retry logic
        const existingWars = await retryWithBackoff(() => serviceClient.entities.War.filter({
            status: 'active',
            $or: [
                { 
                    attacker_nation_id: attackerNation.id, 
                    defender_nation_id: defenderNation.id 
                },
                { 
                    attacker_nation_id: defenderNation.id, 
                    defender_nation_id: attackerNation.id 
                }
            ]
        }));

        if (existingWars.length > 0) {
            console.log('declareWar: Nations are already at war');
            return new Response(JSON.stringify({ success: false, error: 'Nations are already at war' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check alliance memberships to prevent friendly fire
        const alliances = await retryWithBackoff(() => serviceClient.entities.Alliance.list());
        const attackerAlliance = alliances.find(a => 
            a.founder_nation_id === attackerNation.id || 
            (a.member_nations && a.member_nations.includes(attackerNation.id))
        );
        const defenderAlliance = alliances.find(a => 
            a.founder_nation_id === defenderNation.id || 
            (a.member_nations && a.member_nations.includes(defenderNation.id))
        );

        // Prevent alliance members from attacking each other
        if (attackerAlliance && defenderAlliance && attackerAlliance.id === defenderAlliance.id) {
            console.log('declareWar: Cannot attack alliance member');
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Cannot declare war on an alliance member! Alliance members are bound by mutual defense agreements.' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get resistance settings
        const startingResistance = warSettings?.initial_resistance || 100;
        console.log(`declareWar: Starting Resistance: ${startingResistance}`);

        // Create the war with retry logic
        console.log('declareWar: Creating war entity...');
        const newWar = await retryWithBackoff(() => serviceClient.entities.War.create({
            attacker_nation_id: attackerNation.id,
            defender_nation_id: defenderNation.id,
            attacker_alliance_id: attackerAlliance?.id || null,
            defender_alliance_id: defenderAlliance?.id || null,
            start_date: new Date().toISOString(),
            status: 'active',
            war_reason: reason,
            war_name: war_name || `${attackerNation.name} vs ${defenderNation.name}`,
            starting_resistance: startingResistance,
            attacker_resistance_points: startingResistance,
            defender_resistance_points: startingResistance,
            attacker_tactical_points: startingTacticalPoints,
            defender_tactical_points: startingTacticalPoints,
            total_battles: 0,
            total_casualties_attacker: 0,
            total_casualties_defender: 0
        }));

        console.log(`declareWar: War created successfully with ID: ${newWar.id}`);
        console.log(`declareWar: Both sides start with ${startingTacticalPoints} tactical points`);

        // Send notifications to both nations with retry logic and delays
        console.log('declareWar: Sending notifications...');
        try {
            // Notification to attacker
            await retryWithBackoff(() => serviceClient.entities.Message.create({
                recipient_nation_id: attackerNation.id,
                subject: `War Declared: ${newWar.war_name}`,
                body: `You have declared war on ${defenderNation.name}. Reason: "${reason}". The conflict has begun!`,
                message_type: 'war_declaration',
                related_entity_id: newWar.id,
                related_page: 'WarRoom'
            }));

            // Small delay between notifications to prevent rate limiting
            await delay(100);

            // Notification to defender
            await retryWithBackoff(() => serviceClient.entities.Message.create({
                recipient_nation_id: defenderNation.id,
                subject: `War Declared Against You: ${newWar.war_name}`,
                body: `${attackerNation.name} has declared war on your nation. Reason: "${reason}". Prepare your defenses!`,
                message_type: 'war_declaration',
                related_entity_id: newWar.id,
                related_page: 'WarRoom'
            }));

            console.log('declareWar: Notifications sent successfully');
        } catch (notificationError) {
            console.error('declareWar: Failed to send notifications:', notificationError);
            // Don't fail the entire operation for notification errors
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'War declared successfully',
            war: newWar,
            war_id: newWar.id,
            starting_tactical_points: startingTacticalPoints
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('declareWar: Error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message || 'An unexpected error occurred' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

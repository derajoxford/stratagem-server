
import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        base44.auth.setToken(authHeader.split(' ')[1]);

        const { attackerNationId, defenderNationId, warName, reason: warReason } = await req.json();

        if (!attackerNationId || !defenderNationId) { // warName is now optional for default generation
            throw new Error('Missing required fields: attackerNationId, defenderNationId');
        }

        const [attackerNation, defenderNation, configData] = await Promise.all([
            base44.entities.Nation.get(attackerNationId),
            base44.entities.Nation.get(defenderNationId),
            base44.entities.GameConfig.list()
        ]);

        if (!attackerNation) {
            throw new Error(`Attacker nation with ID ${attackerNationId} not found.`);
        }
        if (!defenderNation) {
            throw new Error(`Defender nation with ID ${defenderNationId} not found.`);
        }

        const gameConfig = configData[0];
        if (!gameConfig) throw new Error('Game configuration not found');

        const warCost = gameConfig.war_settings?.war_declaration_cost || 1000000;
        if (attackerNation.treasury < warCost) {
            throw new Error(`Insufficient funds. Need $${warCost.toLocaleString()}.`);
        }

        // Create the war record with uppercase 'Active' status and new fields
        const warData = {
            attacker_nation_id: attackerNation.id,
            defender_nation_id: defenderNation.id,
            attacker_alliance_id: attackerNation.alliance_id || null,
            defender_alliance_id: defenderNation.alliance_id || null,
            start_date: new Date().toISOString(),
            status: 'Active', // Changed to uppercase 'Active' for consistency
            war_reason: warReason || 'No reason specified',
            war_name: warName || `${attackerNation.name} vs ${defenderNation.name}`,
            starting_resistance: gameConfig.war_settings?.initial_resistance || 100,
            attacker_resistance_points: gameConfig.war_settings?.initial_resistance || 100,
            defender_resistance_points: gameConfig.war_settings?.initial_resistance || 100,
            attacker_tactical_points: gameConfig.war_settings?.tactical_points_on_war_start || 3,
            defender_tactical_points: gameConfig.war_settings?.tactical_points_on_war_start || 3,
            total_battles: 0,
            total_casualties_attacker: 0,
            total_casualties_defender: 0,
            blockade_details: { is_active: false, blockading_nation_id: null }
        };

        const war = await base44.entities.War.create(warData);

        await Promise.all([
            base44.entities.Nation.update(attackerNationId, { 
                treasury: attackerNation.treasury - warCost 
            }),
            base44.entities.Message.create({
                recipient_nation_id: attackerNationId,
                subject: `War Initiated: ${war.war_name}`,
                body: `You declared war on ${defenderNation.name}.`,
                message_type: 'war_declaration',
                related_entity_id: war.id,
                related_page: 'WarRoom'
            }),
            base44.entities.Message.create({
                recipient_nation_id: defenderNationId,
                subject: `War Declared Against You!`,
                body: `${attackerNation.name} has declared war on you.`,
                message_type: 'war_declaration',
                related_entity_id: war.id,
                related_page: 'WarRoom'
            })
        ]);

        return new Response(JSON.stringify({ 
            success: true, 
            war,
            message: `War "${war.war_name}" declared against ${defenderNation.name}!` 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in initiateWar:', error);
        return new Response(JSON.stringify({ 
            success: false,
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});

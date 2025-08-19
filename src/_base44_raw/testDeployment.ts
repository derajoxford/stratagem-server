import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
        base44.auth.setToken(authHeader.split(' ')[1]);

        const { warId, attackerNationId, attackType, committedUnits } = await req.json();

        const war = await base44.entities.War.get(warId);
        if (!war || war.status !== 'Active') {
            return new Response(JSON.stringify({ success: false, error: 'War not found or inactive' }), { status: 404 });
        }

        const attackCost = 2; 
        const resistanceDamage = parseFloat((Math.random() * 5 + 2).toFixed(2));
        const outcome = "Tactical Strike Complete";
        
        const isAttackerInWar = war.attacker_nation_id === attackerNationId;
        const currentTacticalPoints = isAttackerInWar ? war.attacker_tactical_points : war.defender_tactical_points;

        if (currentTacticalPoints < attackCost) {
            return new Response(JSON.stringify({ success: false, error: `Insufficient tactical points.` }), { status: 400 });
        }

        const warUpdate = {};
        if (isAttackerInWar) {
            warUpdate.defender_resistance_points = Math.max(0, (war.defender_resistance_points || 0) - resistanceDamage);
            warUpdate.attacker_tactical_points = Math.max(0, currentTacticalPoints - attackCost);
        } else {
            warUpdate.attacker_resistance_points = Math.max(0, (war.attacker_resistance_points || 0) - resistanceDamage);
            warUpdate.defender_tactical_points = Math.max(0, currentTacticalPoints - attackCost);
        }
        await base44.entities.War.update(warId, warUpdate);
        
        const battleNumber = Math.floor(Date.now() / 1000);

        const battleDetails = {
            outcome,
            resistance_damage: resistanceDamage,
            attacker_losses: {},
            defender_losses: {},
        };

        await base44.entities.BattleLog.create({
            war_id: warId,
            battle_number: battleNumber,
            timestamp: new Date().toISOString(),
            attack_type: attackType,
            attacker_nation_id: attackerNationId,
            outcome: outcome,
            resistance_damage: resistanceDamage,
            units_committed: committedUnits,
            notes: "Battle Function via testDeployment"
        });

        return new Response(JSON.stringify({
            success: true,
            message: `${outcome}! Resistance damage dealt: ${resistanceDamage}.`,
            battleDetails: battleDetails
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: `Battle resolution failed: ${error.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' }});
    }
});

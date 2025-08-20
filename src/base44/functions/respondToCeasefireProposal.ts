import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { proposalId, response } = await req.json();

        if (!proposalId || !response) {
            return new Response(JSON.stringify({ success: false, error: 'Missing proposal ID or response.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Processing ceasefire response: ${response} for proposal ${proposalId}`);

        const proposal = await base44.entities.CeasefireProposal.get(proposalId);
        if (!proposal) {
            return new Response(JSON.stringify({ success: false, error: 'Ceasefire proposal not found.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (proposal.status !== 'pending') {
            return new Response(JSON.stringify({ success: false, error: 'This proposal has already been responded to.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const respondingNations = await base44.entities.Nation.filter({ created_by: user.email, active: true });
        if (!respondingNations || respondingNations.length === 0) {
            return new Response(JSON.stringify({ success: false, error: 'You do not have an active nation.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const respondingNation = respondingNations[0];

        if (proposal.recipient_nation_id !== respondingNation.id) {
            return new Response(JSON.stringify({ success: false, error: 'You are not authorized to respond to this proposal.' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const war = await base44.entities.War.get(proposal.war_id);
        if (!war) {
            return new Response(JSON.stringify({ success: false, error: 'Associated war not found.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (war.status !== 'Active') {
            return new Response(JSON.stringify({ success: false, error: 'War is no longer active.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await base44.entities.CeasefireProposal.update(proposalId, {
            status: response,
            responded_at: new Date().toISOString()
        });

        if (response === 'accepted') {
            console.log(`Ceasefire accepted for war ${war.id}, ending war`);
            
            await base44.entities.War.update(war.id, {
                status: 'ceasefire',
                end_date: new Date().toISOString()
            });

            const attackerNation = await base44.entities.Nation.get(war.attacker_nation_id);
            const defenderNation = await base44.entities.Nation.get(war.defender_nation_id);

            if (attackerNation?.is_blockaded && war.blockade_details?.blockading_nation_id === defenderNation?.id) {
                await base44.entities.Nation.update(attackerNation.id, {
                    is_blockaded: false,
                    blockading_nation_id: null
                });
            }
            if (defenderNation?.is_blockaded && war.blockade_details?.blockading_nation_id === attackerNation?.id) {
                await base44.entities.Nation.update(defenderNation.id, {
                    is_blockaded: false,
                    blockading_nation_id: null
                });
            }

            const messageContent = `Ceasefire accepted! The war "${war.war_name}" has ended peacefully.`;
            
            await base44.entities.Message.create({
                sender_nation_id: respondingNation.id,
                recipient_nation_id: proposal.proposer_nation_id,
                subject: `Ceasefire Accepted: ${war.war_name}`,
                body: messageContent,
                message_type: 'alliance_event'
            });

            return new Response(JSON.stringify({ 
                success: true, 
                message: 'Ceasefire accepted. War has ended peacefully.' 
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            console.log(`Ceasefire rejected for war ${war.id}`);
            
            const messageContent = `Ceasefire proposal rejected. The war "${war.war_name}" continues.`;
            
            await base44.entities.Message.create({
                sender_nation_id: respondingNation.id,
                recipient_nation_id: proposal.proposer_nation_id,
                subject: `Ceasefire Rejected: ${war.war_name}`,
                body: messageContent,
                message_type: 'alliance_event'
            });

            return new Response(JSON.stringify({ 
                success: true, 
                message: 'Ceasefire proposal rejected.' 
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Error in respondToCeasefireProposal function:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: `Failed to respond to ceasefire proposal: ${error.message}` 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

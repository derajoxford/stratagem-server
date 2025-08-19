
import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
    try {
        console.log('=== PROPOSE CEASEFIRE FUNCTION STARTING ===');
        
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            console.log('No authorization header');
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { 
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);

        const user = await base44.auth.me();
        if (!user) {
            console.log('User authentication failed');
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { 
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`User authenticated: ${user.email}`);

        const payload = await req.json();
        console.log('Request payload:', payload);
        
        const { warId, message } = payload;

        // Validate war exists and is active
        console.log(`Fetching war: ${warId}`);
        const war = await base44.entities.War.get(warId);
        if (!war || war.status !== 'Active') {
            console.log(`War validation failed - found: ${war ? 'yes' : 'no'}, status: ${war?.status}`);
            return new Response(JSON.stringify({ 
                success: false, 
                error: "War not found or not active" 
            }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`War found: ${war.war_name || 'Unnamed'} (Status: ${war.status})`);

        // Get proposer's nation
        console.log(`Getting nations for user: ${user.email}`);
        const nations = await base44.entities.Nation.filter({ created_by: user.email, active: true });
        const proposerNation = nations.length > 0 ? nations[0] : null;
        
        if (!proposerNation) {
            console.log('No active nation found for user');
            return new Response(JSON.stringify({ 
                success: false, 
                error: "No active nation found" 
            }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`Proposer nation: ${proposerNation.name} (ID: ${proposerNation.id})`);

        // Verify proposer is part of this war
        if (proposerNation.id !== war.attacker_nation_id && proposerNation.id !== war.defender_nation_id) {
            console.log(`Nation not part of war - attacker: ${war.attacker_nation_id}, defender: ${war.defender_nation_id}, proposer: ${proposerNation.id}`);
            return new Response(JSON.stringify({ 
                success: false, 
                error: "You are not part of this war" 
            }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Determine recipient nation
        const recipientNationId = proposerNation.id === war.attacker_nation_id ? 
            war.defender_nation_id : war.attacker_nation_id;

        console.log(`Recipient nation ID: ${recipientNationId}`);


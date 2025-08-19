import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
    try {
        const { proposalId, decision, message } = await req.json();

        // Authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { "Content-Type": "application/json" } 
            });
        }
        
        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // Get user's nation
        const nations = await base44.entities.Nation.filter({ created_by: user.email });
        if (nations.length === 0) {
            return new Response(JSON.stringify({ error: 'User has no nation.' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json" } 
            });
        }
        const nation = nations[0];

        // Get the proposal
        const proposal = await base44.entities.MergeProposal.get(proposalId);
        if (!proposal) {
            return new Response(JSON.stringify({ error: 'Proposal not found.' }), { 
                status: 404, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        if (proposal.status !== 'pending') {
            return new Response(JSON.stringify({ error: 'Proposal has already been responded to.' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // Get user's alliance (should be the receiving alliance)
        let receivingAlliance = null;
        if (nation.alliance_id) {
            receivingAlliance = await base44.entities.Alliance.get(nation.alliance_id);
        }

        if (!receivingAlliance || receivingAlliance.id !== proposal.receiving_alliance_id) {
            return new Response(JSON.stringify({ error: 'You are not authorized to respond to this proposal.' }), { 
                status: 403, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // Check permissions
        const isFounder = receivingAlliance.founder_nation_id === nation.id;
   

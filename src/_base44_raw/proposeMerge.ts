import { createClient } from 'npm:@base44/sdk@0.1.0';
import { addDays } from 'npm:date-fns@3.6.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
    try {
        const { targetAllianceId, message } = await req.json();

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

        // Find user's alliance using direct filter (most efficient approach)
        const alliances = await base44.entities.Alliance.filter({ 
            founder_nation_id: nation.id, 
            active: true 
        });
        
        let proposingAlliance = alliances[0];
        
        // If not founder, check if they're a member
        if (!proposingAlliance) {
            const memberAlliances = await base44.entities.Alliance.filter({ 
                member_nations: nation.id, 
                active: true 
            });
            proposingAlliance = memberAlliances[0];
        }

        if (!proposingAlliance) {
            return new Response(JSON.stringify({ error: 'Your nation is not in an active alliance.' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // Check permissions
        const isFounder = proposingAlliance.founder_nation_id === nation.id;
        const userRoleKey = proposingAlliance.member_roles?.[nation.id] || 'member';
        const userPermissions = proposingAlliance.custom_roles?.[userRoleKey]?.permissions || {};

        if (!isFounder && !userPermissions.disband_alliance) {
                return new Response(JSON.stringify({ error: 'You do not have permission to propose a merge.' }), { 
                 status: 403, 
                 headers: { "Content-Type": "application/json" } 
             });
        }

        // Validate target alliance
        if (!targetAllianceId) {
            return new Response(JSON.stringify({ error: 'Target alliance ID is required.' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        if (proposingAlliance.id === targetAllianceId) {
            return new Response(JSON.stringify({ error: 'Cannot propose a merge with your own alliance.' }), { 
                status: 400, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        const targetAlliance = await base44.entities.Alliance.get(targetAllianceId);
        if (!targetAlliance || !targetAlliance.active) {
            return new Response(JSON.stringify({ error: 'Target alliance not found or is not active.' }), { 
                status: 404, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // Check for existing proposals
        const existingProposals = await base44.entities.MergeProposal.filter({
            proposing_alliance_id: proposingAlliance.id,
            receiving_alliance_id: targetAllianceId,
            status: 'pending'
        });

        if (existingProposals.length > 0) {
            return new Response(JSON.stringify({ error: 'A pending merge proposal already exists between these alliances.' }), { 
                status: 409, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // Create proposal
        const proposalData = {
            proposing_alliance_id: proposingAlliance.id,
            receiving_alliance_id: targetAllianceId,
            surviving_alliance_id: proposingAlliance.id,
            merging_alliance_id: targetAllianceId,
            status: 'pending',
            proposed_by_nation_id: nation.id,
            message: message || 'A proposal for alliance merger.',
            expires_at: addDays(new Date(), 7).toISOString(),
        };

        const newProposal = await base44.entities.MergeProposal.create(proposalData);

        return new Response(JSON.stringify({ success: true, proposal: newProposal }), { 
            status: 201, 
            headers: { "Content-Type": "application/json" } 
        });

    } catch (error) {
        console.error("Error in proposeMerge function:", error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
        });
    }
});

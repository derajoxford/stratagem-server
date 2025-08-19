import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // 1. Authenticate the user
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized: No user session found.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Get and validate the payload from the request
        const { allianceId, description } = await req.json();
        if (!allianceId || description === undefined) {
            return new Response(JSON.stringify({ error: 'Missing allianceId or description in request body.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. Perform Permission Checks
        // Get the user's active nation
        const nations = await base44.entities.Nation.filter({ created_by: user.email, active: true });
        if (nations.length === 0) {
            return new Response(JSON.stringify({ error: 'Forbidden: User does not have an active nation.' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const nation = nations[0];

        // Fetch the alliance to be updated
        const alliance = await base44.entities.Alliance.get(allianceId);
        if (!alliance) {
             return new Response(JSON.stringify({ error: 'Alliance not found.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Verify the user's nation is actually a member of this alliance
        if (nation.alliance_id !== alliance.id) {
             return new Response(JSON.stringify({ error: 'Forbidden: Your nation is not a member of this alliance.' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Determine the user's role and check for 'manage_alliance' permission
        const isFounder = alliance.founder_nation_id === nation.id;
        const roleKey = isFounder ? 'founder' : (alliance.member_roles?.[nation.id] || 'member');
        const role = alliance.custom_roles?.[roleKey];
        const canManageAlliance = role?.permissions?.manage_alliance || false;

        if (!isFounder && !canManageAlliance) {
            return new Response(JSON.stringify({ error: 'Forbidden: You do not have the required "manage_alliance" permission.' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 4. Update the Data if permission check passes
        // Use service role to bypass any potential RLS, as we've programmatically verified permission.
        await base44.asServiceRole.entities.Alliance.update(allianceId, {
            public_description: description,
        });

        // 5. Send a Success Response
        return new Response(JSON.stringify({ success: true, message: 'Alliance description updated successfully.' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in updateAllianceDescription function:", error);
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

import { createClient } from 'npm:@base44/sdk@0.1.0';

Deno.serve(async (req) => {
    try {
        const { nationId } = await req.json();
        if (!nationId) {
            return new Response(JSON.stringify({ success: false, error: 'Nation ID is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });
        
        // Admin Authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return new Response('Unauthorized', { status: 401 });
        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return new Response('Forbidden: Admin access required.', { status: 403 });
        }

        // --- Start Deletion Cascade ---

        // 0. Fetch the nation to ensure it exists and prevent deletion of protected nation
        const nationToDelete = await base44.entities.Nation.get(nationId);
        if (!nationToDelete) {
             return new Response(JSON.stringify({ success: true, message: 'Nation already deleted or does not exist.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (nationToDelete.created_by === 'deraj.oxford@gmail.com') {
             return new Response(JSON.stringify({ success: false, error: 'Cannot delete the super admin nation.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        // 1. Delete associated Military
        const militaries = await base44.entities.Military.filter({ nation_id: nationId });
        for (const military of militaries) { await base44.entities.Military.delete(military.id); }

        // 2. Delete associated Resources
        const resources = await base44.entities.Resource.filter({ nation_id: nationId });
        for (const resource of resources) { await base44.entities.Resource.delete(resource.id); }

        // 3. Delete associated Cities
        const cities = await base44.entities.City.filter({ nation_id: nationId });
        for (const city of cities) { await base44.entities.City.delete(city.id); }
        
        // 4. Delete associated Market Listings & Buy Orders
        const marketListings = await base44.entities.MarketListing.filter({ seller_nation_id: nationId });
        for (const listing of marketListings) { await base44.entities.MarketListing.delete(listing.id); }
        const buyOrders = await base44.entities.BuyOrder.filter({ buyer_nation_id: nationId });
        for (const order of buyOrders) { await base44.entities.BuyOrder.delete(order.id); }
        
        // 5. Delete associated Alliance Applications & Invitations
        const applications = await base44.entities.AllianceApplication.filter({ applicant_nation_id: nationId });
        for (const app of applications) { await base44.entities.AllianceApplication.delete(app.id); }
        const invitations = await base44.entities.AllianceInvitation.filter({ invited_nation_id: nationId });
        for (const inv of invitations) { await base44.entities.AllianceInvitation.delete(inv.id); }

        // 6. Delete associated Wars
        const attackerWars = await base44.entities.War.filter({ attacker_nation_id: nationId });
        for (const war of attackerWars) { await base44.entities.War.delete(war.id); }
        const defenderWars = await base44.entities.War.filter({ defender_nation_id: nationId });
        for (const war of defenderWars) { await base44.entities.War.delete(war.id); }

        // 7. Handle Alliance membership
        const allAlliances = await base44.entities.Alliance.list();
        for (const alliance of allAlliances) {
            if (alliance.founder_nation_id === nationId) {
                await base44.entities.Alliance.delete(alliance.id);
                continue;
            }
            if (alliance.member_nations?.includes(nationId)) {
                const updatedMembers = alliance.member_nations.filter(id => id !== nationId);
                const updatedRoles = { ...alliance.member_roles };
                delete updatedRoles[nationId];
                await base44.entities.Alliance.update(alliance.id, { member_nations: updatedMembers, member_roles: updatedRoles });
            }
        }
        
        // 8. Delete associated Alliance Transactions
        const transactions = await base44.entities.AllianceTransaction.filter({ initiator_nation_id: nationId });
        for (const trans of transactions) { await base44.entities.AllianceTransaction.delete(trans.id); }

        // 9. Finally, delete the Nation itself
        await base44.entities.Nation.delete(nationId);
        
        return new Response(JSON.stringify({ success: true, message: `Nation "${nationToDelete.name}" and all associated data have been deleted.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Deletion Error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message || 'An internal server error occurred.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});

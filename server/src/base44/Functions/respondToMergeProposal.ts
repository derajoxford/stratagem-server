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
        const userRoleKey = receivingAlliance.member_roles?.[nation.id] || 'member';
        const userPermissions = receivingAlliance.custom_roles?.[userRoleKey]?.permissions || {};

        if (!isFounder && !userPermissions.disband_alliance) {
            return new Response(JSON.stringify({ error: 'You do not have permission to respond to merge proposals.' }), { 
                status: 403, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // Update proposal status
        const updatedProposal = await base44.entities.MergeProposal.update(proposalId, {
            status: decision,
            responded_at: new Date().toISOString(),
            responded_by_nation_id: nation.id
        });

        if (decision === 'accepted') {
            // Get both alliances
            const [survivingAlliance, mergingAlliance] = await Promise.all([
                base44.entities.Alliance.get(proposal.surviving_alliance_id),
                base44.entities.Alliance.get(proposal.merging_alliance_id)
            ]);

            if (!survivingAlliance || !mergingAlliance) {
                return new Response(JSON.stringify({ error: 'One or both alliances not found.' }), { 
                    status: 404, 
                    headers: { "Content-Type": "application/json" } 
                });
            }

            // OPTIMIZED: Fetch only nations from the merging alliance
            const mergingNationIds = [mergingAlliance.founder_nation_id, ...mergingAlliance.member_nations];
            const mergingNations = await Promise.all(
                mergingNationIds.map(nationId => base44.entities.Nation.get(nationId))
            );

            // Filter out any null results (in case of data inconsistency)
            const validMergingNations = mergingNations.filter(n => n !== null);

            // Update all merging nations to point to the surviving alliance
            const nationUpdatePromises = validMergingNations.map(mergingNation => 
                base44.entities.Nation.update(mergingNation.id, {
                    alliance_id: survivingAlliance.id
                })
            );

            // Combine member lists and roles
            const combinedMemberNations = [
                ...new Set([
                    ...survivingAlliance.member_nations,
                    ...mergingAlliance.member_nations
                ])
            ];

            const combinedMemberRoles = {
                ...survivingAlliance.member_roles,
                ...mergingAlliance.member_roles
            };

            // Combine resources
            const survivingResources = survivingAlliance.resources || {};
            const mergingResources = mergingAlliance.resources || {};
            const combinedResources = { ...survivingResources };

            for (const [resource, amount] of Object.entries(mergingResources)) {
                combinedResources[resource] = (combinedResources[resource] || 0) + amount;
            }

            // Calculate combined stats
            const combinedTreasury = (survivingAlliance.treasury || 0) + (mergingAlliance.treasury || 0);
            const combinedMilitaryStrength = (survivingAlliance.total_military_strength || 0) + (mergingAlliance.total_military_strength || 0);
            const combinedCities = (survivingAlliance.total_cities || 0) + (mergingAlliance.total_cities || 0);

            // Execute all updates
            await Promise.all([
                // Update all merging nations
                ...nationUpdatePromises,
                
                // Update surviving alliance with combined data
                base44.entities.Alliance.update(survivingAlliance.id, {
                    member_nations: combinedMemberNations,
                    member_roles: combinedMemberRoles,
                    treasury: combinedTreasury,
                    resources: combinedResources,
                    total_military_strength: combinedMilitaryStrength,
                    total_cities: combinedCities
                }),
                
                // Deactivate merging alliance
                base44.entities.Alliance.update(mergingAlliance.id, {
                    active: false,
                    description: `${mergingAlliance.description || ''} Merged into ${survivingAlliance.name} on ${new Date().toLocaleDateString()}`
                })
            ]);
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: decision === 'accepted' ? 'Merge completed successfully!' : 'Proposal rejected.',
            proposal: updatedProposal 
        }), { 
            status: 200, 
            headers: { "Content-Type": "application/json" } 
        });

    } catch (error) {
        console.error('Respond to merge proposal error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
        });
    }
});

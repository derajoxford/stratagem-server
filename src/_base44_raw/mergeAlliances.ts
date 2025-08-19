import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response('Unauthorized', { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);

        const user = await base44.auth.me();
        if (!user) {
            return new Response('Unauthorized', { status: 401 });
        }

        const { survivingAllianceId, mergingAllianceId } = await req.json();

        if (!survivingAllianceId || !mergingAllianceId) {
            return new Response(JSON.stringify({
                success: false,
                error: "Missing required alliance IDs"
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (survivingAllianceId === mergingAllianceId) {
            return new Response(JSON.stringify({
                success: false,
                error: "Cannot merge an alliance with itself"
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Load both alliances
        const [survivingAlliance, mergingAlliance] = await Promise.all([
            base44.entities.Alliance.get(survivingAllianceId),
            base44.entities.Alliance.get(mergingAllianceId)
        ]);

        if (!survivingAlliance || !mergingAlliance) {
            return new Response(JSON.stringify({
                success: false,
                error: "One or both alliances not found"
            }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Verify user has permission to merge both alliances
        const userNations = await base44.entities.Nation.filter({ created_by: user.email });
        if (!userNations.length) {
            return new Response(JSON.stringify({
                success: false,
                error: "No nation found for user"
            }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        const userNationId = userNations[0].id;

        // Check permissions for both alliances
        const canMergeSurviving = survivingAlliance.founder_nation_id === userNationId ||
            (survivingAlliance.custom_roles?.[survivingAlliance.member_roles?.[userNationId]]?.permissions?.disband_alliance);
        
        const canMergeMerging = mergingAlliance.founder_nation_id === userNationId ||
            (mergingAlliance.custom_roles?.[mergingAlliance.member_roles?.[userNationId]]?.permissions?.disband_alliance);

        if (!canMergeSurviving || !canMergeMerging) {
            return new Response(JSON.stringify({
                success: false,
                error: "You must have disband permissions in both alliances to merge them"
            }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Perform the merge
        console.log(`Merging ${mergingAlliance.name} into ${survivingAlliance.name}`);

        // Combine member nations (avoid duplicates)
        const combinedMemberNations = [...new Set([
            ...survivingAlliance.member_nations,
            ...mergingAlliance.member_nations,
            mergingAlliance.founder_nation_id // Add merging alliance founder as member
        ])];

        // Combine member roles (merging alliance roles take precedence for conflicts)
        const combinedMemberRoles = {
            ...survivingAlliance.member_roles,
            ...mergingAlliance.member_roles
        };

        // Set the merging alliance founder as a leader in the surviving alliance
        combinedMemberRoles[mergingAlliance.founder_nation_id] = 'leader';

        // Combine resources
        const combinedResources = {};
        const resourceTypes = ['oil', 'iron', 'steel', 'aluminum', 'coal', 'uranium', 
                              'food', 'gold', 'bauxite', 'copper', 'diamonds', 'wood'];
        
        resourceTypes.forEach(resource => {
            combinedResources[resource] = (survivingAlliance.resources?.[resource] || 0) + 
                                        (mergingAlliance.resources?.[resource] || 0);
        });

        // Calculate combined stats
        const combinedTreasury = (survivingAlliance.treasury || 0) + (mergingAlliance.treasury || 0);
        const combinedMilitaryStrength = (survivingAlliance.total_military_strength || 0) + 
                                       (mergingAlliance.total_military_strength || 0);
        const combinedTotalCities = (survivingAlliance.total_cities || 0) + (mergingAlliance.total_cities || 0);

        // Update the surviving alliance
        await base44.entities.Alliance.update(survivingAllianceId, {
            member_nations: combinedMemberNations,
            member_roles: combinedMemberRoles,
            treasury: combinedTreasury,
            total_military_strength: combinedMilitaryStrength,
            total_cities: combinedTotalCities,
            resources: combinedResources
        });

        // Update treaties - transfer any treaties from merging alliance to surviving alliance
        const treaties = await base44.entities.Treaty.filter({ status: "active" });
        const mergingAllianceTreaties = treaties.filter(treaty => 
            treaty.alliance_1_id === mergingAllianceId || treaty.alliance_2_id === mergingAllianceId
        );

        for (const treaty of mergingAllianceTreaties) {
            // Check if surviving alliance already has a treaty with the same alliance
            const otherAllianceId = treaty.alliance_1_id === mergingAllianceId ? 
                treaty.alliance_2_id : treaty.alliance_1_id;
            
            const existingTreaty = treaties.find(t => 
                (t.alliance_1_id === survivingAllianceId && t.alliance_2_id === otherAllianceId) ||
                (t.alliance_1_id === otherAllianceId && t.alliance_2_id === survivingAllianceId)
            );

            if (!existingTreaty) {
                // Transfer the treaty to the surviving alliance
                const updateData = {};
                if (treaty.alliance_1_id === mergingAllianceId) {
                    updateData.alliance_1_id = survivingAllianceId;
                } else {
                    updateData.alliance_2_id = survivingAllianceId;
                }
                
                await base44.entities.Treaty.update(treaty.id, updateData);
                console.log(`Transferred treaty ${treaty.treaty_name} to surviving alliance`);
            } else {
                // Cancel the duplicate treaty
                await base44.entities.Treaty.update(treaty.id, {
                    status: "cancelled",
                    cancelled_at: new Date().toISOString(),
                    cancellation_reason: "Alliance merger - duplicate treaty"
                });
                console.log(`Cancelled duplicate treaty ${treaty.treaty_name} due to merger`);
            }
        }

        // Deactivate the merging alliance
        await base44.entities.Alliance.update(mergingAllianceId, {
            active: false,
            member_nations: [],
            member_roles: {},
            treasury: 0,
            resources: {},
            total_military_strength: 0,
            total_cities: 0
        });

        console.log(`Alliance merger completed successfully`);

        return new Response(JSON.stringify({
            success: true,
            message: `${mergingAlliance.name} has been successfully merged into ${survivingAlliance.name}`,
            surviving_alliance: survivingAlliance.name,
            merged_alliance: mergingAlliance.name,
            new_member_count: combinedMemberNations.length + 1, // +1 for founder
            transferred_treasury: mergingAlliance.treasury || 0,
            transferred_treaties: mergingAllianceTreaties.length
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Alliance merger error:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});

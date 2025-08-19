import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Parse the request to get allianceId with better error handling
        let allianceId;
        if (req.method === 'GET') {
            const url = new URL(req.url);
            allianceId = url.searchParams.get('allianceId');
        } else if (req.method === 'POST') {
            try {
                const body = await req.json();
                allianceId = body.allianceId;
            } catch (parseError) {
                return new Response(JSON.stringify({ 
                    error: 'Invalid JSON in request body' 
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        if (!allianceId) {
            return new Response(JSON.stringify({ 
                error: 'allianceId parameter is required' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Add a small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

        // Use service role to fetch alliance data with error handling
        let alliance;
        try {
            alliance = await base44.asServiceRole.entities.Alliance.get(allianceId);
        } catch (allianceError) {
            console.error(`Failed to fetch alliance ${allianceId}:`, allianceError);
            return new Response(JSON.stringify({ 
                error: 'Alliance not found or access denied' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (!alliance || !alliance.active) {
            return new Response(JSON.stringify({ 
                error: 'Alliance not found or inactive' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get all member nation IDs (including founder)
        const allMemberIds = [alliance.founder_nation_id, ...(alliance.member_nations || [])];
        
        // Fetch member nations data with error handling
        const memberNationsPromises = allMemberIds.map(async (nationId) => {
            try {
                const nation = await base44.asServiceRole.entities.Nation.get(nationId);
                return nation && nation.active ? nation : null;
            } catch (error) {
                console.warn(`Failed to fetch member nation ${nationId}:`, error);
                return null;
            }
        });

        const memberNationsResults = await Promise.all(memberNationsPromises);
        const memberNations = memberNationsResults.filter(nation => nation !== null);

        // Fetch founder nation separately to ensure we have founder info
        let founderNation;
        try {
            // FIX: This should fetch a Nation, not an Alliance
            founderNation = await base44.asServiceRole.entities.Nation.get(alliance.founder_nation_id);
        } catch (error) {
            console.warn(`Failed to fetch founder nation ${alliance.founder_nation_id}:`, error);
            founderNation = null;
        }

        // Calculate alliance statistics
        const totalMembers = memberNations.length;
        const totalMilitaryStrength = memberNations.reduce((sum, nation) => sum + (nation.military_strength || 0), 0);
        const totalCities = memberNations.reduce((sum, nation) => sum + (nation.cities || 0), 0);
        const totalPopulation = memberNations.reduce((sum, nation) => sum + (nation.population || 0), 0);
        const averageNationStrength = totalMembers > 0 ? Math.round(totalMilitaryStrength / totalMembers) : 0;

        // Create public member list (limited info for privacy)
        const publicMembers = memberNations.map(nation => ({
            id: nation.id,
            name: nation.name,
            leader_name: nation.leader_name,
            government_type: nation.government_type,
            military_strength: nation.military_strength,
            cities: nation.cities,
            profile_image_url: nation.profile_image_url || '',
            is_founder: nation.id === alliance.founder_nation_id
        }));

        // Create filtered public response
        const publicData = {
            // Basic Alliance Info
            id: alliance.id,
            name: alliance.name,
            description: alliance.description || '',
            logo_url: alliance.logo_url || '',
            created_date: alliance.created_date,
            
            // Founder Information
            founder: founderNation ? {
                id: founderNation.id,
                name: founderNation.name,
                leader_name: founderNation.leader_name
            } : { name: 'Unknown' },
            
            // Alliance Statistics
            statistics: {
                total_members: totalMembers,
                total_military_strength: totalMilitaryStrength,
                total_cities: totalCities,
                total_population: totalPopulation,
                average_nation_strength: averageNationStrength
            },
            
            // Member Nations (public info only)
            members: publicMembers,
            
            // Custom Content
            public_description: alliance.public_description || '',
            profile_image_url: alliance.profile_image_url || '',
            banner_image_url: alliance.banner_image_url || '',
            
            // Activity Status
            last_updated: new Date().toISOString()
        };

        return new Response(JSON.stringify({ data: publicData }), { // Wrap in a 'data' object
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60' // Cache for 60 seconds to reduce load
            }
        });

    } catch (error) {
        console.error('getPublicAllianceData error:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal server error while fetching alliance profile',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

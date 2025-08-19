import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Parse the request to get nationId with better error handling
        let nationId;
        if (req.method === 'GET') {
            const url = new URL(req.url);
            nationId = url.searchParams.get('nationId');
        } else if (req.method === 'POST') {
            try {
                const body = await req.json();
                nationId = body.nationId;
            } catch (parseError) {
                return new Response(JSON.stringify({ 
                    error: 'Invalid JSON in request body' 
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        if (!nationId) {
            return new Response(JSON.stringify({ 
                error: 'nationId parameter is required' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Add a small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

        // Use service role to fetch nation data with error handling
        let nation;
        try {
            nation = await base44.asServiceRole.entities.Nation.get(nationId);
        } catch (nationError) {
            console.error(`Failed to fetch nation ${nationId}:`, nationError);
            return new Response(JSON.stringify({ 
                error: 'Nation not found or access denied' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (!nation || !nation.active) {
            return new Response(JSON.stringify({ 
                error: 'Nation not found or inactive' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Fetch related public data using service role with individual error handling
        const [cities, military, resources, alliance] = await Promise.allSettled([
            base44.asServiceRole.entities.City.filter({ nation_id: nationId }),
            base44.asServiceRole.entities.Military.filter({ nation_id: nationId }),
            base44.asServiceRole.entities.Resource.filter({ nation_id: nationId }),
            nation.alliance_id ? 
                base44.asServiceRole.entities.Alliance.get(nation.alliance_id) : 
                Promise.resolve(null)
        ]);

        // Safely extract data from Promise.allSettled results
        const citiesData = cities.status === 'fulfilled' ? cities.value : [];
        const militaryData = military.status === 'fulfilled' ? (military.value[0] || {}) : {};
        const resourceData = resources.status === 'fulfilled' ? (resources.value[0] || {}) : {};
        const allianceData = alliance.status === 'fulfilled' ? alliance.value : null;

        // Calculate public metrics safely
        const totalCities = citiesData.length || 0;
        const totalPopulation = citiesData.reduce((sum, city) => sum + (city.population || 0), 0);
        const totalIncome = citiesData.reduce((sum, city) => sum + (city.income_per_turn || 0), 0);

        // Calculate basic military summary (without revealing exact unit counts for security)
        const militaryCategories = {
            ground_forces: (militaryData.soldiers || 0) + (militaryData.tanks || 0),
            air_forces: militaryData.aircraft || 0,
            naval_forces: militaryData.warships || 0,
            strategic_weapons: (militaryData.conventional_bombs || 0) + (militaryData.nuclear_weapons || 0)
        };

        // Create filtered public response
        const publicData = {
            // Basic Nation Info
            id: nation.id,
            name: nation.name,
            leader_name: nation.leader_name,
            government_type: nation.government_type,
            created_date: nation.created_date,
            
            // Public Statistics
            population: nation.population,
            cities: nation.cities,
            territory: nation.territory,
            military_strength: nation.military_strength,
            
            // Calculated Metrics
            total_cities: totalCities,
            total_population: totalPopulation,
            estimated_gdp: totalIncome * 365, // Rough annual estimate
            
            // Military Overview (generalized)
            military_overview: {
                training_level: militaryData.training_level || 1,
                total_strength: nation.military_strength,
                force_composition: militaryCategories
            },
            
            // Alliance Information
            alliance: allianceData ? {
                id: allianceData.id,
                name: allianceData.name,
                member_count: (allianceData.member_nations?.length || 0) + 1 // +1 for founder
            } : null,
            
            // Custom Content
            public_description: nation.public_description || '',
            profile_image_url: nation.profile_image_url || '',
            banner_image_url: nation.banner_image_url || '',
            
            // Basic Resource Overview (non-sensitive totals)
            resource_diversity: Object.keys(resourceData).filter(key => 
                resourceData[key] > 0 && !['nation_id', 'id', 'created_date', 'updated_date'].includes(key)
            ).length,
            
            // Activity Status
            is_blockaded: nation.is_blockaded || false,
            last_updated: new Date().toISOString()
        };

        return new Response(JSON.stringify(publicData), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=30' // Cache for 30 seconds to reduce load
            }
        });

    } catch (error) {
        console.error('getPublicNationData error:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal server error while fetching nation profile',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

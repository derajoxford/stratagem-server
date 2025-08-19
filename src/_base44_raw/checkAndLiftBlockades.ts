import { createClient } from 'npm:@base44/sdk@0.1.0';

// This is a helper function, not a Deno.serve endpoint.
// It will be imported and called by gameTick.js.
export async function checkAndLiftBlockades(base44) {
    try {
        console.log("Executing checkAndLiftBlockades function...");
        const blockadedNations = await base44.entities.Nation.filter({ is_blockaded: true });

        if (blockadedNations.length === 0) {
            console.log("No blockaded nations found. Exiting check.");
            return;
        }

        console.log(`Found ${blockadedNations.length} blockaded nation(s).`);

        const blockadingNationIds = [...new Set(blockadedNations.map(n => n.blockading_nation_id).filter(id => id))];
        
        if (blockadingNationIds.length === 0) {
            console.log("No unique blockading nations to check. Exiting.");
            return;
        }

        const blockadingMilitaries = await base44.entities.Military.filter({ nation_id: { $in: blockadingNationIds } });

        const nationsToLift = [];

        for (const nation of blockadedNations) {
            if (!nation.blockading_nation_id) continue;

            const blockadingMilitary = blockadingMilitaries.find(m => m.nation_id === nation.blockading_nation_id);

            if (!blockadingMilitary || (blockadingMilitary.warships || 0) <= 0) {
                console.log(`Blockade on ${nation.name} (ID: ${nation.id}) will be lifted. Reason: Blockading nation ${nation.blockading_nation_id} has no warships.`);
                nationsToLift.push(nation.id);
            }
        }

        if (nationsToLift.length > 0) {
            console.log(`Lifting blockades for ${nationsToLift.length} nation(s).`);
            const updatePromises = nationsToLift.map(nationId => 
                base44.entities.Nation.update(nationId, {
                    is_blockaded: false,
                    blockading_nation_id: null
                })
            );
            await Promise.all(updatePromises);
            console.log("Blockades lifted successfully.");
        } else {
            console.log("No blockades met the criteria for lifting.");
        }

    } catch (error) {
        console.error("Error in checkAndLiftBlockades helper function:", error);
        // We throw the error so the caller (gameTick) can be aware of the failure.
        throw error;
    }
}

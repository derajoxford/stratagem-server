
import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
    apiKey: Deno.env.get('BASE44_API_KEY'),
});

Deno.serve(async (req) => {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const { recipientNationId, amount, resources, description } = await req.json();

        // Get game state for current turn number
        const [gameState] = await Promise.all([
            base44.asServiceRole.entities.GameState.list()
        ]);
        const currentTurn = gameState?.[0]?.current_turn_number || 0;

        // Get sender nation
        const senderNation = await base44.entities.Nation.filter({ created_by: user.email });
        if (!senderNation.length) {
            return new Response(JSON.stringify({ success: false, error: 'Sender nation not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        const sender = senderNation[0];
        const recipient = await base44.entities.Nation.get(recipientNationId);

        if (!recipient) {
            return new Response(JSON.stringify({ success: false, error: 'Recipient nation not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        // Check if both nations are in the same alliance
        if (!sender.alliance_id || sender.alliance_id !== recipient.alliance_id) {
            return new Response(JSON.stringify({ success: false, error: 'Both nations must be in the same alliance' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        // Check if recipient is blockaded
        if (recipient.is_blockaded) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Cannot send funds to a blockaded nation. Naval blockades prevent all incoming transfers.' 
            }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        // Get alliance
        const alliance = await base44.entities.Alliance.get(sender.alliance_id);
        if (!alliance) {
            return new Response(JSON.stringify({ success: false, error: 'Alliance not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        // Validate sender has withdrawal permissions
        const senderRole = alliance.member_roles?.[sender.id] || 'member';
        const roleConfig = alliance.custom_roles?.[senderRole];
        
        if (!roleConfig?.permissions?.withdraw_funds) {
            return new Response(JSON.stringify({ success: false, error: 'You do not have permission to withdraw funds' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        // Validate sufficient alliance funds
        const transferAmount = amount || 0;
        if (transferAmount > 0 && alliance.treasury < transferAmount) {
            return new Response(JSON.stringify({ success: false, error: 'Insufficient alliance treasury funds' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        // Validate sufficient alliance resources
        const transferResources = resources || {};
        const allianceResources = alliance.resources || {}; // This represents senderAllianceResources
        
        for (const [resourceType, requestedAmount] of Object.entries(transferResources)) {
            if (requestedAmount > 0 && (allianceResources[resourceType] || 0) < requestedAmount) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: `Insufficient alliance ${resourceType}: need ${requestedAmount}, have ${allianceResources[resourceType] || 0}` 
                }), { status: 403, headers: { 'Content-Type': 'application/json' } });
            }
        }

        // Perform the transfer
        const updates = [];

        // Update alliance treasury and resources
        const newAllianceTreasury = alliance.treasury - transferAmount;
        const newAllianceResources = { ...allianceResources };
        
        for (const [resourceType, amountVal] of Object.entries(transferResources)) {
            if (amountVal > 0) {
                newAllianceResources[resourceType] = (newAllianceResources[resourceType] || 0) - amountVal;
            }
        }

        updates.push(
            base44.entities.Alliance.update(alliance.id, {
                treasury: newAllianceTreasury,
                resources: newAllianceResources
            })
        );

        // Update recipient nation treasury
        if (transferAmount > 0) {
            updates.push(
                base44.entities.Nation.update(recipient.id, {
                    treasury: recipient.treasury + transferAmount
                })
            );
        }

        // Update recipient nation resources
        if (Object.keys(transferResources).length > 0) {
            const recipientResources = await base44.entities.Resource.filter({ nation_id: recipient.id });
            const recipientResourceRecord = recipientResources[0] || { nation_id: recipient.id }; // Ensure nation_id is present for new record
            
            const newRecipientResources = { ...recipientResourceRecord };
            for (const [resourceType, amountVal] of Object.entries(transferResources)) {
                if (amountVal > 0) {
                    newRecipientResources[resourceType] = (newRecipientResources[resourceType] || 0) + amountVal;
                }
            }

            if (recipientResources.length > 0) {
                updates.push(
                    base44.entities.Resource.update(recipientResources[0].id, newRecipientResources)
                );
            } else {
                updates.push(
                    base44.entities.Resource.create(newRecipientResources)
                );
            }
        }

        // Create transaction record
        updates.push(
            base44.entities.AllianceTransaction.create({
                alliance_id: alliance.id,
                transaction_type: 'transfer_out',
                initiator_nation_id: sender.id,
                recipient_nation_id: recipient.id,
                amount: transferAmount,
                resources: transferResources,
                description: description || `Transfer to ${recipient.name}`
            })
        );

        // Log resource transactions if resources are being transferred
        if (resources && Object.keys(resources).length > 0) {
            for (const [resourceType, amountVal] of Object.entries(resources)) {
                if (amountVal > 0) {
                    const senderCurrentAmount = allianceResources[resourceType] || 0;
                    
                    updates.push(
                        // Sender alliance loses resources, logged from sender nation's perspective
                        base44.asServiceRole.entities.ResourceTransaction.create({
                            nation_id: sender.id, // Initiator nation
                            resource_type: resourceType,
                            transaction_type: 'outflow',
                            category: 'Alliance',
                            sub_category: `Alliance Transfer: ${resourceType} to ${recipient.name}`,
                            amount: amountVal,
                            new_stockpile: senderCurrentAmount - amountVal,
                            related_entity_id: recipient.id, // Recipient nation ID
                            turn_number: currentTurn
                        })
                    );
                }
            }
        }

        await Promise.all(updates);

        return new Response(JSON.stringify({
            success: true,
            message: `Successfully transferred funds to ${recipient.name}`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Alliance transfer error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: `Transfer failed: ${error.message}`
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

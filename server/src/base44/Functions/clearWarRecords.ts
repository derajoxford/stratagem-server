import { createClient } from 'npm:@base44/sdk@0.1.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

        // Admin Authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const token = authHeader.split(' ')[1];
        base44.auth.setToken(token);
        
        let user;
        try {
            user = await base44.auth.me();
        } catch (authError) {
            console.error('Authentication failed:', authError);
            return new Response(JSON.stringify({ success: false, error: 'Authentication failed' }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        if (!user || user.role !== 'admin') {
            return new Response(JSON.stringify({ success: false, error: 'Forbidden: Admin access required.' }), { 
                status: 403, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // Fetch all war records with error handling
        let wars;
        try {
            wars = await base44.entities.War.list();
        } catch (fetchError) {
            console.error('Failed to fetch wars:', fetchError);
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Failed to fetch war records from database' 
            }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const warCount = wars ? wars.length : 0;

        if (warCount === 0) {
            return new Response(JSON.stringify({ 
                success: true, 
                message: 'No war records to clear.' 
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        console.log(`Starting deletion of ${warCount} war records...`);

        // Delete each war record with rate limiting protection
        let deletedCount = 0;
        let failedCount = 0;
        
        for (let i = 0; i < wars.length; i++) {
            const war = wars[i];
            try {
                await base44.entities.War.delete(war.id);
                deletedCount++;
                console.log(`Deleted war ${i + 1}/${wars.length}: ${war.id}`);
                
                // Add a small delay between deletions to avoid rate limiting
                if (i < wars.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
                }
            } catch (deleteError) {
                console.error(`Failed to delete war ${war.id}:`, deleteError);
                failedCount++;
                
                // If we're getting rate limited, add a longer delay
                if (deleteError.message && deleteError.message.includes('rate limit')) {
                    console.log('Rate limit detected, waiting 2 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        const message = failedCount > 0 
            ? `Successfully cleared ${deletedCount} war record(s). ${failedCount} deletions failed.`
            : `Successfully cleared ${deletedCount} war record(s).`;

        return new Response(JSON.stringify({ 
            success: true, 
            message,
            details: {
                total: warCount,
                deleted: deletedCount,
                failed: failedCount
            }
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error('Clear War Records Error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message || 'An internal server error occurred.' 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});

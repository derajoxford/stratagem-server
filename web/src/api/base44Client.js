import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "687e5c82e92df03a62dd79f2", 
  requiresAuth: true // Ensure authentication is required for all operations
});

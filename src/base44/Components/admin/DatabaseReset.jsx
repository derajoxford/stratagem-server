import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { clearWarRecords } from '@/functions/clearWarRecords';

export default function DatabaseReset() {
    const [isClearing, setIsClearing] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const handleClearWars = async () => {
        setIsClearing(true);
        setFeedback(null);
        
        try {
            const response = await clearWarRecords();
            
            // Handle different response formats
            const responseData = response.data || response;
            
            if (responseData.success) {
                setFeedback({ 
                    type: 'success', 
                    message: responseData.message,
                    details: responseData.details
                });
            } else {
                setFeedback({ 
                    type: 'error', 
                    message: responseData.error || 'Failed to clear war records.' 
                });
            }
        } catch (error) {
            console.error('Clear war records error:', error);
            
            // Handle different error types
            let errorMessage = 'An unexpected error occurred.';
            
            if (error.response) {
                // Server responded with error status
                const serverError = error.response.data;
                if (typeof serverError === 'string') {
                    errorMessage = serverError;
                } else if (serverError && serverError.error) {
                    errorMessage = serverError.error;
                } else if (serverError && serverError.message) {
                    errorMessage = serverError.message;
                }
            } else if (error.message) {
                // Network or other error
                errorMessage = error.message;
            }
            
            setFeedback({ 
                type: 'error', 
                message: errorMessage
            });
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Database Reset
                </CardTitle>
                <CardDescription>
                    This section is for high-risk database operations. Be absolutely sure before proceeding.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="border border-amber-500/30 bg-amber-500/10 p-4 rounded-lg">
                    <h4 className="font-semibold text-amber-400 mb-2">Clear All War Records</h4>
                    <p className="text-slate-300 text-sm mb-4">
                        This will permanently delete ALL records from the `War` entity. This is useful for clearing test data and starting fresh with conflict testing. This action cannot be undone.
                    </p>
                    
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" disabled={isClearing}>
                                {isClearing ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4 mr-2" />
                                )}
                                {isClearing ? 'Clearing...' : 'Clear All War Data'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-800 border-slate-700">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-red-400">Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-300">
                                    This will permanently delete every single war record, active or concluded. This action is irreversible and may take some time to complete.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-slate-700 border-slate-600 hover:bg-slate-600">
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={handleClearWars} 
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={isClearing}
                                >
                                    {isClearing ? 'Processing...' : 'Yes, delete all wars'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    
                    {feedback && (
                        <div className={`mt-4 p-3 rounded-lg border ${
                            feedback.type === 'success' 
                                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                            <div className="flex items-start gap-2">
                                {feedback.type === 'success' ? (
                                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                ) : (
                                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{feedback.message}</p>
                                    {feedback.details && (
                                        <div className="mt-2 text-xs opacity-80">
                                            <p>Total: {feedback.details.total} | Deleted: {feedback.details.deleted} | Failed: {feedback.details.failed}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border border-red-500/30 bg-red-500/10 p-4 rounded-lg">
                     <h4 className="font-semibold text-red-400 mb-2">Full Game Reset</h4>
                     <p className="text-slate-300 text-sm mb-4">
                        This feature is not yet fully implemented. Activating it would require a backend function to wipe all game-related tables (Nations, Alliances, etc.).
                    </p>
                    <Button variant="destructive" disabled>
                        Reset All Game Data (Disabled)
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

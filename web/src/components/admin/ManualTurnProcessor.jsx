import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { gameTick } from '@/api/functions';

export default function ManualTurnProcessor({ gameState, onUpdate }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [lastProcessResult, setLastProcessResult] = useState(null);

    const handleProcessTurn = async () => {
        setIsProcessing(true);
        setFeedback(null);
        setLastProcessResult(null);

        try {
            console.log("Triggering game tick function...");
            const result = await gameTick({});
            
            console.log("Game tick result:", result);

            if (result.data?.success) {
                setFeedback({
                    type: 'success',
                    message: result.data.message || 'Turn processed successfully!'
                });
                setLastProcessResult({
                    nationsProcessed: result.data.nationsProcessed || 0,
                    warsProcessed: result.data.warsProcessed || 0,
                    timestamp: new Date().toLocaleString()
                });
                
                // Refresh the parent component's data
                if (onUpdate) {
                    onUpdate();
                }
            } else {
                setFeedback({
                    type: 'error',
                    message: result.data?.error || 'Turn processing failed with unknown error.'
                });
            }
        } catch (error) {
            console.error("Turn processing error:", error);
            setFeedback({
                type: 'error',
                message: `Turn processing failed: ${error.message}`
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const getTimeSinceLastTurn = () => {
        if (!gameState?.last_turn_processed_at) return "Never";
        
        const lastTurn = new Date(gameState.last_turn_processed_at);
        const now = new Date();
        const diffInMinutes = Math.floor((now - lastTurn) / (1000 * 60));
        
        if (diffInMinutes < 1) return "Just now";
        if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} hours ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} days ago`;
    };

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Play className="w-5 h-5 text-green-400" />
                    Manual Turn Processor
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Current Game State */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                        <div className="text-sm text-slate-400 mb-1">Current Turn</div>
                        <div className="text-2xl font-bold text-white">
                            {gameState?.current_turn_number || 1}
                        </div>
                    </div>
                    
                    <div className="bg-slate-700/50 rounded-lg p-4">
                        <div className="text-sm text-slate-400 mb-1">Last Processed</div>
                        <div className="text-sm font-medium text-slate-300">
                            {getTimeSinceLastTurn()}
                        </div>
                    </div>
                    
                    <div className="bg-slate-700/50 rounded-lg p-4">
                        <div className="text-sm text-slate-400 mb-1">Status</div>
                        <Badge 
                            variant={gameState?.is_processing ? "destructive" : "secondary"}
                            className={gameState?.is_processing ? 
                                "bg-red-500/20 text-red-400 border-red-500/30" : 
                                "bg-green-500/20 text-green-400 border-green-500/30"
                            }
                        >
                            {gameState?.is_processing ? "Processing" : "Ready"}
                        </Badge>
                    </div>
                </div>

                {/* Last Process Result */}
                {lastProcessResult && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 font-medium">Last Turn Results</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-400">Nations Processed:</span>
                                <span className="text-white ml-2 font-medium">{lastProcessResult.nationsProcessed}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">Wars Processed:</span>
                                <span className="text-white ml-2 font-medium">{lastProcessResult.warsProcessed}</span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-slate-400">Processed at:</span>
                                <span className="text-white ml-2 font-medium">{lastProcessResult.timestamp}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Feedback Messages */}
                {feedback && (
                    <Alert className={
                        feedback.type === 'success' 
                            ? "border-green-500/50 bg-green-500/10" 
                            : "border-red-500/50 bg-red-500/10"
                    }>
                        <div className="flex items-center gap-2">
                            {feedback.type === 'success' ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                            )}
                            <AlertDescription className={
                                feedback.type === 'success' ? "text-green-300" : "text-red-300"
                            }>
                                {feedback.message}
                            </AlertDescription>
                        </div>
                    </Alert>
                )}

                {/* Process Turn Button */}
                <div className="space-y-3">
                    <div className="text-sm text-slate-400">
                        Click the button below to manually advance the game by one turn. This will:
                        <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                            <li>Calculate and distribute income to all nations</li>
                            <li>Process resource production from all cities</li>
                            <li>Regenerate tactical points for active wars</li>
                            <li>Advance the global turn counter</li>
                        </ul>
                    </div>
                    
                    <Button
                        onClick={handleProcessTurn}
                        disabled={isProcessing || gameState?.is_processing}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600"
                        size="lg"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Processing Turn...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5 mr-2" />
                                Process Next Turn
                            </>
                        )}
                    </Button>
                </div>

                {/* Warning for Processing State */}
                {gameState?.is_processing && (
                    <Alert className="border-amber-500/50 bg-amber-500/10">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <AlertDescription className="text-amber-300">
                            A turn is currently being processed. Please wait for it to complete before processing another turn.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
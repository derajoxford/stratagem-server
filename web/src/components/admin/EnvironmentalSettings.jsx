
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Leaf, Zap, AlertTriangle, Factory, HeartPulse, Play, CheckCircle, Loader2 } from 'lucide-react';
import { InputField } from './shared/InputField';
import { processEnvironmentalTurn } from '@/api/functions';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function EnvironmentalSettings({ config, onUpdate, gameState, onRefresh }) {
    const [isCatchingUp, setIsCatchingUp] = useState(false);
    const [feedback, setFeedback] = useState(null); // Renamed from catchUpFeedback
    const [catchUpProgress, setCatchUpProgress] = useState({ current: 0, target: 0 });

    if (!config || !gameState) return <div>Loading...</div>; // Changed return value

    // Calculate environmental status
    const getEnvironmentalStatus = () => {
        if (!gameState) return { status: 'unknown', label: 'Unknown', color: 'bg-gray-500', turnsBehind: 0 };
        
        const currentTurn = gameState.current_turn_number || 1;
        const lastEnvTurn = gameState.last_environmental_turn_number || 0;
        const turnsBehind = currentTurn - lastEnvTurn;
        
        if (turnsBehind === 0) {
            return { status: 'up-to-date', label: 'Up-to-date', color: 'bg-green-500', turnsBehind: 0 };
        } else if (turnsBehind === 1) {
            return { status: 'normal_delay', label: 'Normal Delay', color: 'bg-yellow-500', turnsBehind: 1 };
        } else if (turnsBehind <= 3) {
            return { status: 'behind', label: 'Behind', color: 'bg-orange-500', turnsBehind };
        } else {
            return { status: 'significantly_behind', label: 'Significantly Behind', color: 'bg-red-500', turnsBehind };
        }
    };

    const envStatus = getEnvironmentalStatus();

    const handleCatchUp = async () => {
        const currentTurn = gameState?.current_turn_number || 1;
        const lastEnvTurn = gameState?.last_environmental_turn_number || 0;
        const turnsBehind = currentTurn - lastEnvTurn;

        if (turnsBehind <= 0) {
            setFeedback({ type: 'info', message: 'Environmental processing is already up-to-date!' }); // Renamed from setCatchUpFeedback
            return;
        }

        setIsCatchingUp(true);
        setFeedback(null); // Renamed from setCatchUpFeedback
        setCatchUpProgress({ current: lastEnvTurn, target: currentTurn });

        try {
            console.log(`Starting catch-up: need to process ${turnsBehind} turns (${lastEnvTurn + 1} to ${currentTurn})`);
            
            let processedTurns = 0;
            let currentProcessingTurn = lastEnvTurn + 1;

            while (currentProcessingTurn <= currentTurn) {
                console.log(`Processing environmental turn ${currentProcessingTurn}...`);
                setCatchUpProgress({ current: currentProcessingTurn - 1, target: currentTurn });

                const response = await processEnvironmentalTurn({});
                const result = response.data || response;

                if (!result.success) {
                    throw new Error(result.error || 'Environmental processing failed');
                }

                console.log(`Turn ${result.turn_processed} completed - processed ${result.cities_processed} cities and ${result.events_processed} events`);
                
                processedTurns++;
                currentProcessingTurn = result.new_environmental_turn_number + 1;
                
                // Update progress
                setCatchUpProgress({ current: result.new_environmental_turn_number, target: currentTurn });

                // Much longer delay between turns to prevent overwhelming the system
                if (currentProcessingTurn <= currentTurn) {
                    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000)); // 2-4 second delay
                }
            }

            setFeedback({ // Renamed from setCatchUpFeedback
                type: 'success', 
                message: `Successfully caught up! Processed ${processedTurns} environmental turn${processedTurns !== 1 ? 's' : ''}.` 
            });

            // Refresh the parent component to update the status
            if (onUpdate) {
                setTimeout(onUpdate, 1000);
            }

        } catch (error) {
            console.error('Catch-up error:', error);
            setFeedback({ type: 'error', message: `Catch-up failed: ${error.message}. Try again in a few moments.` }); // Renamed from setCatchUpFeedback
        } finally {
            setIsCatchingUp(false);
            setCatchUpProgress({ current: 0, target: 0 });
            setFeedback({ type: 'success', message: 'Environmental catch-up complete!' }); // Added/Modified
            // Correctly call the refresh function on the parent AdminPage
            if (onRefresh) {
                onRefresh();
            }
        }
    };

    const envSettings = config.environmental_settings;

    return (
        <div className="space-y-6">
            {/* Environmental Status Card */}
            <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Leaf className="w-5 h-5 text-green-400" />
                        Environmental Processing Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${envStatus.color}`}></div>
                            <div>
                                <div className="text-white font-medium">{envStatus.label}</div>
                                {envStatus.turnsBehind > 0 && (
                                    <div className="text-sm text-slate-400">
                                        Environmental processing is {envStatus.turnsBehind} turn{envStatus.turnsBehind !== 1 ? 's' : ''} behind. 
                                        {envStatus.turnsBehind > 3 && ' This may indicate an issue with the environmental worker.'}
                                    </div>
                                )}
                                {gameState?.last_environmental_processed_at && (
                                    <div className="text-xs text-slate-500">
                                        Last processed: {new Date(gameState.last_environmental_processed_at).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {envStatus.turnsBehind > 0 && (
                            <Button
                                onClick={handleCatchUp}
                                disabled={isCatchingUp}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isCatchingUp ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Catching Up...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Catch Up ({envStatus.turnsBehind} turn{envStatus.turnsBehind !== 1 ? 's' : ''})
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {isCatchingUp && catchUpProgress.target > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-400">
                                <span>Processing Turn {catchUpProgress.current + 1}</span>
                                <span>{catchUpProgress.current}/{catchUpProgress.target}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(catchUpProgress.current / catchUpProgress.target) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Catch-up Feedback */}
                    {feedback && ( // Renamed from catchUpFeedback
                        <Alert className={`${
                            feedback.type === 'success' ? 'border-green-500/50 bg-green-500/10' : // Renamed from catchUpFeedback
                            feedback.type === 'error' ? 'border-red-500/50 bg-red-500/10' : // Renamed from catchUpFeedback
                            'border-blue-500/50 bg-blue-500/10'
                        }`}>
                            <div className="flex items-center gap-2">
                                {feedback.type === 'success' ? ( // Renamed from catchUpFeedback
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : feedback.type === 'error' ? ( // Renamed from catchUpFeedback
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                ) : (
                                    <Zap className="w-4 h-4 text-blue-400" />
                                )}
                                <AlertDescription className={
                                    feedback.type === 'success' ? 'text-green-300' : // Renamed from catchUpFeedback
                                    feedback.type === 'error' ? 'text-red-300' : // Renamed from catchUpFeedback
                                    'text-blue-300'
                                }>
                                    {feedback.message} {/* Renamed from catchUpFeedback */}
                                </AlertDescription>
                            </div>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Environmental Decay Rates */}
            <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        Environmental Decay Rates
                    </CardTitle>
                    <CardDescription>Configure how quickly pollution and radiation naturally dissipate over time</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-lg font-medium text-green-400">Local Environmental Decay</h4>
                            <InputField
                                label="Local Pollution Decay Rate (%)"
                                name="environmental_settings.local_pollution_decay_rate_percent"
                                value={envSettings.local_pollution_decay_rate_percent}
                                onChange={onUpdate}
                                step="0.1"
                                description="Percentage of local pollution that naturally dissipates each turn"
                            />
                            <InputField
                                label="Local Fallout Decay Rate (%)"
                                name="environmental_settings.local_fallout_decay_rate_percent"
                                value={envSettings.local_fallout_decay_rate_percent}
                                onChange={onUpdate}
                                step="0.1"
                                description="Percentage of local nuclear fallout that naturally dissipates each turn"
                            />
                        </div>
                        
                        <div className="space-y-4">
                            <h4 className="text-lg font-medium text-blue-400">Global Environmental Decay</h4>
                            <InputField
                                label="Global Pollution Decay Rate (%)"
                                name="environmental_settings.global_pollution_decay_rate_percent"
                                value={envSettings.global_pollution_decay_rate_percent}
                                onChange={onUpdate}
                                step="0.1"
                                description="Percentage of global pollution that naturally dissipates each turn"
                            />
                            <InputField
                                label="Global Radiation Decay Rate (%)"
                                name="environmental_settings.global_radiation_decay_rate_percent"
                                value={envSettings.global_radiation_decay_rate_percent}
                                onChange={onUpdate}
                                step="0.1"
                                description="Percentage of global radiation that naturally dissipates each turn"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Infrastructure Pollution Factors */}
            <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Factory className="w-5 h-5 text-orange-400" />
                        Infrastructure Pollution Factors
                    </CardTitle>
                    <CardDescription>Configure how much pollution each building type generates (negative values reduce pollution)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(envSettings.infrastructure_pollution_factors || {}).map(([buildingType, value]) => (
                            <InputField
                                key={buildingType}
                                label={buildingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                name={`environmental_settings.infrastructure_pollution_factors.${buildingType}`}
                                value={value}
                                onChange={onUpdate}
                                step="0.1"
                                description={`Pollution per ${buildingType.replace(/_/g, ' ')} per turn`}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Health and Population Impact */}
            <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <HeartPulse className="w-5 h-5 text-red-400" />
                        Health Score Impact
                    </CardTitle>
                    <CardDescription>Configure how environmental factors affect city health scores</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-lg font-medium text-red-400">Health Score Pollution Impact</h4>
                            <InputField
                                label="Local Pollution Impact"
                                name="environmental_settings.health_score_pollution_impact.local_pollution"
                                value={envSettings.health_score_pollution_impact?.local_pollution}
                                onChange={onUpdate}
                                step="0.1"
                                description="Health score change per point of local pollution (typically negative)"
                            />
                            <InputField
                                label="Local Fallout Impact"
                                name="environmental_settings.health_score_pollution_impact.local_fallout"
                                value={envSettings.health_score_pollution_impact?.local_fallout}
                                onChange={onUpdate}
                                step="0.1"
                                description="Health score change per point of local fallout (typically negative)"
                            />
                            <InputField
                                label="Global Radiation Impact"
                                name="environmental_settings.health_score_pollution_impact.global_radiation"
                                value={envSettings.health_score_pollution_impact?.global_radiation}
                                onChange={onUpdate}
                                step="0.01"
                                description="Health score change per point of global radiation (typically negative)"
                            />
                        </div>
                        
                        <div className="space-y-4">
                            <h4 className="text-lg font-medium text-green-400">Natural Factors</h4>
                            <InputField
                                label="Pollution Reduction per Acre"
                                name="environmental_settings.pollution_reduction_per_acre"
                                value={envSettings.pollution_reduction_per_acre}
                                onChange={onUpdate}
                                step="0.001"
                                description="How much pollution is reduced per acre of undeveloped land"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

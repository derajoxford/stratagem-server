import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { War, Nation } from "@/api/entities";
import { Swords, Check, X, Hourglass } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WarManagementPanel({ onUpdate = () => {} }) {
    const [wars, setWars] = useState([]);
    const [allNations, setAllNations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState(null);
    const [isProcessing, setIsProcessing] = useState({});

    useEffect(() => {
        loadWars();
    }, []);

    const loadWars = async () => {
        setIsLoading(true);
        try {
            const [warsData, nationsData] = await Promise.all([
                War.list('-created_date'),
                Nation.list()
            ]);
            setWars(warsData);
            setAllNations(nationsData);
            console.log('WarManagementPanel: Loaded wars:', warsData.length, 'nations:', nationsData.length);
        } catch (error) {
            console.error("Failed to load wars:", error);
            setFeedback({ type: 'error', message: 'Failed to load wars.' });
        }
        setIsLoading(false);
    };
    
    const checkAndLiftBlockade = async (nationId) => {
        try {
            const otherWarsAsDefender = await War.filter({ status: 'active', defender_nation_id: nationId });
            const isStillBlockaded = otherWarsAsDefender.some(w => w.blockade_details?.is_active);

            if (!isStillBlockaded) {
                try {
                    const nation = await Nation.get(nationId);
                    if (nation) {
                        await Nation.update(nationId, { is_blockaded: false });
                    }
                } catch (nationError) {
                    console.warn(`Nation ${nationId} not found when trying to lift blockade:`, nationError);
                }
            }
        } catch (error) {
            console.error("Error checking blockade status:", error);
        }
    };

    const safelyUpdateNation = async (nationId, updateData, context = "update") => {
        try {
            const nation = await Nation.get(nationId);
            if (nation) {
                await Nation.update(nationId, updateData);
                return true;
            } else {
                console.warn(`Nation ${nationId} not found during ${context} - skipping update`);
                return false;
            }
        } catch (error) {
            console.warn(`Failed to ${context} nation ${nationId}:`, error);
            return false;
        }
    };

    const handleEndWar = async (war, newStatus) => {
        if (!newStatus) return;
        
        console.log(`Attempting to end war ${war.id} as ${newStatus}`);
        setIsProcessing(prev => ({ ...prev, [war.id]: true }));
        
        try {
            if (war.blockade_details?.is_active) {
                const blockadedNationId = war.attacker_nation_id === war.blockade_details.blockading_nation_id 
                    ? war.defender_nation_id 
                    : war.attacker_nation_id;
                await checkAndLiftBlockade(blockadedNationId);
            }
            
            await War.update(war.id, { 
                status: newStatus, 
                end_date: new Date().toISOString(), 
                blockade_details: { is_active: false, blockading_nation_id: null } 
            });
            
            if (newStatus === 'attacker_victory' || newStatus === 'defender_victory') {
                try {
                    const { applyWarConclusionLoot } = await import('@/api/functions/applyWarConclusionLoot');
                    await applyWarConclusionLoot({ warId: war.id });
                } catch (lootError) {
                    console.error("Failed to apply war conclusion loot:", lootError);
                }
            }

            await Promise.all([
                safelyUpdateNation(war.attacker_nation_id, { action_points: 5 }, "reset action points for attacker"),
                safelyUpdateNation(war.defender_nation_id, { action_points: 5 }, "reset action points for defender")
            ]);
            
            setFeedback({ type: 'success', message: `War ended as ${newStatus.replace('_', ' ')}` });
            loadWars();
            onUpdate();
            
        } catch (error) {
            console.error(`Failed to end war ${war.id}:`, error);
            setFeedback({ 
                type: 'error', 
                message: `Failed to end war: ${error.message}` 
            });
        } finally {
            setIsProcessing(prev => ({ ...prev, [war.id]: false }));
        }
    };

    const getNationName = (id) => {
        const nation = allNations.find(n => n.id === id);
        return nation?.name || 'Unknown Nation';
    };

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Swords className="w-5 h-5 text-red-400" />
                    War Management
                </CardTitle>
                <CardDescription>View and manage all ongoing and past conflicts.</CardDescription>
            </CardHeader>
            <CardContent>
                {feedback && (
                    <div className={`p-3 rounded-lg text-sm mb-4 ${
                        feedback.type === 'success' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                        {feedback.message}
                    </div>
                )}
                
                <div className="space-y-4">
                    {isLoading ? (
                        <p className="text-slate-400">Loading wars...</p>
                    ) : wars.length === 0 ? (
                        <p className="text-slate-400">No wars found.</p>
                    ) : (
                        wars.map(war => (
                            <div key={war.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                                <div className="flex-1 mb-4 md:mb-0">
                                    <h4 className="font-bold text-white">{war.war_name || 'Unnamed War'}</h4>
                                    <p className="text-sm text-slate-300">
                                        {getNationName(war.attacker_nation_id)} vs {getNationName(war.defender_nation_id)}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Status: <span className="font-medium capitalize">{war.status.replace('_', ' ')}</span>
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Tactical Points: A:{war.attacker_tactical_points || 0} | D:{war.defender_tactical_points || 0}
                                    </p>
                                    {war.blockade_details?.is_active && (
                                        <p className="text-xs text-red-400">Blockade Active</p>
                                    )}
                                </div>
                                
                                {war.status === 'Active' && (
                                    <div className="flex items-center gap-2">
                                        <Select 
                                            onValueChange={(value) => handleEndWar(war, value)}
                                            disabled={isProcessing[war.id]}
                                        >
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder={
                                                    isProcessing[war.id] ? "Processing..." : "End War As..."
                                                } />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="attacker_victory">Attacker Victory</SelectItem>
                                                <SelectItem value="defender_victory">Defender Victory</SelectItem>
                                                <SelectItem value="ceasefire">Ceasefire</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
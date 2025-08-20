import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Swords, Shield, Trophy, ShieldOff, Handshake, Eye } from "lucide-react";

export default function WarArchives({ wars, myNation, allNations, onViewReport }) {
    
    const getOpponent = (war) => {
        const opponentId = war.attacker_nation_id === myNation.id ? war.defender_nation_id : war.attacker_nation_id;
        return allNations.find(n => n.id === opponentId);
    };

    const getWarResult = (war) => {
        if (war.status === 'ceasefire') {
            return { text: 'Ceasefire', icon: Handshake, color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
        }
        const iAmWinner = 
            (war.status === 'attacker_victory' && war.attacker_nation_id === myNation.id) ||
            (war.status === 'defender_victory' && war.defender_nation_id === myNation.id);
        
        if (iAmWinner) {
            return { text: 'Victory', icon: Trophy, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
        }
        return { text: 'Defeat', icon: ShieldOff, color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    };

    if (!wars || wars.length === 0) {
        return (
            <div className="text-center py-16">
                <History className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">No War History</h3>
                <p className="text-slate-400">Your nation has not yet concluded any wars.</p>
            </div>
        );
    }
    
    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-400" />
                    War Archives
                </CardTitle>
                <CardDescription>Review the history of your nation's past conflicts.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-4">
                        {wars.map(war => {
                            const opponent = getOpponent(war);
                            const result = getWarResult(war);
                            const ResultIcon = result.icon;

                            return (
                                <div key={war.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-lg font-bold text-white">{war.war_name}</h4>
                                            <Badge variant="outline" className={result.color}>
                                                <ResultIcon className="w-4 h-4 mr-2" />
                                                {result.text}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            vs. {opponent?.name || 'Unknown Nation'}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Concluded on: {new Date(war.updated_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Button variant="outline" onClick={() => onViewReport(war)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Report
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

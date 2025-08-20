import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Swords, Shield, Target, Clock } from "lucide-react";

export default function WarSelector({ wars, selectedWarId, onSelectWar, myNationId, allNations }) {
    if (!wars || wars.length === 0) {
        return null;
    }

    const getOpponentNation = (war) => {
        const opponentId = war.attacker_nation_id === myNationId ? 
            war.defender_nation_id : war.attacker_nation_id;
        return allNations.find(n => n.id === opponentId);
    };

    const getWarRole = (war) => {
        return war.attacker_nation_id === myNationId ? 'Attacking' : 'Defending';
    };

    const getResistanceStatus = (war) => {
        const isAttacker = war.attacker_nation_id === myNationId;
        const opponentResistance = isAttacker ? 
            war.defender_resistance_points : war.attacker_resistance_points;
        const startingResistance = war.starting_resistance || 100; // Use 100 as default
        
        const currentResistance = opponentResistance ?? startingResistance;

        return {
            current: currentResistance,
            percentage: Math.max(0, (currentResistance / startingResistance) * 100)
        };
    };

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-red-400" />
                    Active Conflicts ({wars.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wars.map((war) => {
                        const opponent = getOpponentNation(war);
                        const role = getWarRole(war);
                        const resistance = getResistanceStatus(war);
                        const isSelected = selectedWarId === war.id;
                        
                        return (
                            <div
                                key={war.id}
                                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                                    isSelected 
                                        ? 'bg-red-500/20 border-red-500/50' 
                                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                                }`}
                                onClick={() => onSelectWar(war.id)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-white font-bold text-lg">
                                            {war.war_name || `War vs ${opponent?.name || 'Unknown'}`}
                                        </h3>
                                        <p className="text-slate-400 text-sm">
                                            vs {opponent?.name || 'Unknown Nation'}
                                        </p>
                                    </div>
                                    <Badge 
                                        variant="outline" 
                                        className={`${
                                            role === 'Attacking' 
                                                ? 'border-red-500/50 text-red-300' 
                                                : 'border-blue-500/50 text-blue-300'
                                        }`}
                                    >
                                        {role === 'Attacking' ? (
                                            <><Swords className="w-3 h-3 mr-1" /> Attacking</>
                                        ) : (
                                            <><Shield className="w-3 h-3 mr-1" /> Defending</>
                                        )}
                                    </Badge>
                                </div>
                                
                                <div className="space-y-2 mb-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Enemy Resistance:</span>
                                        <span className="text-white font-mono">
                                            {resistance.current.toFixed(1)} ({resistance.percentage.toFixed(0)}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-600 rounded-full h-2">
                                        <div 
                                            className="bg-red-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${resistance.percentage}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Clock className="w-3 h-3" />
                                        {war.total_battles || 0} battles
                                    </div>
                                    {isSelected && (
                                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                            Selected
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

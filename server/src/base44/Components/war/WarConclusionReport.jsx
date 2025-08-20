import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Trophy, 
  Shield, 
  Skull,
  X,
  Scroll,
  Sword,
  Swords
} from "lucide-react";

export default function WarConclusionReport({ war, myNation, opponentNation, onClose }) {
  if (!war || !myNation) return null;

  const isVictory = (war.status === 'attacker_victory' && war.attacker_nation_id === myNation.id) ||
                   (war.status === 'defender_victory' && war.defender_nation_id === myNation.id);
  
  // Helper to determine if my nation was the attacker or defender
  const isMyNationAttacker = war.attacker_nation_id === myNation.id;

  // Helper functions based on new outline requirements
  const getStatusIcon = (status) => {
    const isAttackerVictory = status === 'attacker_victory';
    const isDefenderVictory = status === 'defender_victory';

    if ((isAttackerVictory && isMyNationAttacker) || (isDefenderVictory && !isMyNationAttacker)) {
        return <Trophy className="w-6 h-6 text-amber-400" />;
    } else if ((isDefenderVictory && isMyNationAttacker) || (isAttackerVictory && !isMyNationAttacker)) {
        return <Skull className="w-6 h-6 text-red-400" />;
    } else {
        // Handle cases like 'stalemate' or 'white_peace' if applicable
        return <Swords className="w-6 h-6 text-slate-400" />;
    }
  };

  const getStatusTitle = (status) => {
    const isAttackerVictory = status === 'attacker_victory';
    const isDefenderVictory = status === 'defender_victory';

    if ((isAttackerVictory && isMyNationAttacker) || (isDefenderVictory && !isMyNationAttacker)) {
        return 'VICTORY!';
    } else if ((isDefenderVictory && isMyNationAttacker) || (isAttackerVictory && !isMyNationAttacker)) {
        return 'DEFEAT';
    } else if (status === 'stalemate') {
        return 'STALEMATE';
    } else if (status === 'white_peace') {
        return 'WHITE PEACE';
    }
    return 'WAR CONCLUDED';
  };

  const getWarDuration = () => {
    const warDurationDays = war.end_date && war.start_date ? 
      Math.ceil((new Date(war.end_date) - new Date(war.start_date)) / (1000 * 60 * 60 * 24)) : 0;
    
    if (warDurationDays > 0) {
      return `${warDurationDays} day${warDurationDays !== 1 ? 's' : ''}`;
    }
    return 'Less than 1 day';
  };

  const hasResourceLoot = () => {
    return war.war_conclusion_loot?.resources_looted && 
           Object.values(war.war_conclusion_loot.resources_looted).some(amount => amount > 0);
  };

  const getStatusMessage = () => {
    const commonPrefix = "The conflict between ";
    const myNationName = myNation.name;
    const opponentNationName = opponentNation?.name || 'Unknown Nation';

    let attackerName = war.attacker_nation_id === myNation.id ? myNationName : opponentNationName;
    let defenderName = war.defender_nation_id === myNation.id ? myNationName : opponentNationName;
    
    if (war.status === 'attacker_victory') {
        return `${commonPrefix}${attackerName} and ${defenderName} has concluded with a decisive victory for the attacker.`;
    } else if (war.status === 'defender_victory') {
        return `${commonPrefix}${attackerName} and ${defenderName} has concluded with a decisive victory for the defender.`;
    } else if (status === 'stalemate') {
        return `${commonPrefix}${attackerName} and ${defenderName} has ended in a stalemate. Neither side gained significant ground.`;
    } else if (status === 'white_peace') {
        return `${commonPrefix}${attackerName} and ${defenderName} has concluded in a white peace, with no territory or resources changing hands.`;
    }
    return 'The war has concluded.';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-800/95 border-amber-500/50 shadow-2xl glow-effect max-w-2xl w-full max-h-screen overflow-y-auto">
        <CardHeader className="border-b border-amber-500/30 bg-gradient-to-r from-amber-900/30 to-red-900/30 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                {getStatusIcon(war.status)}
                {getStatusTitle(war.status)}
              </CardTitle>
              <p className="text-slate-300 text-lg">{war.war_name || 'Unnamed Conflict'}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* War Summary */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Scroll className="w-5 h-5 text-blue-400" />
              War Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Duration:</span>
                <span className="text-white ml-2 font-medium">{getWarDuration()}</span>
              </div>
              <div>
                <span className="text-slate-400">Total Battles:</span>
                <span className="text-white ml-2 font-medium">{war.total_battles || 0}</span>
              </div>
              <div className="col-span-1 md:col-span-2">
                <span className="text-slate-400">Final Resistance:</span>
                <span className="text-white ml-2 font-medium">
                  Attacker: {war.attacker_resistance_points || 0} | Defender: {war.defender_resistance_points || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                <Sword className="w-4 h-4" />
                Attacker
              </h4>
              <p className="text-white font-medium">
                {myNation?.id === war.attacker_nation_id ? myNation.name : opponentNation?.name || 'Unknown'}
              </p>
              <p className="text-slate-400 text-sm">
                Casualties: {(war.total_casualties_attacker || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Defender
              </h4>
              <p className="text-white font-medium">
                {myNation?.id === war.defender_nation_id ? myNation.name : opponentNation?.name || 'Unknown'}
              </p>
              <p className="text-slate-400 text-sm">
                Casualties: {(war.total_casualties_defender || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* War Spoils */}
          {war.war_conclusion_loot && (war.war_conclusion_loot.cash_looted > 0 || war.war_conclusion_loot.alliance_cash_looted > 0 || hasResourceLoot()) && (
            <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-lg p-4">
              <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                War Spoils
              </h3>
              <div className="space-y-3">
                {war.war_conclusion_loot.cash_looted > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Cash Looted:</span>
                    <span className="text-green-400 font-bold">
                      ${(war.war_conclusion_loot.cash_looted).toLocaleString()}
                    </span>
                  </div>
                )}
                
                {war.war_conclusion_loot.alliance_cash_looted > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Alliance Funds Looted:</span>
                    <span className="text-purple-400 font-bold">
                      ${(war.war_conclusion_loot.alliance_cash_looted).toLocaleString()}
                    </span>
                  </div>
                )}

                {hasResourceLoot() && (
                  <div>
                    <span className="text-slate-300 block mb-2">Resources Looted:</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(war.war_conclusion_loot.resources_looted || {}).map(([resource, amount]) => (
                        amount > 0 && (
                          <div key={resource} className="flex justify-between text-sm">
                            <span className="text-slate-400 capitalize">{resource}:</span>
                            <span className="text-blue-400 font-medium">{amount.toLocaleString()}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status-specific message */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-slate-300 text-center">
              {getStatusMessage()}
            </p>
          </div>

          {/* Close Button */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={onClose}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-2"
            >
              Close Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

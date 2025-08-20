
import React, { useState, useEffect } from 'react';
import { BattleLog as BattleLogEntity } from "@/api/entities";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Swords,
  Plane, // Used in getAttackTypeIcon
  Ship,  // Used in getAttackTypeIcon
  Bomb,  // Used in getAttackTypeIcon
  ShieldBan, // Used in getAttackTypeIcon
  TrendingDown,
  BarChart,
  Dices,
  Users,
  Coins,
  Loader2,
  Atom, // For Nuclear Fallout Report
  Skull, // For Casualties/Nuclear Fallout
  HeartCrack, // For Nuclear Fallout (happiness lost)
  Building2, // For Nuclear Fallout (damages)
  Building, // For infrastructure destroyed
  Zap,      // For infrastructure slots destroyed
  Target,   // For roll
  Clock,    // For timestamp
} from "lucide-react";
import { format } from 'date-fns';

// Helper function to get attack type icon
const getAttackTypeIcon = (attackType) => {
  const icons = {
    ground_battle: Swords,
    air_strike: Plane,
    naval_battle: Ship,
    bombardment: Bomb,
    nuclear_strike: ShieldBan
  };
  return icons[attackType] || Swords;
};

// Helper function for the new badge style
// This returns class strings directly, as Badge component's 'variant' prop typically maps to predefined shadcn variants.
const getOutcomeBadgeClass = (outcome) => {
  if (outcome?.includes('Triumph') || outcome?.includes('Success')) return 'bg-green-600/20 text-green-400 border-green-500';
  if (outcome?.includes('Victory')) return 'bg-green-500/20 text-green-300 border-green-400';
  if (outcome?.includes('Stalemate')) return 'bg-yellow-600/20 text-yellow-400 border-yellow-500';
  if (outcome?.includes('Failure') || outcome?.includes('Defeat')) return 'bg-red-600/20 text-red-400 border-red-500';
  return 'bg-slate-600/20 text-slate-400 border-slate-500';
};

export default function BattleLog({ warId }) {
  const [battleLogs, setBattleLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBattleLogs();
  }, [warId]);

  const loadBattleLogs = async () => {
    if (!warId) {
        setBattleLogs([]);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    try {
      const logs = await BattleLogEntity.filter({ war_id: warId }, '-created_date');
      setBattleLogs(logs || []);
    } catch (error) {
      console.error('Error loading battle logs:', error);
      setBattleLogs([]);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/80 border-slate-700 h-full flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <p className="text-slate-400 mt-4">Loading battle logs...</p>
      </Card>
    );
  }

  if (!battleLogs || battleLogs.length === 0) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-400" />
            Battle Logs
          </CardTitle>
          <CardDescription className="text-slate-400">A chronological record of all engagements in this war.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Swords className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No battles have occurred yet.</p>
            <p className="text-sm text-slate-500 mt-2">Battle reports will appear here as the conflict unfolds.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/80 border-slate-700 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Swords className="w-5 h-5 text-amber-400" />
          Battle Logs
        </CardTitle>
        <CardDescription className="text-slate-400">A chronological record of all engagements in this war.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-6 pr-4">
            {battleLogs.map((battle, index) => {
              const attackerName = battle.attacker_name || 'Unknown';
              const defenderName = battle.defender_name || 'Unknown';
              const outcomeClass = getOutcomeBadgeClass(battle.outcome);

              return (
                <Card key={battle.id || battle.battle_number || index} className="bg-slate-900/50 border border-slate-700 backdrop-blur-sm shadow-lg overflow-hidden">
                  <CardHeader className="p-4 bg-slate-900/50 border-b border-slate-700">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-slate-700/80 text-slate-300">Battle #{battle.battle_number}</Badge>
                        <p className="text-xs text-slate-400">
                          <Clock className="w-3 h-3 inline-block mr-1.5" />
                          {battle.timestamp ? format(new Date(battle.timestamp), 'PPpp') : 'N/A'}
                        </p>
                      </div>
                      <Badge className={`text-sm px-3 py-1 ${outcomeClass}`}>{battle.outcome}</Badge>
                    </div>
                    <CardTitle className="text-lg text-white mt-3 flex items-center gap-2">
                      {React.createElement(getAttackTypeIcon(battle.attack_type), { className: "w-6 h-6 text-amber-400" })}
                      <span className="text-amber-400 font-bold">{attackerName}</span> launched <span className="text-blue-400">{battle.attack_type?.replace(/_/g, ' ')}</span> against <span className="text-red-400 font-bold">{defenderName}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-slate-700/40 p-3 rounded-lg">
                        <div className="text-slate-400 mb-1 flex items-center gap-1"><BarChart className="w-4 h-4" /> Power Ratio</div>
                        <div className="text-white font-mono">{battle.attacker_power?.toLocaleString()} vs {battle.defender_power?.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-700/40 p-3 rounded-lg">
                        <div className="text-slate-400 mb-1 flex items-center gap-1"><Dices className="w-4 h-4" /> Roll</div>
                        <div className="text-white font-mono">{battle.final_roll} (Base: {battle.base_roll || 'N/A'})</div>
                      </div>
                      {battle.resistance_damage > 0 && (
                        <div className="bg-slate-700/40 p-3 rounded-lg">
                          <div className="text-slate-400 mb-1 flex items-center gap-1"><TrendingDown className="w-4 h-4 text-red-400" /> Resistance Dmg</div>
                          <div className="text-red-400 font-bold">-{battle.resistance_damage}</div>
                        </div>
                      )}
                      {battle.civilian_casualties > 0 && (
                        <div className="bg-slate-700/40 p-3 rounded-lg">
                          <div className="text-slate-400 mb-1 flex items-center gap-1"><Skull className="w-4 h-4" /> Casualties</div>
                          <div className="text-white font-mono">{battle.civilian_casualties?.toLocaleString()}</div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      {(battle.infrastructure_value_destroyed > 0 || (battle.infrastructure_destroyed && battle.infrastructure_destroyed.slots_destroyed > 0)) && (
                        <div className="flex items-center gap-2 text-yellow-400">
                          <Building className="w-4 h-4" />
                          <span>${battle.infrastructure_value_destroyed?.toLocaleString()} infrastructure value destroyed</span>
                        </div>
                      )}
                      {(battle.infrastructure_destroyed && battle.infrastructure_destroyed.slots_destroyed > 0) && (
                        <div className="flex items-center gap-2 text-yellow-400">
                          <Zap className="w-4 h-4" />
                          <span>{battle.infrastructure_destroyed.slots_destroyed} infrastructure slots destroyed</span>
                        </div>
                      )}

                      {battle.attack_type === 'nuclear_strike' && battle.detailed_city_impact && battle.detailed_city_impact.length > 0 && (
                        <div className="mt-4 border-t border-red-500/30 pt-4 bg-red-900/20 p-4 rounded-lg">
                          <h4 className="text-md font-semibold text-red-300 mb-3 flex items-center gap-2">
                            <Atom className="w-5 h-5" />
                            Nuclear Fallout Report
                          </h4>
                          <div className="space-y-4">
                            {battle.detailed_city_impact.map((impact, cityIndex) => (
                              <div key={cityIndex} className="p-3 bg-slate-800/50 rounded-md border border-slate-700">
                                <h5 className="font-bold text-amber-400">{impact.city_name}</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-xs">
                                  <div className="flex items-center gap-1.5 text-red-400">
                                    <Skull className="w-3 h-3" />
                                    <span>{impact.population_lost?.toLocaleString()} casualties</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-purple-400">
                                    <HeartCrack className="w-3 h-3" />
                                    <span>-{impact.happiness_lost} happiness</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-orange-400">
                                    <Building2 className="w-3 h-3" />
                                    <span>${impact.infrastructure_value_destroyed?.toLocaleString()} in damages</span>
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <p className="text-xs text-slate-400 mb-1">Infrastructure Destroyed:</p>
                                  {Object.keys(impact.infrastructure_destroyed_details || {}).length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(impact.infrastructure_destroyed_details).map(([key, value]) => (
                                        <Badge key={key} variant="destructive" className="bg-red-800/80 text-red-200">
                                          {key.replace(/_/g, ' ')}: -{value}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500">No specific infrastructure was itemized.</p>
                                  )}
                                </div>
                                {impact.status_change_to_ruined && (
                                  <Badge className="mt-3 bg-yellow-600/50 text-yellow-200 border-yellow-500/50">
                                    City has fallen into a RUINED state
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {battle.loot_gained > 0 && (
                          <div className="flex items-center gap-2 text-green-400">
                              <Coins className="w-4 h-4" />
                              <span>${battle.loot_gained.toLocaleString()} cash looted from treasury</span>
                          </div>
                      )}
                    </div>

                    {(battle.ammo_consumed > 0 || battle.gasoline_consumed > 0) && (
                      <div className="mt-3 p-2 bg-slate-800/50 rounded text-xs">
                        <div className="text-slate-400 mb-1">Resources Consumed:</div>
                        <div className="flex gap-4">
                          {battle.ammo_consumed > 0 && (
                            <span className="text-amber-400">
                              Ammo: {battle.ammo_consumed?.toLocaleString()}
                            </span>
                          )}
                          {battle.gasoline_consumed > 0 && (
                            <span className="text-blue-400">
                              Gasoline: {battle.gasoline_consumed?.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {battle.attacker_losses && Object.keys(battle.attacker_losses).length > 0 && (
                        <div>
                          <h4 className="font-semibold text-white mb-2">Attacker Losses</h4>
                          <div className="space-y-1 text-sm">
                            {Object.entries(battle.attacker_losses).map(([unit, count]) => (
                              count > 0 && (
                                <div key={unit} className="flex justify-between items-center text-red-400">
                                  <span>{unit.charAt(0).toUpperCase() + unit.slice(1)}</span>
                                  <span>- {count.toLocaleString()}</span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}

                      {battle.defender_losses && Object.keys(battle.defender_losses).length > 0 && (
                        <div>
                          <h4 className="font-semibold text-white mb-2">Defender Losses</h4>
                          <div className="space-y-1 text-sm">
                            {Object.entries(battle.defender_losses).map(([unit, count]) => (
                              count > 0 && (
                                <div key={unit} className="flex justify-between items-center text-red-400">
                                  <span>{unit.charAt(0).toUpperCase() + unit.slice(1)}</span>
                                  <span>- {count.toLocaleString()}</span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

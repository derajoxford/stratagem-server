
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { 
    Skull, 
    Zap, 
    Users, 
    DollarSign,
    Droplets,
    Fuel
} from 'lucide-react';

export default function BattleReport({ battle }) {
    if (!battle) return null;

    const getOutcomeColor = (outcome) => {
        const lowerOutcome = outcome.toLowerCase();
        if (lowerOutcome.includes('victory') || lowerOutcome.includes('effective') || lowerOutcome.includes('devastating')) {
            return 'bg-green-500/20 text-green-400 border-green-500/30';
        }
        if (lowerOutcome.includes('defeat') || lowerOutcome.includes('failed') || lowerOutcome.includes('routed')) {
            return 'bg-red-500/20 text-red-400 border-red-500/30';
        }
        if (lowerOutcome.includes('stalemate') || lowerOutcome.includes('withdrawal')) {
            return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        }
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true 
        });
    };

    const attackerLosses = battle.attacker_losses || {};
    const defenderLosses = battle.defender_losses || {};

    return (
        <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            {/* Battle Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                        Battle #{battle.battle_number}
                    </Badge>
                    <span className="text-slate-400 text-sm">{formatTime(battle.timestamp)}</span>
                </div>
                <Badge className={getOutcomeColor(battle.outcome)}>
                    {battle.outcome}
                </Badge>
            </div>

            {/* Attack Description */}
            <div className="mb-4">
                <p className="text-slate-300">
                    <span className="text-amber-400 font-medium">{battle.attacker_name}</span>
                    <span className="mx-2">launched</span>
                    <span className="text-blue-400 font-medium capitalize">
                        {battle.attack_type?.replace('_', ' ')}
                    </span>
                    <span className="mx-2">against</span>
                    <span className="text-slate-300 font-medium">{battle.defender_name}</span>
                </p>
            </div>

            {/* Power and Roll */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                    <div className="text-slate-400 text-sm">Power</div>
                    <div className="text-white font-medium">
                        {battle.attacker_power?.toLocaleString()} vs {battle.defender_power?.toLocaleString()}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-slate-400 text-sm">Roll</div>
                    <div className="text-white font-medium">{battle.final_roll}</div>
                </div>
            </div>

            {/* Resistance Damage */}
            <div className="text-base text-red-400 mb-3">
                -{battle.resistance_damage} resistance
            </div>

            {/* Damage Details */}
            {battle.civilian_casualties > 0 && (
                <div className="flex items-center gap-2 text-slate-300 text-sm mb-2">
                    <Skull className="w-4 h-4" />
                    <span>{battle.civilian_casualties?.toLocaleString()} civilian casualties</span>
                </div>
            )}

            {battle.infrastructure_value_destroyed > 0 && (
                <>
                    <div className="flex items-center gap-2 text-amber-400 text-sm mb-2">
                        <DollarSign className="w-4 h-4" />
                        <span>${battle.infrastructure_value_destroyed?.toLocaleString()} infrastructure value destroyed</span>
                    </div>
                    {battle.infrastructure_destroyed?.slots_destroyed > 0 && (
                        <div className="flex items-center gap-2 text-yellow-400">
                            <Zap className="w-4 h-4" />
                            <span>{battle.infrastructure_destroyed.slots_destroyed} infrastructure destroyed</span>
                        </div>
                    )}
                </>
            )}

            {/* Resources Consumed */}
            {(battle.ammo_consumed > 0 || battle.gasoline_consumed > 0) && (
                <div className="text-slate-400 text-sm mb-3">
                    Resources Consumed: 
                    {battle.ammo_consumed > 0 && (
                        <span className="text-orange-400 ml-2">Ammo: {battle.ammo_consumed?.toLocaleString()}</span>
                    )}
                    {battle.gasoline_consumed > 0 && (
                        <span className="text-blue-400 ml-2">Gasoline: {battle.gasoline_consumed?.toLocaleString()}</span>
                    )}
                </div>
            )}

            {/* Loot - Always show, even if zero */}
            <div className="text-base text-green-400 mb-3">
                💰 +${(battle.loot_gained || 0).toLocaleString()} looted
            </div>

            {/* Losses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="text-slate-400 text-sm mb-2">Attacker Losses:</h4>
                    {Object.keys(attackerLosses).length > 0 ? (
                        Object.entries(attackerLosses).map(([unitType, count]) => (
                            <div key={unitType} className="flex items-center gap-2 text-red-400 text-sm">
                                <Users className="w-4 h-4" />
                                <span>{count?.toLocaleString()} {unitType}</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-slate-500 text-sm">No losses</div>
                    )}
                </div>
                <div>
                    <h4 className="text-slate-400 text-sm mb-2">Defender Losses:</h4>
                    {Object.keys(defenderLosses).length > 0 ? (
                        Object.entries(defenderLosses).map(([unitType, count]) => (
                            <div key={unitType} className="flex items-center gap-2 text-red-400 text-sm">
                                <Users className="w-4 h-4" />
                                <span>{count?.toLocaleString()} {unitType}</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-slate-500 text-sm">No losses</div>
                    )}
                </div>
            </div>
        </div>
    );
}

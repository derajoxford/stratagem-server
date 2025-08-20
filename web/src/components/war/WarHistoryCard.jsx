
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BattleLog } from '@/api/entities';
import { 
  ChevronDown, 
  ChevronRight, 
  Trophy, 
  Shield, 
  Swords, 
  Calendar,
  Clock,
  Users as UsersIcon,
  Target,
  Coins,
  Package,
  Skull,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { createPageUrl } from '@/utils';

export default function WarHistoryCard({ war, myNation, allNations }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [battleLogs, setBattleLogs] = useState([]);
    const [isLoadingBattles, setIsLoadingBattles] = useState(false);

    const attackerNation = allNations.find(n => n.id === war.attacker_nation_id);
    const defenderNation = allNations.find(n => n.id === war.defender_nation_id);
    const isAttacker = war.attacker_nation_id === myNation.id;
    const opponentNation = isAttacker ? defenderNation : attackerNation;

    // Derived properties for display in new layout
    const attackerName = attackerNation?.name || 'Unknown Attacker';
    const defenderName = defenderNation?.name || 'Unknown Defender';
    const attackerAlliance = attackerNation?.alliance; 
    const defenderAlliance = defenderNation?.alliance;

    const getOutcomeInfo = () => {
        switch (war.status) {
            case 'attacker_victory':
                return {
                    label: isAttacker ? 'Victory' : 'Defeat',
                    color: isAttacker ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50',
                    icon: isAttacker ? Trophy : Skull
                };
            case 'defender_victory':
                return {
                    label: !isAttacker ? 'Victory' : 'Defeat',
                    color: !isAttacker ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50',
                    icon: !isAttacker ? Trophy : Skull
                };
            case 'peace_treaty':
                return {
                    label: 'Peace Treaty',
                    color: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
                    icon: UsersIcon
                };
            case 'ceasefire':
                return {
                    label: 'Ceasefire',
                    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
                    icon: Shield
                };
            case 'stalemate':
                return {
                    label: 'Stalemate',
                    color: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
                    icon: Target
                };
            default:
                return {
                    label: 'Unknown',
                    color: 'bg-slate-500/20 text-slate-400 border-slate-500/50',
                    icon: Target
                };
        }
    };

    const calculateDuration = () => {
        if (!war.start_date || !war.end_date) return 'Unknown';
        
        const start = new Date(war.start_date);
        const end = new Date(war.end_date);
        const diffInMs = end - start;
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        const diffInHours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffInMinutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffInDays > 0) {
            return `${diffInDays}d ${diffInHours}h ${diffInMinutes}m`;
        } else if (diffInHours > 0) {
            return `${diffInHours}h ${diffInMinutes}m`;
        } else {
            return `${diffInMinutes}m`;
        }
    };

    const getCasualties = () => {
        const myLosses = isAttacker ? war.total_casualties_attacker || 0 : war.total_casualties_defender || 0;
        const enemyLosses = isAttacker ? war.total_casualties_defender || 0 : war.total_casualties_attacker || 0;
        return { myLosses, enemyLosses };
    };

    const getLootInfo = () => {
        if (!war.war_conclusion_loot) {
            return null;
        }

        const loot = war.war_conclusion_loot;
        const isVictorious = (isAttacker && war.status === 'attacker_victory') || 
                           (!isAttacker && war.status === 'defender_victory');
        
        if (!isVictorious) return null;

        const hasLoot = (loot.cash_looted && loot.cash_looted > 0) || 
                       (loot.resources_looted && Object.keys(loot.resources_looted).length > 0);

        if (!hasLoot) return null;

        return {
            cash: loot.cash_looted || 0,
            resources: loot.resources_looted || {},
            allianceCash: loot.alliance_cash_looted || 0
        };
    };

    const loadBattleLogs = async () => {
        if (battleLogs.length > 0) return; // Already loaded
        
        setIsLoadingBattles(true);
        try {
            const logs = await BattleLog.filter({ war_id: war.id });
            logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            setBattleLogs(logs);
        } catch (error) {
            console.error('Error loading battle logs:', error);
        } finally {
            setIsLoadingBattles(false);
        }
    };

    const handleExpandToggle = async () => {
        if (!isExpanded) {
            await loadBattleLogs();
        }
        setIsExpanded(!isExpanded);
    };

    const outcome = getOutcomeInfo();
    const OutcomeIcon = outcome.icon;
    const casualties = getCasualties(); // Still used for myLosses/enemyLosses labels if needed, but primary display is now in 3-column layout
    const lootInfo = getLootInfo();
    const duration = calculateDuration();

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm overflow-hidden hover:bg-slate-800/90 transition-all duration-200">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Swords className="w-5 h-5 text-red-400" />
                            <CardTitle className="text-white text-lg">
                                {war.war_name || `War ${war.id?.slice(-8) || 'Unknown'}`}
                            </CardTitle>
                        </div>
                        <span className="text-slate-400 text-sm">
                            {myNation.name} vs {opponentNation?.name || 'Unknown Nation'}
                        </span>
                    </div>
                    <Badge className={outcome.color}>
                        <OutcomeIcon className="w-4 h-4 mr-1" />
                        {outcome.label}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6"> {/* Updated class and added spacing */}
                {/* Attacker / Outcome / Defender Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    {/* Attacker */}
                    <div className="flex flex-col items-center text-center">
                        <p className="text-xs text-red-400 uppercase font-semibold tracking-wider mb-2">Attacker</p>
                        <a href={createPageUrl(`PublicNationProfile?nationId=${war.attacker_nation_id}`)} target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-white hover:underline">{attackerName}</a>
                        {attackerAlliance && <p className="text-sm text-slate-400">{attackerAlliance.name}</p>}
                        <div className="mt-2 text-red-400 text-sm">
                            <span className="font-semibold">{war.total_casualties_attacker?.toLocaleString() || 0}</span> casualties
                        </div>
                    </div>

                    {/* Outcome Details in the center */}
                    <div className="flex flex-col items-center justify-center">
                        <OutcomeIcon className="w-8 h-8 text-white mb-2" />
                        <p className="text-xl font-bold text-white leading-tight">{outcome.label}</p>
                        {war.total_battles > 0 && (
                            <p className="text-slate-400 text-sm mt-2">
                                <Target className="w-3 h-3 inline-block mr-1" />
                                {war.total_battles} Battles
                            </p>
                        )}
                        <p className="text-slate-400 text-sm">
                            <Calendar className="w-3 h-3 inline-block mr-1" />
                            {war.end_date ? format(new Date(war.end_date), 'MMM d, yyyy') : 'Still Ongoing?'}
                        </p>
                        {war.end_date && ( // Only show duration if war has ended
                            <p className="text-slate-400 text-sm">
                                <Clock className="w-3 h-3 inline-block mr-1" />
                                {duration} Total
                            </p>
                        )}
                    </div>

                    {/* Defender */}
                    <div className="flex flex-col items-center text-center">
                        <p className="text-xs text-blue-400 uppercase font-semibold tracking-wider mb-2">Defender</p>
                         <a href={createPageUrl(`PublicNationProfile?nationId=${war.defender_nation_id}`)} target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-white hover:underline">{defenderName}</a>
                        {defenderAlliance && <p className="text-sm text-slate-400">{defenderAlliance.name}</p>}
                        <div className="mt-2 text-blue-400 text-sm">
                            <span className="font-semibold">{war.total_casualties_defender?.toLocaleString() || 0}</span> casualties
                        </div>
                    </div>
                </div>

                {/* Spoils of War - existing section */}
                {lootInfo && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-3">
                            <Trophy className="w-4 h-4" />
                            Spoils of War
                        </div>
                        <div className="space-y-2 text-sm">
                            {lootInfo.cash > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Cash Looted:</span>
                                    <span className="text-green-400 font-medium flex items-center gap-1">
                                        <Coins className="w-4 h-4" />
                                        ${lootInfo.cash.toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {lootInfo.allianceCash > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Alliance Funds Seized:</span>
                                    <span className="text-green-400 font-medium flex items-center gap-1">
                                        <Coins className="w-4 h-4" />
                                        ${lootInfo.allianceCash.toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {Object.keys(lootInfo.resources).length > 0 && (
                                <div>
                                    <span className="text-slate-400 block mb-2">Resources Seized:</span>
                                    <div className="grid grid-cols-2 gap-1 ml-4">
                                        {Object.entries(lootInfo.resources).map(([resource, amount]) => (
                                            <div key={resource} className="flex justify-between text-xs">
                                                <span className="text-slate-500 capitalize">{resource.replace('_', ' ')}:</span>
                                                <span className="text-green-400 font-medium flex items-center gap-1">
                                                    <Package className="w-3 h-3" />
                                                    {amount.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Battle History Toggle - existing section */}
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                    <CollapsibleTrigger asChild>
                        <Button
                            variant="ghost"
                            className="w-full justify-between hover:bg-slate-700/50"
                            onClick={handleExpandToggle}
                        >
                            <span className="flex items-center gap-2">
                                <Swords className="w-4 h-4" />
                                Battle History ({war.total_battles || 0} battles)
                            </span>
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-2 mt-4">
                        {isLoadingBattles ? (
                            <div className="flex items-center justify-center py-8 text-slate-400">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Loading battle history...
                            </div>
                        ) : battleLogs.length > 0 ? (
                            <div className="space-y-3">
                                {battleLogs.map((battle, index) => (
                                    <div key={battle.id} className="bg-slate-700/30 rounded-lg p-3 text-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-amber-400 font-medium">
                                                Battle #{battle.battle_number} - {battle.attack_type.replace('_', ' ')}
                                            </span>
                                            <span className="text-slate-400 text-xs">
                                                {format(new Date(battle.timestamp), 'MMM d, HH:mm')}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-slate-400">Outcome:</span>
                                                <span className="text-white ml-2">{battle.outcome}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">Resistance Damage:</span>
                                                <span className="text-red-400 ml-2 font-medium">{battle.resistance_damage}</span>
                                            </div>
                                            {battle.loot_gained > 0 && (
                                                <div className="col-span-2">
                                                    <span className="text-slate-400">Loot Gained:</span>
                                                    <span className="text-green-400 ml-2 font-medium">${battle.loot_gained.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                No battle records found for this war.
                            </div>
                        )}
                    </CollapsibleContent>
                </Collapsible>
            </CardContent>
        </Card>
    );
}

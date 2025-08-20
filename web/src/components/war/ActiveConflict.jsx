
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from '@/components/ui/progress';
import {
    Swords, Users, Crosshair, AlertTriangle, Info, Loader2, Send, Zap,
    Plane, Ship, Bomb, Atom, Target, Shield, HelpCircle, Building2, CheckCircle,
    Droplets, Shell, User // <-- Add User for profile placeholders
} from "lucide-react";
import CeasefireNotification from './CeasefireNotification';
import ProposeCeasefireModal from './ProposeceaseFireModal';
import { respondToCeasefireProposal } from '@/api/functions';
import { proposeCeasefire } from '@/api/functions';
import { BattleLog } from '@/api/entities';
import { initiateBattleV2 } from '@/api/functions';
import BattleReport from './BattleReport';
import { Link } from "react-router-dom"; // Add Link import
import { createPageUrl } from "@/utils"; // Add createPageUrl import

const attackTypeOptions = [
    { id: 'ground_battle', name: 'Ground Battle', icon: Users },
    { id: 'air_strike', name: 'Air Strike', icon: Plane },
    { id: 'naval_battle', name: 'Naval Battle', icon: Ship },
    { id: 'bombardment', name: 'Bombardment', icon: Bomb },
    { id: 'nuclear_strike', name: 'Nuclear Strike', icon: Atom }
];

const targetOptions = {
    air_strike: [
        { id: 'aircraft', name: 'Aircraft', icon: Plane },
        { id: 'tanks', name: 'Tanks', icon: Target },
        { id: 'warships', name: 'Warships', icon: Ship },
        { id: 'military_sites', name: 'Military Sites', icon: Building2 }
    ],
    naval_battle: [
        { id: 'naval_fleet', name: 'Naval Fleet', icon: Ship },
        { id: 'city_infrastructure', name: 'City Infrastructure', icon: Building2 },
        { id: 'aircraft', name: 'Aircraft', icon: Plane },
        { id: 'army_bases', name: 'Army Bases', icon: Shield }
    ]
};

export default function ActiveConflict({
    war,
    myNation,
    myMilitary,
    allNations,
    allMilitaries,
    allResources,
    gameConfig,
    ceasefireProposals = [],
    onUpdate,
    onBattleComplete,
    onWarDataUpdate
}) {
    if (!war || !myNation || !myNation.id) {
        return (
            <Card className="bg-slate-800/80 border-slate-700">
                <CardContent className="p-8 text-center">
                    <p className="text-slate-400">Unable to load conflict data. Please refresh the page.</p>
                </CardContent>
            </Card>
        );
    }

    // New: Handle war concluded state
    if (war.status === 'concluded') {
        const winningNation = allNations?.find(n => n.id === war.winner_nation_id);
        const conclusionMessage = {
            'attacker_victory': `${war.attacker_nation_name} achieved a decisive victory!`,
            'defender_victory': `${war.defender_nation_name} successfully defended their nation!`,
            'ceasefire': 'A ceasefire has been agreed upon, ending the conflict.',
            'surrender': `${war.surrenderer_nation_name} surrendered to ${war.winner_nation_name}.`,
            'nation_eliminated': `${war.eliminated_nation_name} has been eliminated from the conflict.`
        }[war.conclusion_type] || 'The war has concluded.';

        return (
            <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-green-400 flex items-center justify-center gap-2">
                        <CheckCircle className="w-6 h-6" />
                        War Concluded!
                    </CardTitle>
                    <CardDescription className="text-center text-slate-300">
                        The conflict between {war.attacker_nation_name} and {war.defender_nation_name} has ended.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 text-center space-y-4">
                    <p className="text-lg text-slate-200 font-semibold">{conclusionMessage}</p>
                    {war.winner_nation_id && (
                        <p className="text-md text-slate-300">
                            <span className="font-bold text-amber-300">{winningNation?.name || 'Unknown Nation'}</span> is victorious!
                        </p>
                    )}
                    <p className="text-sm text-slate-400 italic">Reason: {war.concluded_reason || 'N/A'}</p>
                    <Button onClick={onWarDataUpdate} className="mt-4 bg-green-600 hover:bg-green-700">
                        Acknowledge and Return
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const isAttacker = myNation.id === war.attacker_nation_id;
    const opponentNationId = isAttacker ? war.defender_nation_id : war.attacker_nation_id;
    const opponentNation = allNations?.find(n => n.id === opponentNationId);

    // Derive attacker and defender nation objects for display
    const attackerNation = allNations?.find(n => n.id === war.attacker_nation_id);
    const defenderNation = allNations?.find(n => n.id === war.defender_nation_id);

    const [selectedAttackType, setSelectedAttackType] = useState('ground_battle');
    const [unitsToCommit, setUnitsToCommit] = useState({});
    const [selectedTarget, setSelectedTarget] = useState(''); // FIX: Changed initial state from null to empty string
    const [isSubmitting, setIsSubmitting] = useState(false); // Replaces isProcessing
    const [error, setError] = useState(null); // Replaces feedback for general errors
    const [recentBattleLogs, setRecentBattleLogs] = useState([]);
    const [isBattleHistoryLoading, setIsBattleHistoryLoading] = useState(true);

    // Ceasefire states
    const [showCeasefireModal, setShowCeasefireModal] = useState(false);
    const [isProposingCeasefire, setIsProposingCeasefire] = useState(false);
    const [isRespondingToCeasefire, setIsRespondingToCeasefire] = useState(false);

    // New battle report states
    const [lastBattleReport, setLastBattleReport] = useState(null);
    const [showBattleReport, setShowBattleReport] = useState(false);

    const relevantProposal = ceasefireProposals.find(p => p.war_id === war.id && p.status === 'pending');
    const isProposer = relevantProposal && relevantProposal.proposer_nation_id === myNation.id;
    const isRecipient = relevantProposal && relevantProposal.recipient_nation_id === myNation.id;

    // NEW: Find nation's resources and calculate requirements
    const myResources = allResources.find(r => r.nation_id === myNation.id);

    const { requiredAmmo, requiredGasoline } = useMemo(() => {
        if (!gameConfig?.war_settings?.ammo_consumption_rates || !gameConfig?.war_settings?.gasoline_consumption_rates) {
            return { requiredAmmo: 0, requiredGasoline: 0 };
        }
        const ammoRates = gameConfig.war_settings.ammo_consumption_rates;
        const gasRates = gameConfig.war_settings.gasoline_consumption_rates;

        const ammo = Math.ceil(
            (unitsToCommit.soldiers || 0) * (ammoRates.soldiers || 0) +
            (unitsToCommit.tanks || 0) * (ammoRates.tanks || 0) +
            (unitsToCommit.aircraft || 0) * (ammoRates.aircraft || 0) +
            (unitsToCommit.warships || 0) * (ammoRates.warships || 0)
        );

        const gasoline = Math.ceil(
            (unitsToCommit.soldiers || 0) * (gasRates.soldiers || 0) +
            (unitsToCommit.tanks || 0) * (gasRates.tanks || 0) +
            (unitsToCommit.aircraft || 0) * (gasRates.aircraft || 0) +
            (unitsToCommit.warships || 0) * (gasRates.warships || 0)
        );

        return { requiredAmmo: ammo, requiredGasoline: gasoline };
    }, [unitsToCommit, gameConfig]);
    
    const hasEnoughResources = myResources && myResources.ammo >= requiredAmmo && myResources.gasoline >= requiredGasoline;


    const myTacticalPoints = isAttacker ? war.attacker_tactical_points : war.defender_tactical_points;
    const enemyResistance = isAttacker ? war.defender_resistance_points : war.attacker_resistance_points;
    const maxTacticalPoints = gameConfig?.war_settings?.max_tactical_points || 10;
    const startingResistance = war.starting_resistance || 100;

    const actionPointCosts = gameConfig?.war_settings?.action_point_costs || {
        ground_battle: 1, air_strike: 2, naval_battle: 2, bombardment: 3, nuclear_strike: 5
    };

    const attackCost = actionPointCosts[selectedAttackType] || 1;
    const canAffordAttack = myTacticalPoints >= attackCost;

    const isMyTurn = useMemo(() => {
        // Placeholder for turn logic, will be implemented fully later if needed.
        // For now, assume it's always "my turn" for interaction purposes
        // or that turn logic is handled externally before this component renders.
        return true; 
    }, [/* add dependencies for turn logic here, e.g., war.current_turn_nation_id, myNation.id */]);

    // Load battle history
    const loadBattleHistory = useCallback(async () => {
        if (!war?.id) return;
        setIsBattleHistoryLoading(true);
        try {
            const battles = await BattleLog.filter({ war_id: war.id }, '-battle_number', 10);
            setRecentBattleLogs(battles || []);
        } catch (error) {
            console.error('Failed to load battle history:', error);
        } finally {
            setIsBattleHistoryLoading(false);
        }
    }, [war?.id]);

    useEffect(() => {
        loadBattleHistory();
    }, [loadBattleHistory]);

    // Reset units and target when attack type changes
    useEffect(() => {
        setUnitsToCommit({});
        setSelectedTarget(targetOptions[selectedAttackType]?.[0]?.id || ''); // FIX: Changed fallback from null to empty string
    }, [selectedAttackType]);

    const handleUnitCommitmentChange = (unitType, value) => {
        const numValue = parseInt(value) || 0;
        const maxAvailable = myMilitary?.[unitType] || 0;
        const clampedValue = Math.min(Math.max(0, numValue), maxAvailable);
        
        setUnitsToCommit(prev => ({
            ...prev,
            [unitType]: clampedValue
        }));
    };

    const handleMaxUnits = (unitType) => {
        const maxAvailable = myMilitary?.[unitType] || 0;
        
        if (selectedAttackType === 'bombardment') {
            setUnitsToCommit(prev => ({ ...prev, [unitType]: Math.min(1, maxAvailable) }));
        } else if (selectedAttackType === 'nuclear_strike') {
            setUnitsToCommit(prev => ({ ...prev, [unitType]: Math.min(1, maxAvailable) }));
        } else {
            setUnitsToCommit(prev => ({ ...prev, [unitType]: maxAvailable }));
        }
    };

    // New battle initiation function, replaces initiateBattleFrontend
    const handleAttack = async (attackType, committedUnits) => {
        setError(null);
        setLastBattleReport(null);
        setShowBattleReport(false);

        if (Object.values(committedUnits).every(val => val === 0)) {
            setError("You must commit at least one unit to attack.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await initiateBattleV2({
                war_id: war.id,
                attack_type: attackType,
                units_committed: committedUnits,
                selected_target: selectedTarget || "" // FIX: Added fallback to ensure no null is sent
            });
            
            if (response.data.success) {
                setLastBattleReport(response.data.battleLog);
                setShowBattleReport(true);
                onBattleComplete();
            } else {
                setError(response.data.error || "An unknown error occurred during the battle.");
            }
        } catch (err) {
            console.error("Failed to initiate battle:", err);
            setError(err.message || "A network error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
            onUpdate();
        }
    };

    const handleCeasefireProposal = async (message) => {
        setIsProposingCeasefire(true);
        try {
            const result = await proposeCeasefire({ war_id: war.id, message });
            if (result.data?.success) {
                setError({ type: 'success', message: 'Ceasefire proposal sent successfully.' }); // Using error state for success too for consistency
                if (onUpdate) onUpdate();
            } else {
                setError({ type: 'error', message: result.data?.error || 'Failed to send ceasefire proposal.' });
            }
        } catch (error) {
            setError({ type: 'error', message: `Error: ${error.message}` });
        } finally {
            setIsProposingCeasefire(false);
            setShowCeasefireModal(false);
        }
    };

    const handleCeasefireResponse = async (accept) => {
        if (!relevantProposal) return;
        setIsRespondingToCeasefire(true);
        try {
            const result = await respondToCeasefireProposal({
                proposal_id: relevantProposal.id,
                accept: accept
            });
            if (result.data?.success) {
                setError({ // Using error state for success too for consistency
                    type: 'success',
                    message: accept ? 'Ceasefire accepted. War ended.' : 'Ceasefire proposal rejected.'
                });
                if (onUpdate) onUpdate();
                if (onWarDataUpdate) onWarDataUpdate();
            } else {
                setError({ type: 'error', message: result.data?.error || 'Failed to respond to ceasefire.' });
            }
        } catch (error) {
            setError({ type: 'error', message: `Error: ${error.message}` });
        } finally {
            setIsRespondingToCeasefire(false);
        }
    };

    const getAttackTypeDisplayName = (attackType) => {
        const typeMap = {
            ground_battle: 'Ground Battle',
            air_strike: 'Air Strike', 
            naval_battle: 'Naval Battle',
            bombardment: 'Bombardment',
            nuclear_strike: 'Nuclear Strike'
        };
        return typeMap[attackType] || attackType;
    };

    const formatBattleTime = (timestamp) => {
        try {
            return new Date(timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit',
                hour12: true 
            });
        } catch (error) {
            return 'Unknown';
        }
    };

    const formatUnitName = (unitType) => {
        const unitNames = {
            'conventional_bombs': 'conventional bombs',
            'nuclear_weapons': 'nuclear weapons',
            'soldiers': 'soldiers',
            'tanks': 'tanks',
            'aircraft': 'aircraft',
            'warships': 'warships'
        };
        return unitNames[unitType] || unitType.replace(/_/g, ' ');
    };

    const getOutcomeColor = (outcome) => {
        if (!outcome || outcome === 'Unknown') return 'bg-slate-600';
        const lowerOutcome = outcome.toLowerCase();
        if (lowerOutcome.includes('victory') || lowerOutcome.includes('successful') || lowerOutcome.includes('effective') || lowerOutcome.includes('devastating')) {
            return 'bg-green-600';
        } else if (lowerOutcome.includes('stalemate') || lowerOutcome.includes('limited')) {
            return 'bg-yellow-600';
        } else if (lowerOutcome.includes('defeat') || lowerOutcome.includes('failure') || lowerOutcome.includes('failed') || lowerOutcome.includes('routed') || lowerOutcome.includes('malfunction')) {
            return 'bg-red-600';
        }
        return 'bg-slate-600';
    };

    const renderUnitCommitment = () => {
        switch (selectedAttackType) {
            case 'ground_battle':
                return (
                    <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <h3 className="text-white font-semibold">Commit Ground Units</h3>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-slate-400 text-sm">Soldiers to Commit (Max: {(myMilitary?.soldiers || 0).toLocaleString()})</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        max={myMilitary?.soldiers || 0}
                                        value={unitsToCommit.soldiers || 0}
                                        onChange={(e) => handleUnitCommitmentChange('soldiers', e.target.value)}
                                        className="bg-slate-700 border-slate-600"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => handleMaxUnits('soldiers')}
                                        className="border-slate-600"
                                    >
                                        Max
                                    </Button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-slate-400 text-sm">Tanks to Commit (Max: {(myMilitary?.tanks || 0).toLocaleString()})</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        max={myMilitary?.tanks || 0}
                                        value={unitsToCommit.tanks || 0}
                                        onChange={(e) => handleUnitCommitmentChange('tanks', e.target.value)}
                                        className="bg-slate-700 border-slate-600"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => handleMaxUnits('tanks')}
                                        className="border-slate-600"
                                    >
                                        Max
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'air_strike':
                return (
                    <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <h3 className="text-white font-semibold">Commit Aircraft</h3>
                        
                        <div>
                            <label className="text-slate-400 text-sm">Aircraft to Commit (Max: {(myMilitary?.aircraft || 0).toLocaleString()})</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    max={myMilitary?.aircraft || 0}
                                    value={unitsToCommit.aircraft || 0}
                                    onChange={(e) => handleUnitCommitmentChange('aircraft', e.target.value)}
                                    className="bg-slate-700 border-slate-600"
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => handleMaxUnits('aircraft')}
                                    className="border-slate-600"
                                >
                                    Max
                                </Button>
                            </div>
                        </div>

                        <div>
                            <label className="text-slate-400 text-sm mb-2 block">Primary Target</label>
                            <div className="grid grid-cols-2 gap-2">
                                {targetOptions.air_strike.map(target => (
                                    <Button
                                        key={target.id}
                                        variant={selectedTarget === target.id ? "default" : "outline"}
                                        onClick={() => setSelectedTarget(target.id)}
                                        className={`justify-start ${
                                            selectedTarget === target.id 
                                                ? 'bg-blue-600 hover:bg-blue-700' 
                                                : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                                        }`}
                                    >
                                        <target.icon className="w-4 h-4 mr-2" />
                                        {target.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'naval_battle':
                return (
                    <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <h3 className="text-white font-semibold">Commit Warships</h3>
                        
                        <div>
                            <label className="text-slate-400 text-sm">Warships to Commit (Max: {(myMilitary?.warships || 0).toLocaleString()})</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    max={myMilitary?.warships || 0}
                                    value={unitsToCommit.warships || 0}
                                    onChange={(e) => handleUnitCommitmentChange('warships', e.target.value)}
                                    className="bg-slate-700 border-slate-600"
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => handleMaxUnits('warships')}
                                    className="border-slate-600"
                                >
                                    Max
                                </Button>
                            </div>
                        </div>

                        <div>
                            <label className="text-slate-400 text-sm mb-2 block">Primary Target</label>
                            <div className="grid grid-cols-2 gap-2">
                                {targetOptions.naval_battle.map(target => (
                                    <Button
                                        key={target.id}
                                        variant={selectedTarget === target.id ? "default" : "outline"}
                                        onClick={() => setSelectedTarget(target.id)}
                                        className={`justify-start ${
                                            selectedTarget === target.id 
                                                ? 'bg-cyan-600 hover:bg-cyan-700' 
                                                : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                                        }`}
                                    >
                                        <target.icon className="w-4 h-4 mr-2" />
                                        {target.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'bombardment':
                return (
                    <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <h3 className="text-white font-semibold">Commit Conventional Bombs</h3>
                        
                        <div>
                            <label className="text-slate-400 text-sm">Bombs to use</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    max="1"
                                    value={unitsToCommit.conventional_bombs || 0}
                                    onChange={(e) => handleUnitCommitmentChange('conventional_bombs', e.target.value)}
                                    className="bg-slate-700 border-slate-600"
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => handleMaxUnits('conventional_bombs')}
                                    className="border-slate-600"
                                >
                                    Max (1)
                                </Button>
                            </div>
                            <p className="text-slate-400 text-sm mt-2">
                                You have {myMilitary?.conventional_bombs || 0} bombs available. Only one can be used per strike.
                            </p>
                        </div>
                    </div>
                );

            case 'nuclear_strike':
                return (
                    <div className="p-4 bg-red-900/20 rounded-lg border border-red-500/50">
                        <div className="flex items-center gap-2 text-red-400 mb-3">
                            <AlertTriangle className="w-5 h-5" />
                            <h3 className="font-semibold">Nuclear Strike Warning!</h3>
                        </div>
                        <p className="text-red-300 mb-4">
                            Launching a nuclear strike will have devastating consequences. This action is irreversible. You have {myMilitary?.nuclear_weapons || 0} available.
                        </p>
                        <Button
                            onClick={() => setUnitsToCommit({ nuclear_weapons: 1 })}
                            className="w-full bg-red-600 hover:bg-red-700"
                        >
                            <Atom className="w-4 h-4 mr-2" />
                            Commit 1 Nuclear Weapon
                        </Button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* War Header */}
            <div className="flex items-center justify-between p-4 bg-slate-800/80 rounded-lg border border-slate-700">
                <div>
                    <h2 className="text-xl font-bold text-amber-400">{myNation.name}</h2>
                    <p className="text-sm text-slate-400">{isAttacker ? 'Attacker' : 'Defender'}</p>
                </div>
                <div className="flex items-center gap-4">
                    <Swords className="w-6 h-6 text-red-400" />
                    <Badge variant="destructive" className="bg-red-600 text-white">
                        ACTIVE
                    </Badge>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-blue-400">{opponentNation?.name || 'Unknown'}</h2>
                    <p className="text-sm text-slate-400">{isAttacker ? 'Defender' : 'Attacker'}</p>
                </div>
            </div>

            {/* Main content: Strategic Operations card and Battle Log card */}
            <div className="flex flex-col gap-6">
                {/* Strategic Operations - Full Width */}
                <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-amber-400 text-lg">Strategic Operations</CardTitle>
                            <Badge className="bg-red-600 text-white">WAR</Badge>
                        </div>
                        <CardDescription>Direct your forces and execute tactical maneuvers against {opponentNation?.name}.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6"> {/* Updated className to 'p-6' */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            {/* Attacker Info */}
                            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 space-y-4">
                                <div className="flex items-center gap-3">
                                    {attackerNation?.profile_image_url ? (
                                        <img src={attackerNation.profile_image_url} alt="Attacker" className="w-12 h-12 rounded-md object-cover"/>
                                    ) : (
                                        <div className="w-12 h-12 rounded-md bg-slate-700 flex items-center justify-center">
                                            <User className="w-6 h-6 text-red-400" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-red-400 font-semibold">ATTACKER</p>
                                        <a href={createPageUrl(`PublicNationProfile?nationId=${attackerNation?.id}`)} target="_blank" rel="noopener noreferrer" className="text-xl font-bold text-white hover:underline">
                                            {attackerNation?.name || 'Unknown'}
                                        </a>
                                    </div>
                                </div>
                                {/* Original Attacker/Defender text based on myNation */}
                                <p className="text-sm text-slate-400">War Status: {war.attacker_nation_id === myNation.id ? 'Your Nation' : 'Opponent Nation'}</p>
                            </div>

                            {/* Defender Info */}
                            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 space-y-4">
                                <div className="flex items-center gap-3">
                                    {defenderNation?.profile_image_url ? (
                                        <img src={defenderNation.profile_image_url} alt="Defender" className="w-12 h-12 rounded-md object-cover"/>
                                    ) : (
                                        <div className="w-12 h-12 rounded-md bg-slate-700 flex items-center justify-center">
                                            <User className="w-6 h-6 text-blue-400" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-blue-400 font-semibold">DEFENDER</p>
                                         <a href={createPageUrl(`PublicNationProfile?nationId=${defenderNation?.id}`)} target="_blank" rel="noopener noreferrer" className="text-xl font-bold text-white hover:underline">
                                            {defenderNation?.name || 'Unknown'}
                                        </a>
                                    </div>
                                </div>
                                {/* Original Attacker/Defender text based on myNation */}
                                <p className="text-sm text-slate-400">War Status: {war.defender_nation_id === myNation.id ? 'Your Nation' : 'Opponent Nation'}</p>
                            </div>
                        </div>

                        {/* Your Tactical Points */}
                        <div className="space-y-3 mt-6"> {/* Added margin top for spacing */}
                            <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                                <Zap className="w-5 h-5" />
                                Your Tactical Points (This War)
                            </h3>
                            <div className="bg-slate-700/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                                            <Zap className="w-4 h-4 text-slate-900" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400">Tactical Energy</p>
                                            <p className="text-xs text-slate-500">Command capacity available</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-amber-400">
                                            {myTacticalPoints}<span className="text-lg text-slate-400">/{maxTacticalPoints}</span>
                                        </p>
                                        <p className="text-xs text-slate-400">Action Points</p>
                                    </div>
                                </div>
                                <Progress value={(myTacticalPoints / maxTacticalPoints) * 100} className="h-2 mb-4" />
                                {myTacticalPoints < maxTacticalPoints && (
                                    <div className="text-center">
                                        <p className="text-sm text-amber-400">⚡ {maxTacticalPoints - myTacticalPoints} energy needed for maximum capacity</p>
                                        <p className="text-xs text-slate-400">{myTacticalPoints} / {maxTacticalPoints} points available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Enemy Resistance */}
                        <div className="space-y-3 mt-6"> {/* Added margin top for spacing */}
                            <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Enemy Resistance
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Resistance Points:</span>
                                    <span className="text-white font-bold">{enemyResistance.toFixed(1)}/{startingResistance}</span>
                                </div>
                                <Progress value={(enemyResistance / startingResistance) * 100} className="h-3" />
                                <p className="text-xs text-slate-400">Reduce enemy resistance to 0 to achieve victory</p>
                            </div>
                        </div>

                        {/* Launch Strike */}
                        <div className="space-y-4 mt-6"> {/* Added margin top for spacing */}
                            <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                                <Target className="w-5 h-5" />
                                Launch Strike Against {opponentNation?.name || 'Enemy'}
                            </h3>

                            <div>
                                <p className="text-slate-300 mb-3">Select Operation Type</p>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                                    {attackTypeOptions.filter(type => type.id !== 'nuclear_strike').map(type => (
                                        <Button
                                            key={type.id}
                                            variant={selectedAttackType === type.id ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setSelectedAttackType(type.id)}
                                            className={`h-auto p-3 flex flex-col items-center gap-1 ${
                                                selectedAttackType === type.id 
                                                    ? 'bg-amber-600 hover:bg-amber-700 border-amber-500' 
                                                    : 'bg-slate-800/50 border-slate-600 hover:bg-slate-700/50'
                                            }`}
                                        >
                                            <type.icon className="w-4 h-4" />
                                            <span className="text-xs">{type.name}</span>
                                        </Button>
                                    ))}
                                </div>

                                {/* Nuclear Strike Section */}
                                {(myMilitary?.nuclear_weapons > 0) && (
                                    <div className="mt-4">
                                        <Button
                                            variant={selectedAttackType === 'nuclear_strike' ? "default" : "outline"}
                                            size="lg"
                                            onClick={() => setSelectedAttackType('nuclear_strike')}
                                            className={`w-full mb-4 ${
                                                selectedAttackType === 'nuclear_strike'
                                                    ? 'bg-orange-600 hover:bg-orange-700 border-orange-500'
                                                    : 'bg-slate-800/50 border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
                                            }`}
                                        >
                                            <Atom className="w-5 h-5 mr-2" />
                                            Nuclear Strike
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Unit Commitment Interface */}
                            {renderUnitCommitment()}

                            {/* NEW: Resource Cost Display */}
                            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 space-y-2">
                                <h4 className="text-slate-300 font-semibold">Strike Cost</h4>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-yellow-400">
                                        <Shell className="w-4 h-4"/>
                                        <span>Ammunition</span>
                                    </div>
                                    <span className={myResources?.ammo < requiredAmmo ? 'text-red-400' : 'text-slate-200'}>
                                        {requiredAmmo.toLocaleString()} / {(myResources?.ammo || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-blue-400">
                                        <Droplets className="w-4 h-4"/>
                                        <span>Gasoline</span>
                                    </div>
                                    <span className={myResources?.gasoline < requiredGasoline ? 'text-red-400' : 'text-slate-200'}>
                                        {requiredGasoline.toLocaleString()} / {(myResources?.gasoline || 0).toLocaleString()}
                                    </span>

                                </div>
                            </div>

                            <Button
                                onClick={() => handleAttack(selectedAttackType, unitsToCommit)}
                                disabled={!canAffordAttack || isSubmitting || !isMyTurn || !hasEnoughResources}
                                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed"
                                size="lg"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Executing Strike...
                                    </>
                                ) : (
                                    <>
                                        <Target className="w-5 h-5 mr-2" />
                                        Launch {attackTypeOptions.find(t => t.id === selectedAttackType)?.name} (Cost: {attackCost} AP)
                                    </>
                                )}
                            </Button>

                            {!hasEnoughResources && (
                                <p className="text-sm text-red-400 text-center">
                                    Insufficient resources to launch strike.
                                </p>
                            )}

                            {!canAffordAttack && (
                                <p className="text-sm text-red-400 text-center">
                                    Insufficient tactical points. Need {attackCost} AP, have {myTacticalPoints} AP.
                                </p>
                            )}
                            {!isMyTurn && (
                                <p className="text-sm text-yellow-400 text-center">
                                    It's not your turn to initiate an attack.
                                </p>
                            )}
                        </div>

                        {/* Diplomatic Options */}
                        <div className="space-y-4 pt-4 border-t border-slate-700 mt-6"> {/* Added margin top for spacing */}
                            <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                                <HelpCircle className="w-5 h-5" />
                                Diplomatic Options
                            </h3>
                            <p className="text-sm text-slate-400">End this conflict through diplomatic means.</p>

                            {isRecipient && (
                                <CeasefireNotification
                                    proposal={relevantProposal}
                                    onRespond={handleCeasefireResponse}
                                    isResponding={isRespondingToCeasefire}
                                />
                            )}

                            {!relevantProposal && (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCeasefireModal(true)}
                                    disabled={isProposingCeasefire}
                                    className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                >
                                    {isProposingCeasefire ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Sending Proposal...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Propose Ceasefire
                                        </>
                                    )}
                                </Button>
                            )}

                            {isProposer && (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                    <p className="text-sm text-blue-300">
                                        Your ceasefire proposal is pending their response.
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Battle Log - Now Always Below Strategic Operations */}
                <Card className="bg-slate-800/80 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-blue-400 flex items-center gap-2">
                            <Target className="w-5 h-5" />
                            Battle Log
                        </CardTitle>
                        <CardDescription>Recent combat engagements in this war.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isBattleHistoryLoading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                            </div>
                        ) : recentBattleLogs.length === 0 ? (
                            <p className="text-slate-400 text-center py-4">No battles recorded yet.</p>
                        ) : (
                            recentBattleLogs.map((battle) => {
                                const attackerName = battle.attacker_name || 'Unknown';
                                const defenderName = battle.defender_name || 'Unknown';
                                const isMyBattle = battle.attacker_nation_id === myNation.id;
                                
                                // Ensure losses objects are always defined for rendering
                                const attackerLosses = battle.attacker_losses || {};
                                const defenderLosses = battle.defender_losses || {};

                                return (
                                    <div key={battle.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                                        {/* Header line with Battle#, Time, and Outcome */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <Badge className="text-sm px-2 py-1 bg-slate-600">
                                                    Battle #{battle.battle_number}
                                                </Badge>
                                                <span className="text-sm text-slate-400">
                                                    {formatBattleTime(battle.timestamp)}
                                                </span>
                                            </div>
                                            <Badge className={`text-sm px-2 py-1 ${getOutcomeColor(battle.outcome)}`}>
                                                {battle.outcome || 'Unknown'}
                                            </Badge>
                                        </div>
                                        
                                        {/* Attack description */}
                                        <div className="text-base mb-3">
                                            <span className={isMyBattle ? 'text-amber-400 font-medium' : 'text-slate-300'}>
                                                {attackerName}
                                            </span>
                                            <span className="text-slate-400 mx-2">launched</span>
                                            <span className="text-blue-400 font-medium">
                                                {getAttackTypeDisplayName(battle.attack_type)}
                                            </span>
                                            <span className="text-slate-400 mx-2">against</span>
                                            <span className={!isMyBattle ? 'text-amber-400 font-medium' : 'text-slate-300'}>
                                                {defenderName}
                                            </span>
                                        </div>

                                        {/* Power and Roll */}
                                        <div className="text-sm text-slate-400 mb-3">
                                            Power: {battle.attacker_power?.toLocaleString() || 'N/A'} vs {battle.defender_power?.toLocaleString() || 'N/A'}
                                            <span className="ml-4">Roll: {battle.final_roll != null && !isNaN(battle.final_roll) ? Number(battle.final_roll).toFixed(0) : 'N/A'}</span>
                                        </div>

                                        {/* Resistance Damage */}
                                        <div className="text-base mb-3">
                                            <span className="text-red-400 font-medium">
                                                -{battle.resistance_damage || 0} resistance
                                            </span>
                                        </div>

                                        {/* Damage Details - For all attack types */}
                                        <div className="space-y-2 mb-3">
                                            {battle.civilian_casualties > 0 && (
                                                <div className="text-base text-red-300">
                                                    💀 {battle.civilian_casualties.toLocaleString()} civilian casualties
                                                </div>
                                            )}
                                            {battle.infrastructure_value_destroyed > 0 && (
                                                <div className="text-base text-orange-300">
                                                    🏗️ ${battle.infrastructure_value_destroyed.toLocaleString()} infrastructure value destroyed
                                                </div>
                                            )}
                                            {battle.infrastructure_destroyed?.slots_destroyed > 0 && (
                                                <div className="text-base text-yellow-300">
                                                    ⚡ {battle.infrastructure_destroyed.slots_destroyed} infrastructure slots destroyed
                                                </div>
                                            )}
                                            {battle.infrastructure_destroyed?.buildings_destroyed && Object.keys(battle.infrastructure_destroyed.buildings_destroyed).length > 0 && (
                                                <div className="text-sm text-orange-400">
                                                    <p className="font-medium">Buildings Destroyed:</p>
                                                    <ul className="list-disc list-inside ml-4">
                                                        {Object.entries(battle.infrastructure_destroyed.buildings_destroyed)
                                                            .filter(([building, count]) => count > 0)
                                                            .map(([building, count]) => (
                                                                <li key={building}>{count} {building.replace(/_/g, ' ')}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Resources Consumed */}
                                        {(battle.ammo_consumed > 0 || battle.gasoline_consumed > 0) && (
                                            <div className="text-sm text-slate-400 mb-3">
                                                Resources Consumed:
                                                {battle.ammo_consumed > 0 && (
                                                    <span className="text-amber-400 ml-2">
                                                        Ammo: {battle.ammo_consumed.toLocaleString()}
                                                    </span>
                                                )}
                                                {battle.gasoline_consumed > 0 && (
                                                    <span className="text-amber-400 ml-2">
                                                        Gasoline: {battle.gasoline_consumed.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Loot */}
                                        {battle.loot_gained > 0 && (
                                            <div className="text-base text-green-400 mb-3">
                                                💰 +${battle.loot_gained.toLocaleString()} looted
                                            </div>
                                        )}

                                        {/* Losses - Side by Side Grid */}
                                        {(Object.keys(attackerLosses).length > 0 || Object.keys(defenderLosses).length > 0) && (
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-400 font-medium">Attacker Losses:</span>
                                                    {Object.keys(attackerLosses).length > 0 ? (
                                                        <div className="text-red-400 mt-1 space-y-1">
                                                            {Object.entries(attackerLosses)
                                                                .filter(([unit, count]) => count > 0)
                                                                .map(([unit, count]) => (
                                                                    <div key={unit} className="flex items-center gap-1">
                                                                        <span>🪖</span>
                                                                        <span>{count.toLocaleString()} {formatUnitName(unit)}</span>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-slate-500 mt-1">None</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 font-medium">Defender Losses:</span>
                                                    {Object.keys(defenderLosses).length > 0 ? (
                                                        <div className="text-red-400 mt-1 space-y-1">
                                                            {Object.entries(defenderLosses)
                                                                .filter(([unit, count]) => count > 0)
                                                                .map(([unit, count]) => (
                                                                    <div key={unit} className="flex items-center gap-1">
                                                                        <span>🪖</span>
                                                                        <span>{count.toLocaleString()} {formatUnitName(unit)}</span>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-slate-500 mt-1">None</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Error Messages */}
            {error && (
                <Alert className={`${error.type === 'success' ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                    <AlertDescription className={error.type === 'success' ? 'text-green-300' : 'text-red-300'}>
                        {error.message}
                    </AlertDescription>
                </Alert>
            )}

            {/* Modals */}
            <ProposeCeasefireModal
                isOpen={showCeasefireModal}
                onClose={() => setShowCeasefireModal(false)}
                onSubmit={handleCeasefireProposal}
                opponentName={opponentNation?.name}
                isSubmitting={isProposingCeasefire}
            />

            {/* Battle Report Modal */}
            {showBattleReport && lastBattleReport && (
                <BattleReport
                    battleLog={lastBattleReport}
                    onClose={() => { setShowBattleReport(false); loadBattleHistory(); }} // Reload history when closing report
                    myNationId={myNation.id}
                    allNations={allNations}
                />
            )}
        </div>
    );
}

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Target, Shield, Swords, Plane, Ship, Bomb, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import { InputField } from './shared/InputField';

export default function CombatSettings({ config, onUpdate }) {
    const [openCollapsibles, setOpenCollapsibles] = useState({});
    
    if (!config) return <div>Loading...</div>;

    const attackTypes = ['ground_battle', 'air_strike', 'naval_battle', 'bombardment', 'nuclear_strike'];
    
    const getDisplayName = (name) => {
        return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const toggleCollapsible = (key) => {
        setOpenCollapsibles(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    return (
        <div className="space-y-6">
            {/* REMOVED: Unit Combat Strengths - moved to BattleMechanicsSettings */}
            
            {/* REMOVED: Battle Success Levels - moved to BattleMechanicsSettings */}

            {/* REMOVED: Max Resistance Damage per Attack - moved to BattleMechanicsSettings */}

            {/* REMOVED: Per-Battle Loot Configuration - moved to BattleMechanicsSettings */}

            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Swords className="w-5 h-5 text-orange-400" />
                        Defender Loss Distribution
                    </CardTitle>
                    <CardDescription>
                        Configure how defender casualties are distributed across different unit types for each attack type.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {attackTypes.map(attackType => {
                        const lossDistribution = config.war_settings?.loss_distribution?.[attackType] || {};
                        const isOpen = openCollapsibles[`loss_${attackType}`];
                        
                        return (
                            <Collapsible key={attackType} open={isOpen} onOpenChange={() => toggleCollapsible(`loss_${attackType}`)}>
                                <CollapsibleTrigger asChild>
                                    <Button 
                                        variant="outline" 
                                        className="w-full flex justify-between bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                                    >
                                        <span>{getDisplayName(attackType)} Loss Distribution</span>
                                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-4 bg-slate-700/50 rounded-lg">
                                            <h4 className="text-white font-medium mb-3">Primary Targets (%)</h4>
                                            <div className="space-y-3">
                                                {Object.entries(lossDistribution.primary_targets || {}).map(([unitType, percentage]) => (
                                                    <InputField
                                                        key={unitType}
                                                        label={getDisplayName(unitType)}
                                                        name={`war_settings.loss_distribution.${attackType}.primary_targets.${unitType}`}
                                                        value={percentage}
                                                        onChange={onUpdate}
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-700/50 rounded-lg">
                                            <h4 className="text-white font-medium mb-3">Collateral Damage (%)</h4>
                                            <div className="space-y-3">
                                                {Object.entries(lossDistribution.collateral_damage || {}).map(([unitType, percentage]) => (
                                                    <InputField
                                                        key={unitType}
                                                        label={getDisplayName(unitType)}
                                                        name={`war_settings.loss_distribution.${attackType}.collateral_damage.${unitType}`}
                                                        value={percentage}
                                                        onChange={onUpdate}
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-2">
                                        Percentages should total 100% within each category. These determine which defender units are targeted by this attack type.
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    })}
                </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-red-400" />
                        Infrastructure & Civilian Impact
                    </CardTitle>
                    <CardDescription>
                        Configure infrastructure destruction and civilian casualty ranges for different attack types.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 bg-slate-700/50 rounded-lg">
                            <h4 className="text-white font-medium mb-4">Infrastructure Damage Ranges</h4>
                            <div className="space-y-4">
                                {attackTypes.map(attackType => (
                                    <div key={attackType} className="grid grid-cols-2 gap-3">
                                        <InputField
                                            label={`${getDisplayName(attackType)} Min`}
                                            name={`war_settings.damage_settings.infrastructure_damage_ranges.${attackType}.min`}
                                            value={config.war_settings?.damage_settings?.infrastructure_damage_ranges?.[attackType]?.min}
                                            onChange={onUpdate}
                                            type="number"
                                            min="0"
                                        />
                                        <InputField
                                            label={`${getDisplayName(attackType)} Max`}
                                            name={`war_settings.damage_settings.infrastructure_damage_ranges.${attackType}.max`}
                                            value={config.war_settings?.damage_settings?.infrastructure_damage_ranges?.[attackType]?.max}
                                            onChange={onUpdate}
                                            type="number"
                                            min="0"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-4 bg-slate-700/50 rounded-lg">
                            <h4 className="text-white font-medium mb-4">Civilian Casualty Ranges</h4>
                            <div className="space-y-4">
                                {attackTypes.map(attackType => (
                                    <div key={attackType} className="grid grid-cols-2 gap-3">
                                        <InputField
                                            label={`${getDisplayName(attackType)} Min`}
                                            name={`war_settings.damage_settings.civilian_casualty_ranges.${attackType}.min`}
                                            value={config.war_settings?.damage_settings?.civilian_casualty_ranges?.[attackType]?.min}
                                            onChange={onUpdate}
                                            type="number"
                                            min="0"
                                        />
                                        <InputField
                                            label={`${getDisplayName(attackType)} Max`}
                                            name={`war_settings.damage_settings.civilian_casualty_ranges.${attackType}.max`}
                                            value={config.war_settings?.damage_settings?.civilian_casualty_ranges?.[attackType]?.max}
                                            onChange={onUpdate}
                                            type="number"
                                            min="0"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

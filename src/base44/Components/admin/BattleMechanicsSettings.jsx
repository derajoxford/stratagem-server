
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Target, Shield, Swords, Plane, Ship, Bomb, Coins, ChevronDown, ChevronUp, Zap, Crosshair, AlertTriangle } from 'lucide-react';
import { InputField } from './shared/InputField';

export default function BattleMechanicsSettings({ config, onUpdate }) {
    const [openCollapsibles, setOpenCollapsibles] = useState({});
    
    if (!config) return <div>Loading...</div>;

    const unitTypes = ['soldiers', 'tanks', 'aircraft', 'warships', 'conventional_bombs', 'nuclear_weapons'];
    const attackTypes = ['ground_battle', 'air_strike', 'naval_battle', 'bombardment', 'nuclear_strike'];
    const unitTypesByAttack = {
        ground_battle: ['soldiers', 'tanks'],
        air_strike: ['aircraft'],
        naval_battle: ['warships'],
        bombardment: ['aircraft'],
        nuclear_strike: ['aircraft']
    };
    
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
        <div className="space-y-8">
            {/* Step 1: Unit Combat Strengths */}
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-red-400" />
                        Step 1: Unit Combat Strengths
                    </CardTitle>
                    <CardDescription>
                        Define the base power value of each military unit type. These values determine the total attacking and defending power in battles.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {unitTypes.map(unit => (
                        <InputField
                            key={unit}
                            label={getDisplayName(unit)}
                            name={`war_settings.unit_combat_strengths.${unit}`}
                            value={config.war_settings?.unit_combat_strengths?.[unit]}
                            onChange={onUpdate}
                            type="number"
                            min="0"
                            step="0.1"
                        />
                    ))}
                </CardContent>
            </Card>

            {/* Step 2: Battle Outcome Modifiers */}
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Crosshair className="w-5 h-5 text-purple-400" />
                        Step 2: Power Ratio Modifiers
                    </CardTitle>
                    <CardDescription>
                        Configure how power imbalances affect battle rolls for conventional battles (Ground, Air, Naval). 
                        Bombardments and Nuclear Strikes use pure random rolls and ignore these modifiers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                        <h4 className="text-blue-400 font-medium mb-2">How Power Ratio Modifiers Work</h4>
                        <p className="text-slate-300 text-sm mb-2">
                            For Ground Battles, Air Strikes, and Naval Battles, the system calculates a power ratio 
                            (Attacker Power ÷ Defender Power) and applies roll modifiers based on the ranges below:
                        </p>
                        <ul className="text-slate-400 text-xs space-y-1 ml-4">
                            <li>• Higher power ratios give positive roll modifiers (better outcomes)</li>
                            <li>• Lower power ratios give negative roll modifiers (worse outcomes)</li>
                            <li>• If defender has zero military power, attacker gets automatic decisive victory</li>
                            <li>• Bombardments and Nuclear Strikes ignore these modifiers (pure random)</li>
                        </ul>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-amber-400 font-medium">Power Ratio Ranges</h4>
                            <div className="space-y-3">
                                <div className="bg-slate-700/50 rounded-lg p-3">
                                    <div className="text-red-400 text-sm font-medium mb-1">Severely Outgunned (&lt; 0.3)</div>
                                    <InputField
                                        label="Roll Modifier"
                                        name="war_settings.power_ratio_modifiers.severely_outgunned"
                                        value={config.war_settings?.power_ratio_modifiers?.severely_outgunned ?? -25}
                                        onChange={onUpdate}
                                        description="Applied when attacker power is less than 30% of defender power"
                                        type="number"
                                    />
                                </div>
                                
                                <div className="bg-slate-700/50 rounded-lg p-3">
                                    <div className="text-orange-400 text-sm font-medium mb-1">Significantly Outgunned (0.3 - 0.6)</div>
                                    <InputField
                                        label="Roll Modifier"
                                        name="war_settings.power_ratio_modifiers.significantly_outgunned"
                                        value={config.war_settings?.power_ratio_modifiers?.significantly_outgunned ?? -15}
                                        onChange={onUpdate}
                                        description="Applied when attacker power is 30-60% of defender power"
                                        type="number"
                                    />
                                </div>
                                
                                <div className="bg-slate-700/50 rounded-lg p-3">
                                    <div className="text-yellow-400 text-sm font-medium mb-1">Slightly Outgunned (0.6 - 0.9)</div>
                                    <InputField
                                        label="Roll Modifier"
                                        name="war_settings.power_ratio_modifiers.slightly_outgunned"
                                        value={config.war_settings?.power_ratio_modifiers?.slightly_outgunned ?? -8}
                                        onChange={onUpdate}
                                        description="Applied when attacker power is 60-90% of defender power"
                                        type="number"
                                    />
                                </div>
                                
                                <div className="bg-slate-700/50 rounded-lg p-3">
                                    <div className="text-slate-400 text-sm font-medium mb-1">Even Match (0.9 - 1.1)</div>
                                    <InputField
                                        label="Roll Modifier"
                                        name="war_settings.power_ratio_modifiers.even_match"
                                        value={config.war_settings?.power_ratio_modifiers?.even_match ?? 0}
                                        onChange={onUpdate}
                                        description="Applied when powers are roughly equal"
                                        type="number"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <h4 className="text-green-400 font-medium">Advantage Ranges</h4>
                            <div className="space-y-3">
                                <div className="bg-slate-700/50 rounded-lg p-3">
                                    <div className="text-green-400 text-sm font-medium mb-1">Slight Advantage (1.1 - 2.0)</div>
                                    <InputField
                                        label="Roll Modifier"
                                        name="war_settings.power_ratio_modifiers.slight_advantage"
                                        value={config.war_settings?.power_ratio_modifiers?.slight_advantage ?? 8}
                                        onChange={onUpdate}
                                        description="Applied when attacker power is 110-200% of defender power"
                                        type="number"
                                    />
                                </div>
                                
                                <div className="bg-slate-700/50 rounded-lg p-3">
                                    <div className="text-green-300 text-sm font-medium mb-1">Significant Advantage (2.0 - 4.0)</div>
                                    <InputField
                                        label="Roll Modifier"
                                        name="war_settings.power_ratio_modifiers.significant_advantage"
                                        value={config.war_settings?.power_ratio_modifiers?.significant_advantage ?? 15}
                                        onChange={onUpdate}
                                        description="Applied when attacker power is 2-4x defender power"
                                        type="number"
                                    />
                                </div>
                                
                                <div className="bg-slate-700/50 rounded-lg p-3">
                                    <div className="text-green-200 text-sm font-medium mb-1">Overwhelming Advantage (≥ 4.0)</div>
                                    <InputField
                                        label="Roll Modifier"
                                        name="war_settings.power_ratio_modifiers.overwhelming_advantage"
                                        value={config.war_settings?.power_ratio_modifiers?.overwhelming_advantage ?? 25}
                                        onChange={onUpdate}
                                        description="Applied when attacker power is 4x+ defender power"
                                        type="number"
                                    />
                                </div>
                                
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                    <div className="text-amber-400 text-sm font-medium mb-1">Zero Defender Power</div>
                                    <div className="text-slate-300 text-xs">
                                        Automatic Decisive Victory - no roll needed when defender has no military units
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Step 3: Battle Success Levels */}
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-400" />
                        Step 3: Battle Success Levels
                    </CardTitle>
                    <CardDescription>
                        Configure the roll ranges and outcome multipliers for different battle results. The modified roll from Step 2 determines which outcome occurs.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {attackTypes.map(attackType => {
                        const successLevels = config.war_settings?.[attackType]?.success_levels || [];
                        const isOpen = openCollapsibles[`success_${attackType}`];
                        
                        return (
                            <Collapsible key={attackType} open={isOpen} onOpenChange={() => toggleCollapsible(`success_${attackType}`)}>
                                <CollapsibleTrigger asChild>
                                    <Button 
                                        variant="outline" 
                                        className="w-full flex justify-between bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                                    >
                                        <span>{getDisplayName(attackType)} Success Levels</span>
                                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-4 space-y-3">
                                    {successLevels.map((level, index) => (
                                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                                            <InputField
                                                label="Name"
                                                name={`war_settings.${attackType}.success_levels.${index}.name`}
                                                value={level.name}
                                                onChange={onUpdate}
                                                type="text"
                                            />
                                            <InputField
                                                label="Min Roll"
                                                name={`war_settings.${attackType}.success_levels.${index}.min_roll`}
                                                value={level.min_roll}
                                                onChange={onUpdate}
                                                type="number"
                                                min="1"
                                                max="200"
                                            />
                                            <InputField
                                                label="Max Roll"
                                                name={`war_settings.${attackType}.success_levels.${index}.max_roll`}
                                                value={level.max_roll}
                                                onChange={onUpdate}
                                                type="number"
                                                min="1"
                                                max="200"
                                            />
                                            <InputField
                                                label="Outcome Multiplier"
                                                name={`war_settings.${attackType}.success_levels.${index}.multiplier`}
                                                value={level.multiplier}
                                                onChange={onUpdate}
                                                type="number"
                                                min="0"
                                                max="5"
                                                step="0.1"
                                                description="Higher = less attacker losses, more resistance damage"
                                            />
                                        </div>
                                    ))}
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Step 4: Resistance Damage Configuration */}
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Swords className="w-5 h-5 text-orange-400" />
                        Step 4: Resistance Damage Configuration
                    </CardTitle>
                    <CardDescription>
                        Configure damage dealt to enemy resistance. Base damage is multiplied by the battle outcome, then limited by the hard cap.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {attackTypes.map(attackType => (
                        <div key={attackType} className="p-4 bg-slate-700/50 rounded-lg">
                            <h4 className="font-semibold text-white capitalize mb-2">{getDisplayName(attackType)}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Base Damage"
                                    name={`war_settings.max_resistance_damage_per_attack.${attackType}`}
                                    value={config.war_settings?.max_resistance_damage_per_attack?.[attackType]}
                                    onChange={onUpdate}
                                    type="number"
                                    min="1"
                                    max="50"
                                    description="Damage before outcome multiplier."
                                />
                                <InputField
                                    label="Hard Cap (Max Final Damage)"
                                    name={`war_settings.final_resistance_damage_caps.${attackType}`}
                                    value={config.war_settings?.final_resistance_damage_caps?.[attackType]}
                                    onChange={onUpdate}
                                    type="number"
                                    min="1"
                                    max="100"
                                    description="Absolute max damage per strike."
                                />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Step 5: Attacker Loss Configuration */}
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        Step 5: Attacker Loss Configuration
                    </CardTitle>
                    <CardDescription>
                        Configure casualty rates for attacking units. Final losses = Base Rate × (2 - Outcome Multiplier), capped by Max Rate.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <p className="text-amber-300 text-sm">
                            <strong>Formula:</strong> Losses = Units Committed × Base Rate × (2 - Outcome Multiplier), capped by Max Rate.
                            Higher outcome multipliers (better results) reduce attacker losses.
                        </p>
                    </div>
                    {attackTypes.map(attackType => (
                        <div key={attackType} className="p-4 bg-slate-700/50 rounded-lg">
                            <h4 className="font-semibold text-white capitalize mb-2">{getDisplayName(attackType)}</h4>
                            <div className="space-y-3">
                                {unitTypesByAttack[attackType].map(unitType => (
                                    <div key={unitType} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                                        <Label className="text-slate-400 capitalize col-span-1 sm:col-span-1">{unitType.replace('_', ' ')}</Label>
                                        <InputField
                                            label="Base Rate"
                                            name={`war_settings.attacker_loss_config.${attackType}.${unitType}.base_rate`}
                                            value={config.war_settings?.attacker_loss_config?.[attackType]?.[unitType]?.base_rate || 0}
                                            onChange={onUpdate}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="1"
                                            className="col-span-1 sm:col-span-1"
                                            description="Base casualty percentage"
                                        />
                                        <InputField
                                            label="Max Rate"
                                            name={`war_settings.attacker_loss_config.${attackType}.${unitType}.max_rate`}
                                            value={config.war_settings?.attacker_loss_config?.[attackType]?.[unitType]?.max_rate || 0}
                                            onChange={onUpdate}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="1"
                                            className="col-span-1 sm:col-span-1"
                                            description="Maximum casualty cap"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Step 6: Resource Consumption */}
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        Step 6: Combat Resource Consumption
                    </CardTitle>
                    <CardDescription>
                        Configure ammunition and gasoline consumption rates for combat operations, and penalties for insufficient resources.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-amber-400 font-medium">Attacker Consumption Rates</h4>
                            <div className="space-y-3">
                                <h5 className="text-slate-300 text-sm font-medium">Ammunition per Unit</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    {unitTypes.map(unit => (
                                        <InputField
                                            key={`ammo-${unit}`}
                                            label={getDisplayName(unit)}
                                            name={`war_settings.ammo_consumption_rates.${unit}`}
                                            value={config.war_settings?.ammo_consumption_rates?.[unit] || 0}
                                            onChange={onUpdate}
                                            type="number"
                                            step="0.1"
                                            min="0"
                                        />
                                    ))}
                                </div>
                                <h5 className="text-slate-300 text-sm font-medium mt-4">Gasoline per Unit</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    {unitTypes.map(unit => (
                                        <InputField
                                            key={`gasoline-${unit}`}
                                            label={getDisplayName(unit)}
                                            name={`war_settings.gasoline_consumption_rates.${unit}`}
                                            value={config.war_settings?.gasoline_consumption_rates?.[unit] || 0}
                                            onChange={onUpdate}
                                            type="number"
                                            step="0.1"
                                            min="0"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-blue-400 font-medium">Defender Consumption & Penalties</h4>
                            <div className="space-y-3">
                                <h5 className="text-slate-300 text-sm font-medium">Defender Ammo Consumption</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    {['soldiers', 'tanks', 'aircraft', 'warships'].map(unit => (
                                        <InputField
                                            key={`def-ammo-${unit}`}
                                            label={getDisplayName(unit)}
                                            name={`war_settings.ammo_effectiveness_settings.defender_ammo_consumption_rates.${unit}`}
                                            value={config.war_settings?.ammo_effectiveness_settings?.defender_ammo_consumption_rates?.[unit] || 0}
                                            onChange={onUpdate}
                                            type="number"
                                            step="0.1"
                                            min="0"
                                        />
                                    ))}
                                </div>
                                <h5 className="text-slate-300 text-sm font-medium mt-4">Defender Gasoline Consumption</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    {['tanks', 'aircraft', 'warships'].map(unit => (
                                        <InputField
                                            key={`def-gasoline-${unit}`}
                                            label={getDisplayName(unit)}
                                            name={`war_settings.gasoline_effectiveness_settings.defender_gasoline_consumption_rates.${unit}`}
                                            value={config.war_settings?.gasoline_effectiveness_settings?.defender_gasoline_consumption_rates?.[unit] || 0}
                                            onChange={onUpdate}
                                            type="number"
                                            step="0.1"
                                            min="0"
                                        />
                                    ))}
                                </div>
                                <h5 className="text-slate-300 text-sm font-medium mt-4">Resource Shortage Penalties</h5>
                                <InputField
                                    label="Insufficient Ammo Penalty (%)"
                                    name="war_settings.ammo_effectiveness_settings.insufficient_ammo_penalty_percent"
                                    value={config.war_settings?.ammo_effectiveness_settings?.insufficient_ammo_penalty_percent || 0}
                                    onChange={onUpdate}
                                    type="number"
                                    min="0"
                                    max="100"
                                    description="Power reduction when defender lacks ammo"
                                />
                                <InputField
                                    label="Insufficient Gasoline Penalty (%)"
                                    name="war_settings.gasoline_effectiveness_settings.insufficient_gasoline_penalty_percent"
                                    value={config.war_settings?.gasoline_effectiveness_settings?.insufficient_gasoline_penalty_percent || 0}
                                    onChange={onUpdate}
                                    type="number"
                                    min="0"
                                    max="100"
                                    description="Power reduction when defender lacks gasoline"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Step 7: Per-Battle Loot Configuration */}
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Coins className="w-5 h-5 text-amber-400" />
                        Step 7: Per-Battle Loot Configuration
                    </CardTitle>
                    <CardDescription>
                        Control the amount of cash looted from the defender's treasury in each victorious battle based on the outcome from Step 3.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <InputField
                        label="Base Loot Pool (% of Defender's Treasury)"
                        name="war_settings.loot_settings.base_loot_pool_percent_of_defender_treasury"
                        value={config.war_settings?.loot_settings?.base_loot_pool_percent_of_defender_treasury}
                        onChange={onUpdate}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        description="The maximum percentage of the defender's treasury that can be looted in a single battle."
                    />
                    
                    <Collapsible open={openCollapsibles.loot_outcomes} onOpenChange={() => toggleCollapsible('loot_outcomes')}>
                        <CollapsibleTrigger asChild>
                            <Button variant="outline" className="w-full flex justify-between bg-slate-700 hover:bg-slate-600 text-white border-slate-600">
                                <span>Loot Percentages per Battle Outcome</span>
                                {openCollapsibles.loot_outcomes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4 space-y-4">
                            {attackTypes.map(attackType => {
                                const successLevels = config.war_settings?.[attackType]?.success_levels || [];
                                const lootConfig = config.war_settings?.loot_settings?.per_outcome_loot_percent || {};
                                
                                if (successLevels.length === 0) {
                                    return (
                                        <div key={attackType} className="p-4 bg-slate-700/50 rounded-lg text-slate-400">
                                            <h4 className="text-lg font-medium text-white mb-2 capitalize">{getDisplayName(attackType)} Loot Settings</h4>
                                            <p>No success levels defined for {getDisplayName(attackType).toLowerCase()}. Configure success levels above first.</p>
                                        </div>
                                    );
                                }
                                
                                return (
                                    <div key={attackType} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                                        <h4 className="text-lg font-medium text-white mb-4 capitalize">{getDisplayName(attackType)} Loot Settings</h4>
                                        <div className="space-y-3">
                                            {successLevels.map((level, index) => {
                                                const levelLootConfig = lootConfig[level.name] || {};
                                                return (
                                                    <div key={`${attackType}-${index}`} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                                                        <Label className="text-slate-300">{level.name || `Outcome ${index + 1}`}</Label>
                                                        <InputField
                                                            label="Min %"
                                                            name={`war_settings.loot_settings.per_outcome_loot_percent.${level.name}.min_percent`}
                                                            value={levelLootConfig.min_percent || 0}
                                                            onChange={onUpdate}
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="1"
                                                        />
                                                        <InputField
                                                            label="Max %"
                                                            name={`war_settings.loot_settings.per_outcome_loot_percent.${level.name}.max_percent`}
                                                            value={levelLootConfig.max_percent || 0}
                                                            onChange={onUpdate}
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="1"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </CollapsibleContent>
                    </Collapsible>
                </CardContent>
            </Card>
        </div>
    );
}

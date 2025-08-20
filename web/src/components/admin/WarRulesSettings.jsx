
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Swords, DollarSign, Zap, Hourglass, AlertTriangle, Target } from 'lucide-react'; // Added Target

const InputField = ({ label, name, value, onChange, type = "number", description, className = "", step, placeholder, min, max }) => {
    const handleInputChange = (e) => {
        if (!onChange) return;
        
        const rawValue = e.target.value;
        let processedValue;

        if (type === 'number') {
            if (rawValue === '' || rawValue === null) {
                // If input is empty, pass null or undefined if that's the desired behavior for the parent
                // Currently, the parent expects 0 if it's an empty number field based on handlePercentageChange.
                // However, for direct number fields, passing 0 when empty is safer to avoid NaN.
                processedValue = 0; 
            } else {
                const num = parseFloat(rawValue);
                processedValue = isNaN(num) ? 0 : num;
            }
        } else {
            processedValue = rawValue;
        }
        
        onChange(name, processedValue);
    };

    // Ensure the value displayed is always safe
    const displayValue = (value === null || typeof value === 'undefined') ? '' : String(value);

    return (
        <div className="space-y-2">
            <Label htmlFor={name} className="text-slate-300">{label}</Label>
            <Input
                type={type}
                id={name}
                name={name}
                value={displayValue}
                onChange={handleInputChange}
                className={`bg-slate-700 border-slate-600 text-white ${className}`}
                step={step}
                placeholder={placeholder}
                min={min}
                max={max}
            />
            {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
    );
};

export default function WarRulesSettings({ config, onUpdate }) {
    // Add comprehensive validation (preserved from original code)
    if (!config) {
        return (
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                    <p className="text-slate-400">Loading configuration...</p>
                </CardContent>
            </Card>
        );
    }
    
    if (!config.war_settings) {
        return (
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                    <p className="text-slate-400">War settings not found in configuration.</p>
                </CardContent>
            </Card>
        );
    }

    const handlePercentageChange = (name, value) => {
        if (!onUpdate) return;
        
        // Changed to pass null if value is null or undefined, as per outline
        if (value === null || typeof value === 'undefined' || value === '') { // Added '' check for empty input
            onUpdate(name, null);
            return;
        }
        const decimalValue = parseFloat(value) / 100;
        onUpdate(name, isNaN(decimalValue) ? 0 : decimalValue);
    };

    const actionPointTypes = ['ground_battle', 'air_strike', 'naval_battle', 'bombardment', 'nuclear_strike'];

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Swords className="w-5 h-5 text-red-400" />
                    War Rules & Costs
                </CardTitle>
                <CardDescription>Configure war declaration costs, tactical points, resistance mechanics, and looting rules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* War Declaration & Basic Settings */}
                <div className="p-4 border border-slate-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <DollarSign className="w-5 h-5 text-green-400" /> War Declaration & Initial Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <InputField 
                            label="War Declaration Cost" 
                            name="war_settings.war_declaration_cost"
                            value={config.war_settings.war_declaration_cost}
                            onChange={onUpdate}
                            description="Cost in dollars to declare war"
                        />
                        <InputField
                            label="Max Offensive Wars"
                            name="war_settings.max_offensive_wars"
                            value={config.war_settings.max_offensive_wars}
                            onChange={onUpdate}
                            description="Maximum wars a nation can start"
                        />
                        <InputField
                            label="Max Defensive Wars"
                            name="war_settings.max_defensive_wars"
                            value={config.war_settings.max_defensive_wars}
                            onChange={onUpdate}
                            description="Maximum defensive wars a nation can be in"
                        />
                        <InputField 
                            label="Initial Resistance Points" 
                            name="war_settings.initial_resistance"
                            value={config.war_settings.initial_resistance}
                            onChange={onUpdate}
                            description="Starting resistance for both sides"
                        />
                    </div>
                </div>

                {/* Tactical Points System */}
                <div className="p-4 border border-slate-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5 text-yellow-400" /> Tactical Points System
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <InputField 
                            label="Starting Tactical Points"
                            name="war_settings.tactical_points_on_war_start"
                            value={config.war_settings.tactical_points_on_war_start}
                            onChange={onUpdate}
                            description="Tactical points when war begins"
                        />
                        <InputField 
                            label="Points Per Turn" 
                            name="war_settings.tactical_points_per_turn"
                            value={config.war_settings.tactical_points_per_turn}
                            onChange={onUpdate}
                            description="Points gained each turn"
                        />
                        <InputField 
                            label="Maximum Tactical Points"
                            name="war_settings.max_tactical_points"
                            value={config.war_settings.max_tactical_points}
                            onChange={onUpdate}
                            description="Cap on tactical points"
                        />
                        <InputField
                            label="Combat Action Cooldown (seconds)"
                            name="war_settings.combat_action_cooldown_seconds"
                            value={config.war_settings.combat_action_cooldown_seconds}
                            onChange={onUpdate}
                            description="Cooldown between combat actions"
                        />
                    </div>
                </div>

                {/* Action Point Costs */}
                <div className="p-4 border border-slate-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <Target className="w-5 h-5 text-purple-400" /> Action Point Costs
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {actionPointTypes.map(type => (
                             <InputField 
                                key={type}
                                label={`${type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Cost`}
                                name={`war_settings.action_point_costs.${type}`}
                                value={config.war_settings?.action_point_costs?.[type]}
                                onChange={onUpdate}
                                description={`AP cost for a ${type.replace(/_/g, ' ')}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Strike Limits - New Section */}
                <div className="p-4 border border-slate-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-orange-400" /> Strike Limits
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                            label="Max Conventional Bombs per Strike"
                            name="war_settings.max_conventional_bombs_per_strike"
                            value={config.war_settings.max_conventional_bombs_per_strike}
                            onChange={onUpdate}
                            description="Maximum conventional bombs that can be used in a single attack"
                        />
                        <InputField
                            label="Max Nuclear Weapons per Strike"
                            name="war_settings.max_nuclear_weapons_per_strike"
                            value={config.war_settings.max_nuclear_weapons_per_strike}
                            onChange={onUpdate}
                            description="Maximum nuclear weapons that can be used in a single attack"
                        />
                    </div>
                </div>

                {/* War Conclusion Looting - Preserved Existing Section */}
                <div className="p-4 border border-slate-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <DollarSign className="w-5 h-5 text-amber-400" /> War Conclusion Looting
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label className="text-slate-300 mb-2 block">Cash Loot Range (%)</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <InputField 
                                    label="Min %" 
                                    name="war_settings.loot_cash_min_percent"
                                    value={((config.war_settings?.loot_cash_min_percent || 0) * 100)}
                                    onChange={(name, value) => handlePercentageChange(name, value)}
                                    placeholder="5"
                                />
                                <InputField 
                                    label="Max %" 
                                    name="war_settings.loot_cash_max_percent"
                                    value={((config.war_settings?.loot_cash_max_percent || 0) * 100)}
                                    onChange={(name, value) => handlePercentageChange(name, value)}
                                    placeholder="15"
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-slate-300 mb-2 block">Resource Loot Range (%)</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <InputField 
                                    label="Min %" 
                                    name="war_settings.loot_resources_min_percent"
                                    value={((config.war_settings?.loot_resources_min_percent || 0) * 100)}
                                    onChange={(name, value) => handlePercentageChange(name, value)}
                                    placeholder="3"
                                />
                                <InputField 
                                    label="Max %" 
                                    name="war_settings.loot_resources_max_percent"
                                    value={((config.war_settings?.loot_resources_max_percent || 0) * 100)}
                                    onChange={(name, value) => handlePercentageChange(name, value)}
                                    placeholder="8"
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-slate-300 mb-2 block">Alliance Loot Range (%)</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <InputField 
                                    label="Min %" 
                                    name="war_settings.loot_alliance_min_percent"
                                    value={((config.war_settings?.loot_alliance_min_percent || 0) * 100)}
                                    onChange={(name, value) => handlePercentageChange(name, value)}
                                    placeholder="1"
                                />
                                <InputField 
                                    label="Max %" 
                                    name="war_settings.loot_alliance_max_percent"
                                    value={((config.war_settings?.loot_alliance_max_percent || 0) * 100)}
                                    onChange={(name, value) => handlePercentageChange(name, value)}
                                    placeholder="5"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

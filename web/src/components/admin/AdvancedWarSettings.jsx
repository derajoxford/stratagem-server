
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { GameConfig } from '@/api/entities';
import { Loader2, Save, ShieldAlert, AlertTriangle, Atom, Skull, Building } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // New import

const InputField = ({ label, name, value, onChange, type = "number", description, className = "", step, placeholder, min, max }) => (
    <div className="space-y-2">
        <Label htmlFor={name} className="text-slate-300">{label}</Label>
        <Input
            type={type}
            id={name}
            name={name}
            value={value === 0 ? '0' : (value || '')}
            onChange={(e) => {
                const val = type === 'number' ? (e.target.value === '' ? null : parseFloat(e.target.value) || 0) : e.target.value;
                onChange(name, val);
            }}
            className={`bg-slate-700 border-slate-600 text-white ${className}`}
            step={step}
            placeholder={placeholder}
            min={min}
            max={max}
        />
        {description && <p className="text-xs text-slate-400">{description}</p>}
    </div>
);

const DEFAULT_NUCLEAR_SETTINGS = {
    cities_affected_percentage: 100,
    infrastructure_destruction_percentage: 70,
    population_reduction_min_percent: 50,
    population_reduction_max_percent: 90,
    happiness_reduction_points: 70,
    ruined_state_duration_turns: 5,
    prioritize_military_targets: true,
    ground_zero_destruction_percentage: 100,
    blast_radius_destruction_percentage: 50
};

const DEFAULT_ATTACKER_LOSS_CONFIG = {
    ground_battle: {
        soldiers: { base_rate: 0.05, max_rate: 0.3 },
        tanks: { base_rate: 0.03, max_rate: 0.2 },
    },
    air_strike: {
        aircraft: { base_rate: 0.08, max_rate: 0.4 },
    },
    naval_battle: {
        warships: { base_rate: 0.06, max_rate: 0.35 },
    },
    bombardment: {
        aircraft: { base_rate: 0.04, max_rate: 0.25 },
    },
    nuclear_strike: {
        aircraft: { base_rate: 0.01, max_rate: 0.1 },
    }
};

const sanitizeConfig = (obj) => {
    if (obj === null) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeConfig);
    const sanitized = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (value !== undefined) {
                if (typeof value === 'object' && value !== null) {
                    sanitized[key] = sanitizeConfig(value);
                } else {
                    sanitized[key] = value;
                }
            }
        }
    }
    return sanitized;
};

const deepMerge = (target, source) => {
    const output = { ...target };
    if (target && typeof target === 'object' && source && typeof source === 'object') {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && key in target && target[key] && typeof target[key] === 'object') {
                output[key] = deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });
    }
    return output;
};


export default function AdvancedWarSettings({ gameConfigEntity, onUpdate }) {
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [localConfig, setLocalConfig] = useState(null);

    useEffect(() => {
        let parsedConfig = {};
        if (gameConfigEntity && gameConfigEntity.config_data_json) {
            try {
                parsedConfig = JSON.parse(gameConfigEntity.config_data_json);
            } catch (error) {
                console.error("Failed to parse config, using defaults.", error);
            }
        }

        const defaultConfigSlice = {
            war_settings: {
                allow_admin_war_override: false,
                nuclear_strike_mechanics: DEFAULT_NUCLEAR_SETTINGS,
                attacker_loss_config: DEFAULT_ATTACKER_LOSS_CONFIG, // Added new default
            }
        };

        setLocalConfig(deepMerge(defaultConfigSlice, parsedConfig));
    }, [gameConfigEntity]);


    const handleConfigChange = (path, value) => {
        setLocalConfig(prevConfig => {
            const newConfig = JSON.parse(JSON.stringify(prevConfig));
            const keys = path.split('.');
            let current = newConfig;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) { // Ensure path exists before traversing
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newConfig;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setFeedback(null);
        try {
            const allConfigs = await GameConfig.list();
            const latestConfigEntity = allConfigs.length > 0 ? allConfigs[0] : null;

            let fullConfig = {};
            if (latestConfigEntity && latestConfigEntity.config_data_json) {
                fullConfig = JSON.parse(latestConfigEntity.config_data_json);
            }

            const updatedFullConfig = deepMerge(fullConfig, localConfig);
            const configJsonString = JSON.stringify(sanitizeConfig(updatedFullConfig));
            
            if (latestConfigEntity) {
                await GameConfig.update(latestConfigEntity.id, {
                    config_data_json: configJsonString,
                    last_updated_by: 'admin'
                });
            } else {
                await GameConfig.create({
                    config_data_json: configJsonString,
                    last_updated_by: 'admin'
                });
            }
            
            setFeedback({ type: 'success', message: 'Advanced war settings saved successfully!' });
            
            if (onUpdate) {
                setTimeout(() => onUpdate(), 1000);
            }
        } catch (error) {
            console.error('Save error:', error);
            setFeedback({ type: 'error', message: `Failed to save: ${error.message}` });
        }
        setIsSaving(false);
    };
    
    if (!localConfig) {
        return (
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardContent className="p-8 flex justify-center items-center">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                    <p className="ml-4 text-slate-400">Initializing settings...</p>
                </CardContent>
            </Card>
        );
    }

    const nuclearSettings = localConfig.war_settings?.nuclear_strike_mechanics || DEFAULT_NUCLEAR_SETTINGS;
    const attackerLossConfig = localConfig.war_settings?.attacker_loss_config || DEFAULT_ATTACKER_LOSS_CONFIG;

    const attackTypes = ['ground_battle', 'air_strike', 'naval_battle', 'bombardment', 'nuclear_strike'];
    const unitTypesByAttack = {
        ground_battle: ['soldiers', 'tanks'],
        air_strike: ['aircraft'],
        naval_battle: ['warships'],
        bombardment: ['aircraft'],
        nuclear_strike: ['aircraft']
    };

    return (
        <div className="space-y-6">
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                        Advanced War Settings
                    </CardTitle>
                    <CardDescription>
                        Configure advanced war mechanics and administrative overrides.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {feedback && (
                        <Alert className={
                            feedback.type === 'success' 
                                ? "border-green-500/50 bg-green-500/10" 
                                : "border-red-500/50 bg-red-500/10"
                        }>
                            <AlertDescription className={
                                feedback.type === 'success' ? "text-green-300" : "text-red-300"
                            }>
                                {feedback.message}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Administrative Overrides */}
                    <div className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                            <ShieldAlert className="w-5 h-5 text-amber-400" />
                            Administrative War Overrides
                        </h3>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="admin-war-override"
                                checked={localConfig.war_settings?.allow_admin_war_override || false}
                                onCheckedChange={(checked) => handleConfigChange('war_settings.allow_admin_war_override', checked)}
                            />
                            <Label htmlFor="admin-war-override" className="text-slate-300">
                                Allow admins to bypass war declaration restrictions
                            </Label>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            When enabled, admins can declare war regardless of nation limits or other restrictions.
                        </p>
                    </div>

                    <Separator className="bg-slate-600" />

                    {/* Nuclear Strike Mechanics */}
                    <div className="p-6 border border-red-700/50 rounded-lg bg-red-900/10">
                        <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
                            <Atom className="w-6 h-6 text-red-400" />
                            Nuclear Strike Mechanics
                        </h3>
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-2">
                                <Skull className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-red-300">
                                    <p className="font-medium mb-1">Nuclear Warfare Impact:</p>
                                    <p className="text-xs">
                                        These settings control the devastating effects of nuclear strikes on enemy cities, 
                                        including infrastructure destruction, population casualties, and long-term city recovery.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Target Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Cities Affected (%)"
                                    name="war_settings.nuclear_strike_mechanics.cities_affected_percentage"
                                    value={nuclearSettings.cities_affected_percentage}
                                    onChange={handleConfigChange}
                                    min="1"
                                    max="100"
                                    description="Percentage of enemy cities affected by a nuclear strike"
                                />
                                <div className="flex items-center space-x-2 mt-6">
                                    <Checkbox
                                        id="prioritize-military"
                                        checked={nuclearSettings.prioritize_military_targets || false}
                                        onCheckedChange={(checked) => handleConfigChange('war_settings.nuclear_strike_mechanics.prioritize_military_targets', checked)}
                                    />
                                    <Label htmlFor="prioritize-military" className="text-slate-300">
                                        Prioritize military infrastructure for destruction
                                    </Label>
                                </div>
                            </div>

                            {/* Infrastructure Destruction */}
                            <div className="p-4 bg-slate-700/30 rounded-lg">
                                <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                                    <Building className="w-4 h-4 text-orange-400" />
                                    Infrastructure Destruction
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField
                                        label="General Destruction (%)"
                                        name="war_settings.nuclear_strike_mechanics.infrastructure_destruction_percentage"
                                        value={nuclearSettings.infrastructure_destruction_percentage}
                                        onChange={handleConfigChange}
                                        min="1"
                                        max="100"
                                        description="Base percentage of infrastructure destroyed per city"
                                    />
                                    <InputField
                                        label="Ground Zero Destruction (%)"
                                        name="war_settings.nuclear_strike_mechanics.ground_zero_destruction_percentage"
                                        value={nuclearSettings.ground_zero_destruction_percentage}
                                        onChange={handleConfigChange}
                                        min="50"
                                        max="100"
                                        description="Destruction percentage for the primary target city"
                                    />
                                </div>
                                <div className="mt-4">
                                    <InputField
                                        label="Blast Radius Destruction (%)"
                                        name="war_settings.nuclear_strike_mechanics.blast_radius_destruction_percentage"
                                        value={nuclearSettings.blast_radius_destruction_percentage}
                                        onChange={handleConfigChange}
                                        min="10"
                                        max="90"
                                        description="Destruction percentage for secondary affected cities"
                                    />
                                </div>
                            </div>

                            {/* Population & Social Impact */}
                            <div className="p-4 bg-slate-700/30 rounded-lg">
                                <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                                    <Skull className="w-4 h-4 text-red-400" />
                                    Population & Social Impact
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <InputField
                                        label="Min Population Loss (%)"
                                        name="war_settings.nuclear_strike_mechanics.population_reduction_min_percent"
                                        value={nuclearSettings.population_reduction_min_percent}
                                        onChange={handleConfigChange}
                                        min="10"
                                        max="90"
                                        description="Minimum population reduction per affected city"
                                    />
                                    <InputField
                                        label="Max Population Loss (%)"
                                        name="war_settings.nuclear_strike_mechanics.population_reduction_max_percent"
                                        value={nuclearSettings.population_reduction_max_percent}
                                        onChange={handleConfigChange}
                                        min="20"
                                        max="95"
                                        description="Maximum population reduction per affected city"
                                    />
                                    <InputField
                                        label="Happiness Reduction"
                                        name="war_settings.nuclear_strike_mechanics.happiness_reduction_points"
                                        value={nuclearSettings.happiness_reduction_points}
                                        onChange={handleConfigChange}
                                        min="10"
                                        max="100"
                                        description="Fixed happiness points lost per affected city"
                                    />
                                </div>
                            </div>

                            {/* Recovery Settings */}
                            <div className="p-4 bg-slate-700/30 rounded-lg">
                                <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                    Recovery & Ruined State
                                </h4>
                                <InputField
                                    label="Ruined State Duration (Turns)"
                                    name="war_settings.nuclear_strike_mechanics.ruined_state_duration_turns"
                                    value={nuclearSettings.ruined_state_duration_turns}
                                    onChange={handleConfigChange}
                                    min="1"
                                    max="20"
                                    description="Number of turns cities remain 'ruined' and cannot generate income or build"
                                />
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-slate-600" />

                    {/* Consolidated Battle Mechanics Tab */}
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="battle-mechanics">
                            <AccordionTrigger className="text-lg font-semibold text-slate-300 hover:text-amber-400">
                                <ShieldAlert className="w-6 h-6 text-orange-400 mr-2" />
                                Consolidated Battle Mechanics
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-4">
                                <p className="text-slate-400 text-sm mb-4">
                                    This section allows configuration of various combat parameters, including unit casualty rates.
                                </p>
                                <div className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
                                    <h4 className="font-semibold text-white capitalize mb-4 flex items-center gap-2">
                                        <Skull className="w-5 h-5 text-red-400" />
                                        Attacker Loss Configuration
                                    </h4>
                                    <p className="text-slate-400 text-sm mb-4">
                                        Configure the casualty rates for attacking units. Losses are calculated based on the battle outcome: a more successful attack (higher outcome multiplier) results in fewer losses. The formula is approximately: `Losses = CommittedUnits * BaseRate * (2 - OutcomeMultiplier)`. The result is capped by the Max Rate.
                                    </p>
                                    {attackTypes.map(attackType => (
                                        <div key={attackType} className="p-4 bg-slate-700/50 rounded-lg mb-3">
                                            <h4 className="font-semibold text-white capitalize mb-2">{attackType.replace('_', ' ')}</h4>
                                            <div className="space-y-3">
                                                {unitTypesByAttack[attackType].map(unitType => (
                                                    <div key={unitType} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                                                        <label className="text-slate-400 capitalize col-span-1 sm:col-span-1">{unitType.replace('_', ' ')}</label>
                                                        <InputField
                                                            label="Base Rate"
                                                            name={`war_settings.attacker_loss_config.${attackType}.${unitType}.base_rate`}
                                                            value={attackerLossConfig[attackType]?.[unitType]?.base_rate || 0}
                                                            onChange={handleConfigChange}
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            max="1"
                                                            className="col-span-1 sm:col-span-1"
                                                        />
                                                        <InputField
                                                            label="Max Rate"
                                                            name={`war_settings.attacker_loss_config.${attackType}.${unitType}.max_rate`}
                                                            value={attackerLossConfig[attackType]?.[unitType]?.max_rate || 0}
                                                            onChange={handleConfigChange}
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            max="1"
                                                            className="col-span-1 sm:col-span-1"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>


                    <div className="flex justify-end">
                        <Button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save War Settings
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

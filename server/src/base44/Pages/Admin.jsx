
import React, { useState, useEffect, useCallback } from "react";
import { Settings, SlidersHorizontal, AlertTriangle, CheckCircle, Shield, Users, Coins, Zap, Swords, Wrench, Factory, Droplets, Leaf, University, HeartPulse, Building, Gem, Anchor, Crosshair, Atom, Globe, Loader2, Save, ShieldOff, Package, Play, Store, Database, Target, ShieldAlert, Clock, UserCog } from "lucide-react";
import { GameConfig, GameState, User, Nation, Alliance } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import GeneralSettings from "../components/admin/GeneralSettings";
import WarRulesSettings from "../components/admin/WarRulesSettings";
import UnitSpecsSettings from "../components/admin/UnitSpecsSettings";
import RefinedResourceSettings from "../components/admin/RefinedResourceSettings";
import PowerPlantSettings from "../components/admin/PowerPlantSettings";
import CombatSettings from "../components/admin/CombatSettings";
import ManualTurnProcessor from "../components/admin/ManualTurnProcessor";
import NationManagement from "../components/admin/NationManagement";
import UserManagement from "../components/admin/UserManagement";
import AllianceManagement from "../components/admin/AllianceManagement";
import MarketplaceManagement from "../components/admin/MarketplaceManagement";
import DatabaseReset from "../components/admin/DatabaseReset";
import WarManagementPanel from "../components/admin/WarManagementPanel";
import AdvancedWarSettings from "../components/admin/AdvancedWarSettings";
import BattleMechanicsSettings from "../components/admin/BattleMechanicsSettings";
import EnvironmentalSettings from "../components/admin/EnvironmentalSettings"; 
import { defaultGameConfig } from '@/components/data/defaultGameConfig.js';


// Helper function to parse config from JSON string safely
const parseConfigFromJson = (configJsonString) => {
    try {
        return JSON.parse(configJsonString);
    } catch (error) {
        console.error("Failed to parse config JSON string:", error);
        return {}; // Fallback to an empty object for merging
    }
};

// Helper function to create a truly deep clone
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
};

const deepMerge = (defaults, config) => {
    // Create a deep clone of defaults to prevent mutation
    let merged = deepClone(defaults);
    
    if (!config || typeof config !== 'object') {
        return merged;
    }
    
    for (const key in config) {
        if (Object.prototype.hasOwnProperty.call(config, key)) {
            if (
                merged[key] && typeof merged[key] === 'object' && !Array.isArray(merged[key]) &&
                config[key] && typeof config[key] === 'object' && !Array.isArray(config[key])
            ) {
                merged[key] = deepMerge(merged[key], config[key]);
            } else {
                // For arrays and primitive values, use the config value directly, but clone it if it's an object/array
                merged[key] = deepClone(config[key]);
            }
        }
    }
    return merged;
};

export default function AdminPage() {
    const [gameConfig, setGameConfig] = useState(null);
    const [gameConfigEntity, setGameConfigEntity] = useState(null); // Add state for the raw entity
    const [gameState, setGameState] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState("general");

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);

            const [configs, gameStates] = await Promise.all([
                GameConfig.list(),
                GameState.list()
            ]);

            const currentConfigEntity = (configs && configs.length > 0) ? configs[0] : null;
            setGameConfigEntity(currentConfigEntity);

            let parsedConfig = {};
            if (currentConfigEntity && currentConfigEntity.config_data_json) {
                try {
                    parsedConfig = parseConfigFromJson(currentConfigEntity.config_data_json);
                    console.log('Admin: Parsed config from database:', parsedConfig);
                } catch (error) {
                    console.error('Admin: Failed to parse config from database:', error);
                    parsedConfig = {};
                }
            } else {
                console.log('Admin: No config found in database, using defaults');
            }
            
            // Create a truly deep clone of defaultGameConfig before merging
            const cleanDefaultConfig = deepClone(defaultGameConfig);
            const finalConfig = deepMerge(cleanDefaultConfig, parsedConfig);
            
            // Diagnostic logging for battle success levels
            console.log('Admin: Default config success levels for nuclear_strike:', 
                cleanDefaultConfig.war_settings?.nuclear_strike?.success_levels);
            console.log('Admin: Final config success levels for nuclear_strike (pre-patch):', 
                finalConfig.war_settings?.nuclear_strike?.success_levels);
            
            // Verify all attack types have success levels
            const attackTypes = ['ground_assault', 'strategic_bombing', 'naval_strike', 'air_superiority', 'naval_blockade', 'nuclear_strike'];
            attackTypes.forEach(type => {
                if (!finalConfig.war_settings?.[type]?.success_levels || !Array.isArray(finalConfig.war_settings[type].success_levels) || finalConfig.war_settings[type].success_levels.length === 0) {
                    console.warn(`Admin: Missing, invalid, or empty success_levels for ${type}, restoring from defaults.`);
                    if (!finalConfig.war_settings) finalConfig.war_settings = {};
                    if (!finalConfig.war_settings[type]) finalConfig.war_settings[type] = {};
                    finalConfig.war_settings[type].success_levels = deepClone(cleanDefaultConfig.war_settings[type].success_levels);
                }
            });
            console.log('Admin: Final config success levels for nuclear_strike (post-patch):', 
                finalConfig.war_settings?.nuclear_strike?.success_levels);

            setGameConfig(finalConfig);
            setGameState(gameStates && gameStates.length > 0 ? gameStates[0] : null);
        } catch (error) {
            console.error("Failed to load admin data:", error);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleConfigChange = useCallback((path, value) => {
        setGameConfig(prevGameConfig => {
            if (!prevGameConfig) return prevGameConfig;

            // Create a deep clone to prevent mutation of the previous state
            const newConfig = deepClone(prevGameConfig);
            const keys = path.split('.');
            let current = newConfig;

            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                const nextKey = keys[i + 1];

                // Check if the next segment of the path is a number, which implies an array.
                const nextSegmentIsArray = !isNaN(parseInt(nextKey, 10));

                if (current[key] === undefined || current[key] === null) {
                    // If the path segment doesn't exist, create it as an array or object.
                    current[key] = nextSegmentIsArray ? [] : {};
                }
                
                current = current[key];
            }

            const finalKey = keys[keys.length - 1];
            let targetValue = value;
            
            const isCostMoneyPath = keys.length >= 2 && keys[keys.length - 2] === 'costs' && finalKey === 'money';

            if (typeof value === 'string') {
                if (value.toLowerCase() === 'true') {
                    targetValue = true;
                } else if (value.toLowerCase() === 'false') {
                    targetValue = false;
                } else if (!isNaN(parseFloat(value)) && value.trim() !== '') {
                    targetValue = parseFloat(value);
                } else if (value === '' || value === null) {
                    // Use deep cloned default for reference
                    let defaultRef = deepClone(defaultGameConfig);
                    let pathExistsInDefault = true;
                    for (const key of keys.slice(0, -1)) {
                        if (defaultRef && typeof defaultRef === 'object' && defaultRef.hasOwnProperty(key)) {
                            defaultRef = defaultRef[key];
                        } else {
                            pathExistsInDefault = false;
                            break;
                        }
                    }
                    if (pathExistsInDefault && defaultRef && typeof defaultRef === 'object' && typeof defaultRef[finalKey] === 'number') {
                        targetValue = 0;
                    } else if (isCostMoneyPath) {
                        targetValue = 0;
                    } else {
                        // If it's not a number field and value is empty/null, set to null or empty string based on context
                        targetValue = value; // Preserve original empty string or null
                    }
                }
            } else if (value === null) {
                // Use deep cloned default for reference
                let defaultRef = deepClone(defaultGameConfig);
                let pathExistsInDefault = true;
                for (const key of keys.slice(0, -1)) {
                    if (defaultRef && typeof defaultRef === 'object' && defaultRef.hasOwnProperty(key)) {
                        defaultRef = defaultRef[key];
                    } else {
                        pathExistsInDefault = false;
                        break;
                    }
                }
                if (pathExistsInDefault && defaultRef && typeof defaultRef === 'object' && typeof defaultRef[finalKey] === 'number') {
                    targetValue = 0;
                } else if (isCostMoneyPath) {
                    targetValue = 0;
                }
            }
            
            current[finalKey] = targetValue;
            
            console.log(`Admin: Config changed at path ${path} to:`, targetValue);
            
            return newConfig;
        });
    }, []);

    const saveConfig = async () => {
        if (!gameConfig || !user) return;
        setIsSaving(true);
        setFeedback(null);
        try {
            // Create a deep clone before stringifying to ensure data integrity
            const configToSave = deepClone(gameConfig);
            const configJsonString = JSON.stringify(configToSave, null, 2);
            
            console.log('Admin: Saving config with success levels (from state):', 
                configToSave.war_settings?.nuclear_strike?.success_levels);
            
            const configPayload = {
                config_data_json: configJsonString,
                config_version: "1.0",
                last_updated_by: user.email
            };
            
            const existingConfigs = await GameConfig.list();
            let savedConfig;
            
            if (existingConfigs && existingConfigs.length > 0) {
                savedConfig = await GameConfig.update(existingConfigs[0].id, configPayload);
            } else {
                savedConfig = await GameConfig.create(configPayload);
            }
            
            console.log('Admin: Config saved successfully');
            setFeedback({ type: 'success', message: 'Configuration saved successfully!' });
            
            // Reload data to verify persistence and update the UI with the saved state
            setTimeout(() => {
                loadData();
                setFeedback(null);
            }, 2000);
        } catch (error) {
            console.error('Save error:', error);
            setFeedback({ type: 'error', message: `Failed to save: ${error.message}` });
        }
        setIsSaving(false);
    };

    if (isLoading) return (
        <div className="p-8 flex justify-center items-center h-screen">
            <Loader2 className="w-16 h-16 text-amber-400 animate-spin" />
            <p className="ml-4 text-slate-400">Loading admin panel...</p>
        </div>
    );

    if (!user || user.role !== 'admin') {
        return (
            <div className="p-8">
                <div className="max-w-4xl mx-auto text-center">
                    <ShieldOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
                    <p className="text-slate-400">You must be an admin to access this panel.</p>
                </div>
            </div>
        );
    }

    // Helper function to get environmental status
    const getEnvironmentalStatus = () => {
        if (!gameState) return { status: 'unknown', label: 'Unknown', color: 'bg-gray-500' };
        
        const currentTurn = gameState.current_turn_number || 1;
        const lastEnvTurn = gameState.last_environmental_turn_number || 0;
        
        if (lastEnvTurn === currentTurn) {
            return { status: 'up-to-date', label: 'Up-to-date', color: 'bg-green-500' };
        } else if (lastEnvTurn === currentTurn - 1) {
            return { status: 'normal_delay', label: 'Normal Delay', color: 'bg-yellow-500' };
        } else if (lastEnvTurn < currentTurn - 1) {
            return { status: 'behind', label: 'Behind', color: 'bg-red-500' };
        } else {
            return { status: 'unknown', label: 'Unknown', color: 'bg-gray-500' };
        }
    };

    const envStatus = getEnvironmentalStatus();

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">Game Administration</h1>
                            <p className="text-slate-400 text-base lg:text-lg">Configure game mechanics and manage the world</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button 
                                onClick={saveConfig} 
                                disabled={isSaving}
                                className="bg-amber-600 hover:bg-amber-700 whitespace-nowrap px-4 py-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                {isSaving ? 'Saving...' : 'Save Configuration'}
                            </Button>
                        </div>
                    </div>
                    
                    {feedback && (
                        <div className={`px-4 py-3 rounded-lg flex items-center gap-2 text-sm mb-4 ${
                            feedback.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            <span>{feedback.message}</span>
                        </div>
                    )}
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="mb-8">
                        <TabsList className="h-auto flex-wrap gap-1 bg-slate-800/50 p-2 rounded-lg w-full justify-start">
                            <TabsTrigger value="general" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">General Settings</span>
                                <span className="sm:hidden">General</span>
                            </TabsTrigger>
                            <TabsTrigger value="battle-mechanics" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Target className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Battle Mechanics</span>
                                <span className="sm:hidden">Battle</span>
                            </TabsTrigger>
                            <TabsTrigger value="war-rules" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Swords className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">War Rules</span>
                                <span className="sm:hidden">War</span>
                            </TabsTrigger>
                            <TabsTrigger value="unit-specs" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Unit Specifications</span>
                                <span className="sm:hidden">Units</span>
                            </TabsTrigger>
                            <TabsTrigger value="combat" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Target className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Combat Settings</span>
                                <span className="sm:hidden">Combat</span>
                            </TabsTrigger>
                            <TabsTrigger value="refined-resources" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Factory className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Refined Resources</span>
                                <span className="sm:hidden">Refined</span>
                            </TabsTrigger>
                            <TabsTrigger value="power-plants" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Power Plants</span>
                                <span className="sm:hidden">Power</span>
                            </TabsTrigger>
                            <TabsTrigger value="environmental" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Leaf className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Environmental</span>
                                <span className="sm:hidden">Env</span>
                                <div className={`ml-2 w-2 h-2 rounded-full ${envStatus.color}`} title={`Environmental Processing: ${envStatus.label}`}></div>
                            </TabsTrigger>
                            <TabsTrigger value="advanced-war" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <ShieldAlert className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Advanced War</span>
                                <span className="sm:hidden">Advanced</span>
                            </TabsTrigger>
                            <TabsTrigger value="turn-processor" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Turn Processor</span>
                                <span className="sm:hidden">Turns</span>
                            </TabsTrigger>
                            <TabsTrigger value="wars" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Swords className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">War Management</span>
                                <span className="sm:hidden">Wars</span>
                            </TabsTrigger>
                            <TabsTrigger value="nations" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Nations</span>
                                <span className="sm:hidden">Nations</span>
                            </TabsTrigger>
                            <TabsTrigger value="users" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <UserCog className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Users</span>
                                <span className="sm:hidden">Users</span>
                            </TabsTrigger>
                            <TabsTrigger value="alliances" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Alliances</span>
                                <span className="sm:hidden">Alliances</span>
                            </TabsTrigger>
                            <TabsTrigger value="marketplace" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Store className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Market</span>
                                <span className="sm:hidden">Market</span>
                            </TabsTrigger>
                            <TabsTrigger value="database" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-3 py-2 whitespace-nowrap">
                                <Database className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden sm:inline">Database</span>
                                <span className="sm:hidden">Database</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="general" className="mt-8">
                        <GeneralSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="battle-mechanics" className="mt-8">
                        <BattleMechanicsSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="war-rules" className="mt-8">
                        <WarRulesSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="unit-specs" className="mt-8">
                        <UnitSpecsSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="combat" className="mt-8">
                        <CombatSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="refined-resources" className="mt-8">
                        <RefinedResourceSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="power-plants" className="mt-8">
                        <PowerPlantSettings config={gameConfig} onUpdate={handleConfigChange} />
                    </TabsContent>
                    <TabsContent value="environmental" className="mt-8">
                        <EnvironmentalSettings config={gameConfig} onUpdate={handleConfigChange} gameState={gameState} onRefresh={loadData} />
                    </TabsContent>
                    <TabsContent value="advanced-war" className="mt-8">
                        <AdvancedWarSettings gameConfigEntity={gameConfigEntity} onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="turn-processor" className="mt-8">
                        <ManualTurnProcessor gameState={gameState} onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="wars" className="mt-8">
                        <WarManagementPanel onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="nations" className="mt-8">
                        <NationManagement onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="users" className="mt-8">
                        <UserManagement onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="alliances" className="mt-8">
                        <AllianceManagement onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="marketplace" className="mt-8">
                        <MarketplaceManagement onUpdate={loadData} />
                    </TabsContent>
                    <TabsContent value="database" className="mt-8">
                        <DatabaseReset onUpdate={loadData} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

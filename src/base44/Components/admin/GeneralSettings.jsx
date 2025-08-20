
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Zap, Building, Coins, ChevronDown, ChevronRight, Clock, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { InputField } from './shared/InputField';

export default function GeneralSettings({ config, onUpdate }) {
    const [expandedBuildings, setExpandedBuildings] = React.useState({});

    if (!config) return null;

    const toggleBuilding = (buildingKey) => {
        setExpandedBuildings(prev => ({
            ...prev,
            [buildingKey]: !prev[buildingKey]
        }));
    };

    const improvementTypes = [
        'banks', 'factories', 'shopping_malls', 'corporate_officers', 'logistics_hubs',
        'hospitals', 'schools', 'coal_power_plants', 'nuclear_power_plants',
        'uranium_mines', 'coal_mines', 'iron_mines', 'steel_mills', 'aluminum_smelters',
        'bauxite_mines', 'oil_wells', 'farms', 'copper_mines', 'gold_mines',
        'diamond_mines', 'military_bases', 'airports', 'seaports', 'forestry',
        'recycling_center', 'stormwater_management', 'public_transit', 'ev_incentives',
        'ammunition_factories', 'bomb_factories', 'high_energy_weapons_center'
    ];

    const resourceProductionTypes = [
        'oil_wells', 'coal_mines', 'iron_mines', 'steel_mills', 'aluminum_smelters',
        'bauxite_mines', 'farms', 'copper_mines', 'gold_mines', 'diamond_mines',
        'uranium_mines', 'forestry'
    ];
    
    const specificLimitImprovements = ['military_bases', 'airports', 'seaports', 'bomb_factories', 'high_energy_weapons_center'];

    const generalLimitImprovements = improvementTypes.filter(
        (type) => !specificLimitImprovements.includes(type)
    );

    const resourceTypes = [
        'oil', 'gasoline', 'iron', 'steel', 'aluminum', 'coal', 'uranium', 
        'food', 'gold', 'bauxite', 'copper', 'diamonds', 'wood', 'ammo'
    ];

    const calculateInfraCostPreview = (points, baseLevel = 0) => {
        const baseCost = parseFloat(config.infrastructure_cost_per_point) || 1000;
        const scalingFactor = parseFloat(config.infrastructure_scaling_factor) || 1.02;

        let totalCost = 0;
        for (let i = 0; i < points; i++) {
            const currentLevel = baseLevel + i;
            const pointCost = Math.floor(baseCost * Math.pow(scalingFactor, currentLevel));
            totalCost += pointCost;
        }
        return totalCost;
    };

    const calculateCityCostPreview = (cityNumber) => {
        const baseCost = parseFloat(config.city_creation_base_cost) || 500000;
        const scalingFactor = parseFloat(config.city_creation_scaling_factor) || 1.5;
        const cost = baseCost * Math.pow(scalingFactor, cityNumber - 1);
        return Math.floor(cost);
    };

    const ensureBuildingCostStructure = (buildingKey) => {
        if (!config.city_improvement_costs) {
            config.city_improvement_costs = {};
        }
        if (!config.city_improvement_costs[buildingKey]) {
            config.city_improvement_costs[buildingKey] = { money: 0, resources: {} };
        }
        if (!config.city_improvement_costs[buildingKey].resources) {
            config.city_improvement_costs[buildingKey].resources = {};
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">General Game Settings</CardTitle>
                    <CardDescription>Configure core game mechanics and timing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4 p-4 border border-slate-700 rounded-lg">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-400" /> Infrastructure
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-md font-medium text-white">Infrastructure Costs</h4>
                                <InputField
                                    label="Base Cost per Point ($)"
                                    name="infrastructure_cost_per_point"
                                    value={config.infrastructure_cost_per_point}
                                    onChange={onUpdate}
                                />
                                <InputField
                                    label="Scaling Factor"
                                    name="infrastructure_scaling_factor"
                                    value={config.infrastructure_scaling_factor}
                                    onChange={onUpdate}
                                    step="0.001"
                                    description="Each point costs base_cost × (scaling_factor ^ current_infrastructure)"
                                />
                                <div className="bg-slate-700/50 p-4 rounded-lg">
                                    <h5 className="text-amber-400 font-medium mb-2">Cost Preview (50 points)</h5>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="text-slate-300">At 0 infra: ${calculateInfraCostPreview(50, 0).toLocaleString()}</div>
                                        <div className="text-slate-300">At 100 infra: ${calculateInfraCostPreview(50, 100).toLocaleString()}</div>
                                        <div className="text-slate-300">At 500 infra: ${calculateInfraCostPreview(50, 500).toLocaleString()}</div>
                                        <div className="text-slate-300">At 1000 infra: ${calculateInfraCostPreview(50, 1000).toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 p-4 border border-slate-700 rounded-lg">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Building className="w-5 h-5 text-green-400" /> City Creation Costs
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <InputField
                                    label="Base Cost ($)"
                                    name="city_creation_base_cost"
                                    value={config.city_creation_base_cost}
                                    onChange={onUpdate}
                                    description="Cost of the first city"
                                />
                                <InputField
                                    label="Scaling Factor"
                                    name="city_creation_scaling_factor"
                                    value={config.city_creation_scaling_factor}
                                    onChange={onUpdate}
                                    step="0.1"
                                    description="Each city costs base_cost × (scaling_factor ^ (city_number - 1))"
                                />
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-md font-medium text-white">Cost Preview</h4>
                                <div className="bg-slate-700/50 p-4 rounded-lg space-y-2">
                                    {[2, 3, 4, 5, 10].map(cityNum => (
                                        <div key={cityNum} className="flex justify-between text-sm">
                                            <span className="text-slate-300">City #{cityNum}:</span>
                                            <span className="text-amber-400 font-medium">
                                                ${calculateCityCostPreview(cityNum).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 p-4 border border-slate-700 rounded-lg">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-400" /> Game Timing
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField
                                label="Turn Duration (Minutes)"
                                name="turn_duration_minutes"
                                value={config.turn_duration_minutes}
                                onChange={(name, val) => onUpdate(name, val === null ? 60 : Math.floor(val))}
                                type="number"
                                min="1"
                                description="How long each game turn lasts."
                            />
                            <InputField
                                label="Market Ticker Speed (Seconds)"
                                name="market_ticker_speed_seconds"
                                value={config.market_ticker_speed_seconds}
                                onChange={(name, val) => onUpdate(name, val === null ? 30 : Math.floor(val))}
                                type="number"
                                min="5"
                                max="120"
                                description="Time for the market ticker to complete one full cycle."
                            />
                            <InputField
                                label="Turns Per Game Day"
                                name="turns_per_game_day"
                                value={config.turns_per_game_day || 24}
                                onChange={(name, val) => onUpdate(name, val === null ? 24 : Math.floor(val))}
                                type="number"
                                min="1"
                                max="100"
                                description="How many game turns equal one in-game day. Used for calculating the Strata Date."
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Coins className="w-5 h-5 text-amber-400" /> Global Economic Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-slate-700/50 rounded-lg">
                        <h4 className="text-md font-medium text-white mb-4">Refund Percentages</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InputField
                                label="Building Sell Refund (%)"
                                name="improvement_sell_percentage"
                                value={config.improvement_sell_percentage}
                                onChange={onUpdate}
                                min="0" max="100"
                                description="Percentage of cost refunded when selling buildings."
                            />
                            <InputField
                                label="Land Sell Refund (%)"
                                name="land_sell_percentage"
                                value={config.land_sell_percentage}
                                onChange={onUpdate}
                                min="0" max="100"
                                description="Percentage of cost refunded when selling land."
                            />
                            <InputField
                                label="Infrastructure Sell Refund (%)"
                                name="infrastructure_sell_percentage"
                                value={config.infrastructure_sell_percentage}
                                onChange={onUpdate}
                                min="0" max="100"
                                description="Percentage of cost refunded when selling infrastructure."
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Coins className="w-5 h-5 text-amber-400" /> Building Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Tabs defaultValue="costs" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 bg-slate-700">
                            <TabsTrigger value="costs">Building Costs & Resources</TabsTrigger>
                            <TabsTrigger value="effects">Building Effects</TabsTrigger>
                            <TabsTrigger value="production">Resource Production</TabsTrigger>
                            <TabsTrigger value="limits">General Building Limits</TabsTrigger>
                        </TabsList>

                        <TabsContent value="costs" className="mt-6">
                            <h4 className="text-md font-medium text-white mb-4">Building Costs & Resource Requirements</h4>
                            <p className="text-slate-400 text-sm mb-6">Configure both monetary costs and resource requirements for each building type. Click on any building to expand its cost settings.</p>
                            
                            <div className="space-y-3">
                                {improvementTypes.map(improvement => {
                                    ensureBuildingCostStructure(improvement);
                                    const isExpanded = expandedBuildings[improvement];
                                    const displayName = improvement.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                    
                                    return (
                                        <Collapsible key={improvement} open={isExpanded} onOpenChange={() => toggleBuilding(improvement)}>
                                            <CollapsibleTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="w-full justify-between text-left p-4 bg-slate-700/50 hover:bg-slate-700/70 rounded-lg"
                                                >
                                                    <span className="text-white font-medium">{displayName}</span>
                                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </Button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="mt-2">
                                                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-4">
                                                            <h5 className="text-amber-400 font-medium">Monetary Cost</h5>
                                                            <InputField
                                                                label="Cost ($)"
                                                                name={`city_improvement_costs.${improvement}.money`}
                                                                value={config.city_improvement_costs?.[improvement]?.money}
                                                                onChange={onUpdate}
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                        
                                                        <div className="space-y-4">
                                                            <h5 className="text-blue-400 font-medium">Resource Requirements</h5>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {resourceTypes.map(resource => (
                                                                    <InputField
                                                                        key={resource}
                                                                        label={resource.charAt(0).toUpperCase() + resource.slice(1)}
                                                                        name={`city_improvement_costs.${improvement}.resources.${resource}`}
                                                                        value={config.city_improvement_costs?.[improvement]?.resources?.[resource]}
                                                                        onChange={onUpdate}
                                                                        placeholder="0"
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    );
                                })}
                            </div>
                        </TabsContent>

                        <TabsContent value="effects" className="mt-6">
                            <h4 className="text-md font-medium text-white mb-4">City Improvement Effects</h4>
                            <div className="space-y-6">
                                {improvementTypes.map(improvement => (
                                    <div key={improvement} className="p-4 bg-slate-700/50 rounded-lg">
                                        <h5 className="text-white font-medium mb-3 capitalize">
                                            {improvement.replace(/_/g, ' ')}
                                        </h5>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <InputField
                                                label="Income per Turn"
                                                name={`city_improvement_effects.${improvement}.income`}
                                                value={config.city_improvement_effects?.[improvement]?.income}
                                                onChange={onUpdate}
                                                placeholder="0"
                                            />
                                            <InputField
                                                label="Happiness Effect"
                                                name={`city_improvement_effects.${improvement}.happiness`}
                                                value={config.city_improvement_effects?.[improvement]?.happiness}
                                                onChange={onUpdate}
                                                placeholder="0"
                                            />
                                            <InputField
                                                label="Pollution Effect"
                                                name={`city_improvement_effects.${improvement}.pollution`}
                                                value={config.city_improvement_effects?.[improvement]?.pollution}
                                                onChange={onUpdate}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="production" className="mt-6">
                            <h4 className="text-md font-medium text-white mb-4">Resource Production Rates</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {resourceProductionTypes.map(resource => (
                                    <InputField
                                        key={resource}
                                        label={`${resource.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} (per turn)`}
                                        name={`resource_production_rates.${resource}`}
                                        value={config.resource_production_rates?.[resource]}
                                        onChange={onUpdate}
                                        placeholder="0"
                                    />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="limits" className="mt-6">
                            <h4 className="text-md font-medium text-white mb-4">General City Improvement Limits</h4>
                            <p className="text-slate-400 mb-6 text-sm">
                                Set the maximum number of a specific building type allowed in a single city. Leave blank for no limit.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {generalLimitImprovements.map(improvement => (
                                    <InputField
                                        key={improvement}
                                        label={improvement.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                        name={`city_improvement_limits.${improvement}`}
                                        value={config.city_improvement_limits?.[improvement]}
                                        onChange={onUpdate}
                                        placeholder="No Limit"
                                    />
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">Specific City Improvement Limits</CardTitle>
                    <CardDescription className="text-slate-400">
                        Set the maximum number of certain unique buildings allowed per city.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {specificLimitImprovements.map(improvement => (
                            <InputField
                                key={improvement}
                                label={improvement.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                name={`city_improvement_limits.${improvement}`}
                                value={config.city_improvement_limits?.[improvement]}
                                onChange={onUpdate}
                                placeholder="No Limit"
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

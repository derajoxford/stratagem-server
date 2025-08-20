
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Factory, Zap, AlertTriangle } from 'lucide-react';
import { InputField } from './shared/InputField'; // Import the new shared component

export default function RefinedResourceSettings({ config, onUpdate }) {
    if (!config) return null;

    // Complete list of all available resources that can be used as inputs
    const availableResources = [
        'oil', 'gasoline', 'iron', 'steel', 'aluminum', 'coal', 'uranium', 
        'food', 'gold', 'bauxite', 'copper', 'diamonds', 'wood', 'ammo'
    ];

    const refinedResources = ['steel', 'aluminum', 'ammo', 'gasoline'];

    const getResourceIcon = (resource) => {
        const icons = {
            oil: '🛢️', gasoline: '⛽', iron: '⚙️', steel: '🔩', aluminum: '🥤',
            coal: '⚫', uranium: '☢️', food: '🌾', gold: '🏆', bauxite: '🪨',
            copper: '🟫', diamonds: '💎', wood: '🪵', ammo: '🔫'
        };
        return icons[resource] || '📦';
    };

    const getResourceDisplayName = (resource) => {
        return resource.charAt(0).toUpperCase() + resource.slice(1);
    };

    const getBuildingDisplayName = (refinedResource) => {
        const names = {
            steel: 'Steel Mills',
            aluminum: 'Aluminum Smelters', 
            ammo: 'Ammunition Factories',
            gasoline: 'Oil Refineries'
        };
        return names[refinedResource] || refinedResource;
    };

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Factory className="w-5 h-5 text-purple-400" />
                    Refined Resource Production Recipes
                </CardTitle>
                <CardDescription>
                    Configure the input requirements and output quantities for refined resource production buildings.
                    Set any resource quantity to 0 if it's not required for that recipe.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {refinedResources.map(refinedResource => {
                    const recipe = config.refined_resource_recipes?.[refinedResource] || {};
                    const buildingName = getBuildingDisplayName(refinedResource);
                    
                    return (
                        <div key={refinedResource} className="p-6 border border-slate-700 rounded-lg bg-slate-800/50">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-2xl">{getResourceIcon(refinedResource)}</span>
                                <div>
                                    <h3 className="text-xl font-semibold text-white capitalize">
                                        {getResourceDisplayName(refinedResource)} Production
                                    </h3>
                                    <p className="text-slate-400 text-sm">Produced by: {buildingName}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Production Settings */}
                                <div className="space-y-4">
                                    <h4 className="font-medium text-amber-400 flex items-center gap-2">
                                        <Zap className="w-4 h-4" />
                                        Production Settings
                                    </h4>
                                    <InputField
                                        label="Output Quantity (per building)"
                                        name={`refined_resource_recipes.${refinedResource}.output_quantity`}
                                        value={recipe.output_quantity}
                                        onChange={onUpdate}
                                        description={`Amount of ${refinedResource} produced per ${buildingName.toLowerCase()} per turn`}
                                    />
                                    <InputField
                                        label="Power Required"
                                        name={`refined_resource_recipes.${refinedResource}.required_power`}
                                        value={recipe.required_power}
                                        onChange={onUpdate}
                                        description="Power consumption per building"
                                    />
                                    <InputField
                                        label="Pollution Factor"
                                        name={`refined_resource_recipes.${refinedResource}.pollution_factor`}
                                        value={recipe.pollution_factor}
                                        onChange={onUpdate}
                                        step="0.1"
                                        description="Pollution generated per building"
                                    />
                                </div>

                                {/* Required Input Resources */}
                                <div className="lg:col-span-2 space-y-4">
                                    <h4 className="font-medium text-blue-400 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Required Input Resources (per building per turn)
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {availableResources.map(resource => (
                                            <InputField
                                                key={resource}
                                                label={
                                                    <span className="flex items-center gap-1 text-xs">
                                                        <span>{getResourceIcon(resource)}</span>
                                                        {getResourceDisplayName(resource)}
                                                    </span>
                                                }
                                                name={`refined_resource_recipes.${refinedResource}.input_resources.${resource}`}
                                                value={recipe.input_resources?.[resource]}
                                                onChange={onUpdate}
                                                placeholder="0"
                                                min="0"
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Set to 0 for resources not required. These amounts will be consumed from your nation's stockpile for each {buildingName.toLowerCase()} every turn.
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-300">
                            <p className="font-medium mb-1">Production Logic:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>Raw resources are produced first each turn from mines, farms, etc.</li>
                                <li>Then, refined resource buildings attempt production using available stockpiled resources</li>
                                <li>If insufficient input resources are available, that building produces nothing that turn</li>
                                <li>Input resources are consumed from your stockpile when production occurs</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

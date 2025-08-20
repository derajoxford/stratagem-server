import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Zap, Factory } from 'lucide-react';
import { InputField } from './shared/InputField'; // Import the new shared component

export default function PowerPlantSettings({ config, onUpdate }) {
    if (!config) return null;

    const powerPlants = ['coal_power_plants', 'nuclear_power_plants'];

    const getPowerPlantDisplayName = (plantType) => {
        const names = {
            coal_power_plants: 'Coal Power Plants',
            nuclear_power_plants: 'Nuclear Power Plants'
        };
        return names[plantType] || plantType;
    };

    const getPowerPlantIcon = (plantType) => {
        return plantType === 'nuclear_power_plants' ? '☢️' : '⚫';
    };

    const availableResources = [
        'oil', 'gasoline', 'iron', 'steel', 'aluminum', 'coal', 'uranium',
        'food', 'gold', 'bauxite', 'copper', 'diamonds', 'wood', 'ammo'
    ];

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Power Plant Configuration
                </CardTitle>
                <CardDescription>
                    Configure power output and fuel consumption for power plants. Power plants consume fuel each turn to operate.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {powerPlants.map(plantType => {
                    const settings = config.power_plant_settings?.[plantType] || {};
                    const displayName = getPowerPlantDisplayName(plantType);
                    const icon = getPowerPlantIcon(plantType);

                    return (
                        <div key={plantType} className="p-6 border border-slate-700 rounded-lg bg-slate-800/50">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-2xl">{icon}</span>
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{displayName}</h3>
                                    <p className="text-slate-400 text-sm">Power generation and fuel requirements</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Power Output */}
                                <div className="space-y-4">
                                    <h4 className="font-medium text-yellow-400 flex items-center gap-2">
                                        <Factory className="w-4 h-4" />
                                        Power Generation
                                    </h4>
                                    <InputField
                                        label="Power Output (per plant)"
                                        name={`power_plant_settings.${plantType}.power_output`}
                                        value={settings.power_output}
                                        onChange={onUpdate}
                                        description="Amount of power this plant generates when fueled"
                                    />
                                </div>

                                {/* Fuel Consumption */}
                                <div className="space-y-4">
                                    <h4 className="font-medium text-red-400">Fuel Consumption (per turn)</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {availableResources.map(resource => {
                                            const consumption = settings.fuel_consumption_per_turn?.[resource] || 0;
                                            return (
                                                <InputField
                                                    key={resource}
                                                    label={resource.charAt(0).toUpperCase() + resource.slice(1)}
                                                    name={`power_plant_settings.${plantType}.fuel_consumption_per_turn.${resource}`}
                                                    value={consumption}
                                                    onChange={onUpdate}
                                                    description={`${resource} consumed per plant per turn`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}


import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Coins, Droplets, Zap, AlertTriangle, Package } from "lucide-react"; // Added Package
import { InputField } from './shared/InputField'; // Import the new shared component

export default function UnitSpecsSettings({ config, onUpdate }) {
    if (!config || !config.war_settings) return null;

    const unitTypes = ['soldiers', 'tanks', 'aircraft', 'warships'];
    const bombTypes = ['conventional_bombs', 'nuclear_weapons'];
    const allUnitTypes = [...unitTypes, ...bombTypes];

    const resourceTypes = [
        'oil', 'gasoline', 'iron', 'steel', 'aluminum', 'coal', 'uranium', 
        'food', 'gold', 'bauxite', 'copper', 'diamonds', 'wood', 'ammo'
    ];

    const getUnitDisplayName = (unit) => {
        return unit.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const ensureUnitCostStructure = (unit) => {
        const cost = config[`${unit}_cost`];
        if (!cost || typeof cost !== 'object') {
            return { money: 0, resources: {} };
        }
        return {
            money: cost.money || 0,
            resources: cost.resources || {}
        };
    };

    return (
        <div className="space-y-6">
            {/* Unit Costs */}
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Coins className="w-5 h-5 text-amber-400" />
                        Unit Production Costs
                    </CardTitle>
                    <CardDescription>
                        Configure the monetary and resource costs for producing each military unit type.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {allUnitTypes.map(unit => {
                        const unitCost = ensureUnitCostStructure(unit);
                        return (
                            <div key={unit} className="p-4 border border-slate-700 rounded-lg">
                                <h3 className="text-lg font-semibold text-white mb-4">{getUnitDisplayName(unit)}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-md font-medium text-amber-400 mb-2">Monetary Cost</h4>
                                        <InputField 
                                            label={`Cost ($)`} 
                                            name={`${unit}_cost.money`} 
                                            value={unitCost.money}
                                            onChange={onUpdate}
                                        />
                                    </div>
                                    <div>
                                        <h4 className="text-md font-medium text-blue-400 mb-2">Resource Costs</h4>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                            {resourceTypes.map(resource => (
                                                <InputField
                                                    key={resource}
                                                    label={resource.charAt(0).toUpperCase() + resource.slice(1)}
                                                    name={`${unit}_cost.resources.${resource}`}
                                                    value={unitCost.resources[resource]}
                                                    onChange={onUpdate}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Unit Storage Capacities */}
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-purple-400" />
                        Unit Storage Capacities
                    </CardTitle>
                    <CardDescription>
                        Set the maximum number of units that can be stored in different facility types.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Content for storage capacity configurations would go here if provided in the outline */}
                </CardContent>
            </Card>
        </div>
    );
}

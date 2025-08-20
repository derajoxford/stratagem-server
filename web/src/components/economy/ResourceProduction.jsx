
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Droplets, Gem, Shield, Layers, Box, Atom, Wheat, Coins, Diamond, TreePine, Factory } from "lucide-react";

const resourceIcons = {
    oil: <Droplets className="w-5 h-5 text-slate-400" />,
    iron: <Gem className="w-5 h-5 text-slate-500" />,
    steel: <Shield className="w-5 h-5 text-slate-300" />,
    aluminum: <Layers className="w-5 h-5 text-sky-400" />,
    coal: <Box className="w-5 h-5 text-black" />,
    uranium: <Atom className="w-5 h-5 text-green-400" />,
    food: <Wheat className="w-5 h-5 text-yellow-500" />,
    gold: <Coins className="w-5 h-5 text-yellow-400" />,
    bauxite: <Gem className="w-5 h-5 text-orange-300" />,
    copper: <Gem className="w-5 h-5 text-orange-500" />,
    diamonds: <Diamond className="w-5 h-5 text-cyan-300" />,
    wood: <TreePine className="w-5 h-5 text-lime-600" />
};

export default function ResourceProduction({ currentStockpile, productionPerTurn }) {
    if (!currentStockpile) return null;

    const allResourceKeys = Object.keys(resourceIcons);

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Factory className="w-6 h-6 text-purple-400" />
                    Resource Production
                </CardTitle>
                <CardDescription>
                    National stockpile and production per turn for all resources.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allResourceKeys.map(key => {
                        const stockpile = currentStockpile[key] || 0;
                        const production = productionPerTurn[key] || 0;
                        return (
                            <div key={key} className="p-3 bg-slate-900/50 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    {resourceIcons[key]}
                                    <span className="text-white font-medium capitalize">{key}</span>
                                </div>
                                <div className="text-xl font-bold text-white">{stockpile.toLocaleString()}</div>
                                <div className={`text-sm font-medium ${production > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                                    {production > 0 ? `+${production.toLocaleString()}` : production.toLocaleString()} / turn
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

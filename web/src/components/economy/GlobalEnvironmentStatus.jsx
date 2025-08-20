import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Cloud, Radiation } from 'lucide-react';

const StatItem = ({ icon, label, value, colorClass }) => (
    <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-slate-400">
            {icon}
            <span>{label}</span>
        </div>
        <span className={`font-medium ${colorClass}`}>{value}</span>
    </div>
);

export default function GlobalEnvironmentStatus({ gameState }) {
    const globalPollution = Math.round(gameState?.global_pollution_index || 0);
    const globalRadiation = Math.round(gameState?.global_radiation_index || 0);

    const getSeverityColor = (value, thresholds = [1000, 5000]) => {
        const [low, high] = thresholds;
        if (value <= low) return 'text-green-400';
        if (value <= high) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm h-full">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    Global Environment
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-xs text-slate-500 mb-4">
                    The overall health of the world, affecting all nations.
                </p>
                <StatItem 
                    icon={<Cloud className="w-4 h-4" />}
                    label="Pollution Index"
                    value={globalPollution.toLocaleString()}
                    colorClass={getSeverityColor(globalPollution)}
                />
                <StatItem 
                    icon={<Radiation className="w-4 h-4" />}
                    label="Radiation Index"
                    value={globalRadiation.toLocaleString()}
                    colorClass={getSeverityColor(globalRadiation, [500, 2000])}
                />
            </CardContent>
        </Card>
    );
}
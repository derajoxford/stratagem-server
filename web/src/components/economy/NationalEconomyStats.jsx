import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, TrendingUp, Sun, Users, Landmark, BarChart3, Globe } from 'lucide-react';

const StatCard = ({ title, value, icon, description }) => (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-white">{value}</div>
            {description && <p className="text-xs text-slate-500">{description}</p>}
        </CardContent>
    </Card>
);

export default function NationalEconomyStats({ nation, totalIncome, netDailyIncome, cities }) {
    const { population, gdp } = useMemo(() => {
        const totalPop = cities.reduce((sum, city) => sum + (city.population || 0), 0);
        // Simplified GDP calculation: Can be expanded later
        const calculatedGdp = totalIncome * (nation.population || totalPop) * 0.1;
        return { population: totalPop, gdp: calculatedGdp };
    }, [cities, totalIncome, nation]);

    return (
        <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-400"/>
                    National Economic Overview
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard 
                        title="National Treasury"
                        value={`$${(nation.treasury || 0).toLocaleString()}`}
                        icon={<Banknote className="h-4 w-4 text-green-400" />}
                        description="Total cash on hand."
                    />
                    <StatCard 
                        title="Net Income / Turn"
                        value={`$${(totalIncome || 0).toLocaleString()}`}
                        icon={<TrendingUp className="h-4 w-4 text-amber-400" />}
                        description="Income generated each turn."
                    />
                    <StatCard 
                        title="Est. Net Daily Income"
                        value={`$${(netDailyIncome || 0).toLocaleString()}`}
                        icon={<Sun className="h-4 w-4 text-amber-500" />}
                        description="Projected income over a full day."
                    />
                     <StatCard 
                        title="Population"
                        value={population.toLocaleString()}
                        icon={<Users className="h-4 w-4 text-slate-400" />}
                        description="Total citizens across all cities."
                    />
                </div>
            </CardContent>
        </Card>
    );
}
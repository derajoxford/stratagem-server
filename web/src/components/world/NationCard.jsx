import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Coins, Shield, Swords, BarChart, Info, ShieldBan } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function NationCard({ nation, onViewDetails, onDeclareWar }) {

    // Helper function to dynamically set badge color based on government type
    const getGovernmentColor = (type) => {
        if (!type) return 'text-slate-300'; // Safety check for undefined type
        switch (type.toLowerCase()) {
            case 'democracy': return 'text-blue-400';
            case 'monarchy': return 'text-yellow-400';
            case 'dictatorship': return 'text-red-400';
            case 'republic': return 'text-green-400';
            case 'communist': return 'text-purple-400';
            case 'theocracy': return 'text-indigo-400';
            default: return 'text-slate-300';
        }
    };

    return (
        <Card className="bg-slate-800/80 border-slate-700 hover:bg-slate-700/80 transition-colors flex flex-col justify-between">
            <div onClick={() => onViewDetails(nation)} className="cursor-pointer">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <CardTitle className="text-lg text-white">{nation.name}</CardTitle>
                            {nation.is_blockaded && (
                                <Badge variant="destructive" className="text-xs animate-pulse">
                                    <ShieldBan className="w-3 h-3 mr-1" />
                                    Blockaded
                                </Badge>
                            )}
                        </div>
                        <Badge variant="outline" className={`text-xs ${getGovernmentColor(nation.government_type)}`}>
                            {nation.government_type}
                        </Badge>
                    </div>
                    <p className="text-slate-400 text-sm">Led by {nation.leader_name}</p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-400"><Users className="w-4 h-4"/>Population</span>
                            <span className="font-medium text-white">{nation.population?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-400"><Coins className="w-4 h-4"/>Treasury</span>
                            <span className="font-medium text-white">${nation.treasury?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-400"><Shield className="w-4 h-4"/>Military</span>
                            <span className="font-medium text-white">{nation.military_strength?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-400"><BarChart className="w-4 h-4"/>Cities</span>
                            <span className="font-medium text-white">{nation.cities || '1'}</span>
                        </div>
                    </div>
                </CardContent>
            </div>
            <CardContent className="pt-0">
                 <div className="flex gap-2">
                    <Button 
                        asChild
                        variant="outline" 
                        size="sm" 
                        className="w-full border-slate-600 hover:bg-slate-700 hover:text-white"
                    >
                        <Link to={createPageUrl(`PublicNationProfile?nationId=${nation.id}`)} onClick={(e) => e.stopPropagation()}>
                            <Info className="w-4 h-4 mr-2" /> View Profile
                        </Link>
                    </Button>
                    {onDeclareWar && (
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeclareWar(nation);
                            }} 
                            className="w-full"
                        >
                            <Swords className="w-4 h-4 mr-2" /> War
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
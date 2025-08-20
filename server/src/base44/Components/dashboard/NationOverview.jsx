
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Building, Banknote, Map, Shield, Globe, Trash2, Loader2, ShieldBan } from "lucide-react";

export default function NationOverview({ nation, onDeleteNation, isDeleting }) {
  if (!nation) return null;

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
             <CardTitle className="text-amber-400 text-2xl">{nation.name}</CardTitle>
             {nation.is_blockaded && (
                <Badge variant="destructive" className="bg-red-900/80 border-red-500/50 text-red-300 animate-pulse">
                    <ShieldBan className="w-4 h-4 mr-2" />
                    Under Naval Blockade
                </Badge>
             )}
          </div>
          <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            <Globe className="w-3 h-3 mr-1.5" />
            {nation.government_type}
          </Badge>
        </div>
        <CardDescription className="text-slate-400 pt-2">Led by {nation.leader_name}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-slate-300">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-sm text-slate-400">Population</p>
              <p className="text-lg font-bold">{nation.population?.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building className="w-6 h-6 text-indigo-400" />
            <div>
              <p className="text-sm text-slate-400">Cities</p>
              <p className="text-lg font-bold">{nation.cities?.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Banknote className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-sm text-slate-400">Treasury</p>
              <p className="text-lg font-bold">${nation.treasury?.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Map className="w-6 h-6 text-orange-400" />
            <div>
              <p className="text-sm text-slate-400">Territory</p>
              <p className="text-lg font-bold">{nation.territory?.toLocaleString()} acres</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-sm text-slate-400">Military Strength</p>
              <p className="text-lg font-bold">{nation.military_strength?.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-slate-800/50 px-6 py-4 rounded-b-lg flex justify-end">
        <Button
            onClick={onDeleteNation}
            disabled={isDeleting}
            variant="destructive"
            className="bg-red-800/80 hover:bg-red-700/90 text-red-200 border border-red-600/50"
        >
            {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Trash2 className="mr-2 h-4 w-4" />
            )}
            Reset My Nation
        </Button>
      </CardFooter>
    </Card>
  );
}

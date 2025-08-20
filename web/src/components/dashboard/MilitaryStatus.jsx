import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield,
  Users,
  Truck,
  Plane,
  Ship,
  Bomb,
  Zap
} from "lucide-react";

const unitIcons = {
  soldiers: Users,
  tanks: Truck,
  aircraft: Plane,
  warships: Ship,
  conventional_bombs: Bomb,
  nuclear_weapons: Zap
};

const unitNames = {
  soldiers: "Soldiers",
  tanks: "Tanks", 
  aircraft: "Aircraft",
  warships: "Warships",
  conventional_bombs: "Conv. Bombs",
  nuclear_weapons: "Nukes"
};

export default function MilitaryStatus({ military }) {
  if (!military) {
    return (
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Military Forces
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">No military forces deployed</p>
        </CardContent>
      </Card>
    );
  }

  const unitTypes = ['soldiers', 'tanks', 'aircraft', 'warships', 'conventional_bombs', 'nuclear_weapons'];
  const totalUnits = unitTypes.reduce((sum, type) => sum + (military[type] || 0), 0);

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-400" />
          Military Forces
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-400 text-sm">Training Level</span>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            Level {military.training_level}
          </Badge>
        </div>

        <div className="space-y-3">
          {unitTypes.map((unitType) => {
            const Icon = unitIcons[unitType];
            const count = military[unitType] || 0;
            
            if (count === 0) return null;
            
            return (
              <div key={unitType} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-red-400" />
                  <span className="text-slate-300 text-sm">{unitNames[unitType]}</span>
                </div>
                <span className="text-white font-medium">{count.toLocaleString()}</span>
              </div>
            );
          })}
          
          {totalUnits === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">
              No military units deployed
            </p>
          )}
        </div>

        {military.military_investment > 0 && (
          <div className="pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total Investment</span>
              <span className="text-green-400 font-medium">
                ${military.military_investment.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
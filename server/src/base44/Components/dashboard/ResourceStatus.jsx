import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Droplets,
  Zap,
  Gem,
  Coins,
  Package,
  Wrench,
  Wheat,
  TreePine,
  Shell
} from "lucide-react";

const resourceIcons = {
  oil: Droplets,
  gasoline: Droplets,
  iron: Zap,
  steel: Wrench,
  aluminum: Package,
  coal: Package,
  uranium: Zap,
  food: Wheat,
  gold: Coins,
  bauxite: Package,
  copper: Zap,
  diamonds: Gem,
  wood: TreePine,
  ammo: Shell
};

const resourceColors = {
  oil: "text-blue-400",
  gasoline: "text-yellow-300",
  iron: "text-gray-400",
  steel: "text-slate-300",
  aluminum: "text-blue-300",
  coal: "text-gray-600",
  uranium: "text-green-400",
  food: "text-amber-400",
  gold: "text-yellow-400",
  bauxite: "text-orange-400",
  copper: "text-orange-300",
  diamonds: "text-purple-400",
  wood: "text-green-600",
  ammo: "text-red-400"
};

export default function ResourceStatus({ resources }) {
  if (!resources) {
    return (
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-green-400" />
            Resource Stockpiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">Loading resources...</p>
        </CardContent>
      </Card>
    );
  }

  const resourceKeys = Object.keys(resourceIcons).sort();

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-green-400" />
          Resource Stockpiles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {resourceKeys.map(resource => {
            const Icon = resourceIcons[resource] || Package;
            const color = resourceColors[resource] || "text-gray-400";
            const amount = resources[resource] || 0;
            
            return (
              <div key={resource} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-slate-300 capitalize text-sm">
                    {resource.replace('_', ' ')}
                  </span>
                </div>
                <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                  {amount.toLocaleString()}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

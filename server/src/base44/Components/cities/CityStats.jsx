
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  MapPin, 
  TrendingUp, 
  Smile, 
  Factory, 
  Zap,
  AlertTriangle,
  Biohazard, // New icon for pollution/fallout
  HeartPulse // New icon for health
} from "lucide-react";

export default function CityStats({ city }) {
  const totalBuildings = Object.values(city.infrastructure || {}).reduce((sum, count) => sum + count, 0);
  // FIX: Correctly calculate building slots based on 50 points per slot
  const totalBuildingSlots = Math.floor((city.infrastructure_slots || 0) / 50);
  const availableSlots = totalBuildingSlots - totalBuildings;
  
  // Calculate total power generation (this will be updated in gameTick to reflect actual fueled capacity)
  const coalPlants = city.infrastructure?.coal_power_plants || 0;
  const nuclearPlants = city.infrastructure?.nuclear_power_plants || 0;
  const totalPowerCapacity = (coalPlants * 1000) + (nuclearPlants * 2000); // Default values, actual will come from gameConfig
  
  // Power demand is simply the total infrastructure slots (points)
  const powerDemand = city.infrastructure_slots || 0;
  const hasPowerDeficit = totalPowerCapacity < powerDemand;

  // Helper for text color based on severity
  const getSeverityColor = (value, thresholds = [25, 50], reverse = false) => {
      const [low, high] = thresholds;
      if (reverse) { // For things like happiness where high is good
          if (value >= high) return 'text-green-400';
          if (value >= low) return 'text-yellow-400';
          return 'text-red-400';
      }
      // For things like pollution where low is good
      if (value <= low) return 'text-green-400';
      if (value <= high) return 'text-yellow-400';
      return 'text-red-400';
  };

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          City Vital Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-slate-700/50 rounded-lg">
            <div className="text-2xl font-bold text-white">{(city.population || 0).toLocaleString()}</div>
            <div className="text-sm text-slate-400">Population</div>
          </div>
          <div className="text-center p-3 bg-slate-700/50 rounded-lg">
            <div className="text-2xl font-bold text-green-400">${(city.income_per_turn || 0).toLocaleString()}</div>
            <div className="text-sm text-slate-400">Income/Turn</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Land Area</span>
            <span className="text-white">{city.land_area || 0} acres</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Building Slots</span>
            <span className={`font-medium ${availableSlots <= 0 ? 'text-red-400' : 'text-green-400'}`}>
              {availableSlots} available
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Power Status</span>
            {hasPowerDeficit ? (
              <div className="flex items-center gap-1 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Deficit</span>
              </div>
            ) : (
              <span className="text-green-400">Online</span>
            )}
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Power: {totalPowerCapacity.toLocaleString()} / {powerDemand.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Happiness</span>
            <div className="flex items-center gap-2">
              <span className={getSeverityColor(city.happiness || 0, [40, 70], true)}>{city.happiness || 0}%</span>
              <Smile className={`w-4 h-4 ${getSeverityColor(city.happiness || 0, [40, 70], true)}`} />
            </div>
          </div>
          {/* --- NEW: Health, Pollution, Fallout, Disease --- */}
          <div className="pt-3 mt-3 border-t border-slate-700"></div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Health Score</span>
            <div className="flex items-center gap-2">
                <span className={getSeverityColor(city.health_score || 100, [60, 80], true)}>{city.health_score || 100} / 100</span>
                <HeartPulse className={`w-4 h-4 ${getSeverityColor(city.health_score || 100, [60, 80], true)}`} />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Local Pollution</span>
            <span className={getSeverityColor(city.pollution_level || 0, [40, 70])}>
              {Math.round(city.pollution_level || 0)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Local Fallout</span>
            <span className={getSeverityColor(city.fallout_level || 0, [25, 50])}>
              {Math.round(city.fallout_level || 0)}%
            </span>
          </div>
          {city.disease_active && (
            <div className="flex justify-between items-center bg-red-900/50 p-2 rounded-md">
              <span className="text-red-400 font-bold">Disease Outbreak</span>
              <div className="flex items-center gap-2 text-red-300">
                <Biohazard className="w-4 h-4 animate-pulse" />
                <span>Active</span>
              </div>
            </div>
          )}
        </div>

        {city.specialization && city.specialization !== 'none' && (
          <div className="pt-3 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Specialization</span>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 capitalize">
                {city.specialization}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

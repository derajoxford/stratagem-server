import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  Building2, 
  MapPin,
  Zap,
  AlertTriangle
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from 'react-router-dom';

export default function CityCard({ city }) {
  const totalBuildings = Object.values(city.infrastructure || {}).reduce((sum, count) => sum + count, 0);
  const availableSlots = Math.floor(city.infrastructure_slots / 50) - totalBuildings;

  const powerCapacity = city.power_capacity || 0;
  const powerConsumption = city.infrastructure_slots || 0;
  const hasPowerDeficit = powerCapacity < powerConsumption;
  
  return (
    <Link to={createPageUrl(`CityDetails?id=${city.id}`)}>
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm hover:border-amber-500/50 transition-colors duration-300 h-full flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-white text-xl">{city.name}</CardTitle>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <MapPin className="w-3 h-3 mr-1" />
              {city.land_area} Acres
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Users className="w-4 h-4" />
                <span>Population</span>
              </div>
              <span className="text-white font-medium">{(city.population || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <TrendingUp className="w-4 h-4" />
                <span>Income</span>
              </div>
              <span className="text-green-400 font-medium">${(city.income_per_turn || 0).toLocaleString()}/turn</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="w-4 h-4" />
                <span>Building Slots</span>
              </div>
              <span className="text-white font-medium">{availableSlots} free</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Zap className="w-4 h-4" />
                <span>Power</span>
              </div>
              {hasPowerDeficit ? (
                <div className="flex items-center gap-1 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Deficit</span>
                </div>
              ) : (
                <span className="text-green-400 font-medium">Online</span>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-500 pt-3 mt-3 border-t border-slate-700">
            Click to manage city
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
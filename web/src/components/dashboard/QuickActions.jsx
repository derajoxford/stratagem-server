
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Building, 
  Shield, 
  Coins, 
  Users,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Nation, City } from "@/api/entities"; // Removed GameConfig import

export default function QuickActions({ nation, onUpdate, gameConfig: rawGameConfig }) { // Destructure and rename gameConfig prop
  // Parse gameConfig if it's a string, otherwise use it directly if it's an object.
  // This handles the new "flat JSON string storage" requirement.
  let gameConfig = null;
  if (typeof rawGameConfig === 'string') {
    try {
      gameConfig = JSON.parse(rawGameConfig);
    } catch (e) {
      console.error("Error parsing gameConfig string:", e);
      // If parsing fails, gameConfig remains null, which will trigger fallback logic in calculateCityCost.
    }
  } else if (rawGameConfig && typeof rawGameConfig === 'object') {
    // If it's already an object (e.g., from a development environment or if not yet stored as string), use it directly.
    gameConfig = rawGameConfig;
  }
  // If rawGameConfig is null/undefined or any other unexpected type, gameConfig will remain null.

  const calculateCityCost = (currentCities) => {
    // This logic correctly uses the parsed gameConfig object or falls back if it's null/undefined.
    if (gameConfig) {
      const baseCost = gameConfig.city_creation_base_cost || 500000;
      const scalingFactor = gameConfig.city_creation_scaling_factor || 1.5;
      return Math.floor(baseCost * Math.pow(scalingFactor, currentCities - 1));
    }
    // Fallback to original logic if config not loaded or in case of error
    const baseCost = 500000;
    const scalingFactor = 1.5;
    return Math.floor(baseCost * Math.pow(scalingFactor, currentCities - 1));
  };

  const handleBuyCity = async () => {
    const cost = calculateCityCost(nation.cities);
    
    if (nation.treasury >= cost) {
      try {
        const cityNumber = nation.cities + 1;
        // CRITICAL FIX: Explicitly define all infrastructure as 0 for new cities.
        const newCityPayload = {
          nation_id: nation.id,
          name: `City ${cityNumber}`,
          population: 25000 + Math.floor(Math.random() * 25000),
          land_area: 100 + Math.floor(Math.random() * 50),
          infrastructure_slots: 0,
          pollution_level: 0,
          happiness: 70 + Math.floor(Math.random() * 20),
          specialization: "none",
          infrastructure: {
              banks: 0, factories: 0, shopping_malls: 0, corporate_offices: 0, logistics_hubs: 0,
              hospitals: 0, schools: 0,
              coal_power_plants: 0, nuclear_power_plants: 0, uranium_mines: 0, coal_mines: 0, iron_mines: 0,
              steel_mills: 0, aluminum_smelters: 0, bauxite_mines: 0, oil_wells: 0, oil_refineries: 0,
              farms: 0, copper_mines: 0, gold_mines: 0, diamond_mines: 0, military_bases: 0,
              ground_armaments: 0, airports: 0, seaports: 0, forestry: 0, recycling_center: 0,
              stormwater_management: 0, public_transit: 0, ev_incentives: 0,
              ammunition_factories: 0, bomb_factories: 0, high_energy_weapons_center: 0
          },
          income_per_turn: 5000,
          daily_production: {}
        };
        
        console.log("Payload for new City.create (QuickActions):", newCityPayload);
        const newCity = await City.create(newCityPayload);

        // Update nation with new city
        await Nation.update(nation.id, {
          cities: nation.cities + 1,
          treasury: nation.treasury - cost,
          population: nation.population + newCity.population,
          territory: nation.territory + newCity.land_area
        });
        
        onUpdate();
      } catch (error) {
        console.error("Error buying city:", error);
      }
    }
  };

  const nextCityCost = calculateCityCost(nation.cities);
  const canAffordCity = nation.treasury >= nextCityCost;

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-amber-400" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Expand Territory</h4>
                <p className="text-sm text-slate-400">Build city #{nation.cities + 1}</p>
              </div>
              <Building className="w-5 h-5 text-blue-400" />
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Cost:</span>
              <span className={`font-medium ${canAffordCity ? 'text-green-400' : 'text-red-400'}`}>
                ${nextCityCost.toLocaleString()}
              </span>
              {!canAffordCity && <AlertCircle className="w-4 h-4 text-red-400" />}
            </div>
            
            <Button 
              onClick={handleBuyCity}
              disabled={!canAffordCity}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Build New City
            </Button>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-medium mb-3">Navigate To</h4>
            <div className="grid grid-cols-2 gap-2">
              <Link to={createPageUrl("Military")}>
                <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-700">
                  <Shield className="w-4 h-4 mr-1" />
                  Military
                </Button>
              </Link>
              
              <Link to={createPageUrl("Economy")}>
                <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-700">
                  <Coins className="w-4 h-4 mr-1" />
                  Economy
                </Button>
              </Link>
              
              <Link to={createPageUrl("Diplomacy")}>
                <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-700">
                  <Users className="w-4 h-4 mr-1" />
                  Diplomacy
                </Button>
              </Link>
              
              <Link to={createPageUrl("WarRoom")}>
                <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-700">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Wars
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

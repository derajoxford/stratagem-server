import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { City, Nation } from "@/entities/all";
import { Plus, Minus, Map } from 'lucide-react';

export default function ManageLand({ city, nation, resources, gameConfig, onUpdate }) {
  const landCost = (gameConfig?.city_creation_base_cost || 500000) / 100;
  const sellValue = landCost * ((gameConfig?.land_sell_percentage || 50) / 100);
  
  // FIXED: Check nation.treasury instead of resources.money
  const canAfford = (nation?.treasury || 0) >= landCost;

  const handleBuyLand = async () => {
    if (canAfford) {
      try {
        await Promise.all([
          City.update(city.id, { land_area: (city.land_area || 0) + 1 }),
          Nation.update(nation.id, { treasury: (nation.treasury || 0) - landCost })
        ]);
        onUpdate();
      } catch (error) {
        console.error("Error buying land:", error);
      }
    }
  };

  const handleSellLand = async () => {
    if ((city.land_area || 0) > 0) {
      try {
        await Promise.all([
          City.update(city.id, { land_area: (city.land_area || 0) - 1 }),
          Nation.update(nation.id, { treasury: (nation.treasury || 0) + sellValue })
        ]);
        onUpdate();
      } catch (error) {
        console.error("Error selling land:", error);
      }
    }
  };

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
            <Map className="w-5 h-5 text-green-400" />
            Manage Land
        </CardTitle>
        <CardDescription className="text-slate-400 pt-2">
          Expand your city's borders by purchasing more land.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center text-lg">
          <span className="text-slate-300">Current Land:</span>
          <span className="font-bold text-white">{city.land_area || 0} acres</span>
        </div>
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Cost to buy 1 acre:</span>
                <span className={`font-medium ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                    ${landCost.toLocaleString()}
                </span>
            </div>
            <Button onClick={handleBuyLand} disabled={!canAfford} className="w-full bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Buy Land
            </Button>
        </div>
        <div className="space-y-3 pt-3 border-t border-slate-700">
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Value to sell 1 acre:</span>
                <span className="font-medium text-green-400">
                    ${sellValue.toLocaleString()}
                </span>
            </div>
            <Button onClick={handleSellLand} disabled={(city.land_area || 0) === 0} variant="outline" className="w-full border-slate-600 hover:bg-slate-700">
                <Minus className="w-4 h-4 mr-2" />
                Sell Land
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

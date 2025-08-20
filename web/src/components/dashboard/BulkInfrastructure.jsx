
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Added Label import
import { Badge } from "@/components/ui/badge"; // Keep if used elsewhere, not directly in outline for this component
import {
  Building2,
  Coins,
  AlertTriangle
} from "lucide-react";
import { City, GameConfig, Nation } from "@/api/entities";

export default function BulkInfrastructure({ nation, cities, onUpdate }) {
  const [selectedCities, setSelectedCities] = useState([]);
  const [infrastructurePoints, setInfrastructurePoints] = useState(50);
  const [gameConfig, setGameConfig] = useState(null);
  const [isPurchasing, setIsPurchasing] = useState(false); // Renamed from isBuying
  const [feedback, setFeedback] = useState(null); // Added feedback state

  useEffect(() => {
    loadGameConfig();
  }, []);

  const loadGameConfig = async () => {
    try {
      const configs = await GameConfig.list();
      if (configs.length > 0) {
        setGameConfig(configs[0]);
      }
    } catch (error) {
      console.error("Error loading game config:", error);
      // Fallback config if loading fails to prevent runtime errors
      setGameConfig({
        infrastructure_cost_per_point: 1000,
        infrastructure_scaling_factor: 1.02,
        // No city_improvement_effects needed for this component's functionality
      });
    }
  };

  // Calculate scalable infrastructure cost for a single city
  const calculateCityInfrastructureCost = (points, currentInfra) => {
    if (!gameConfig) return points * 1000; // fallback
    
    const baseCost = gameConfig.infrastructure_cost_per_point || 1000;
    const scalingFactor = gameConfig.infrastructure_scaling_factor || 1.02;
    
    let totalCost = 0;
    for (let i = 0; i < points; i++) {
      const currentLevel = currentInfra + i;
      // Using Math.ceil to ensure cost is at least 1 and to avoid floating point issues
      const pointCost = Math.ceil(baseCost * Math.pow(scalingFactor, currentLevel));
      totalCost += pointCost;
    }
    
    return totalCost;
  };

  // Calculate total cost for all selected cities
  const calculateTotalCost = () => {
    return selectedCities.reduce((total, cityId) => {
      const city = cities.find(c => c.id === cityId);
      if (city) {
        return total + calculateCityInfrastructureCost(infrastructurePoints, city.infrastructure_slots);
      }
      return total;
    }, 0);
  };

  const totalCost = calculateTotalCost(); // Use new total cost calculation
  const canAfford = nation.treasury >= totalCost; // Updated canAfford

  const handleCityToggle = (cityId) => {
    setSelectedCities(prev => 
      prev.includes(cityId) 
        ? prev.filter(id => id !== cityId)
        : [...prev, cityId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCities.length === cities.length) {
      setSelectedCities([]); // Deselect all if all are selected
    } else {
      setSelectedCities(cities.map(city => city.id)); // Select all
    }
  };

  const handlePurchase = async () => { // Renamed from handleBulkBuy
    if (!canAfford || selectedCities.length === 0) return;

    setIsPurchasing(true);
    setFeedback(null); // Clear previous feedback
    try {
      const updatePromises = selectedCities.map(cityId => {
        const city = cities.find(c => c.id === cityId);
        // Ensure city exists before updating
        if (city) {
          return City.update(cityId, {
            infrastructure_slots: (city.infrastructure_slots || 0) + infrastructurePoints // Added default for robustness
          });
        }
        return Promise.resolve(); // Return a resolved promise for cities not found
      });

      updatePromises.push(
        Nation.update(nation.id, {
          treasury: nation.treasury - totalCost
        })
      );

      await Promise.all(updatePromises);

      setFeedback({ 
        type: 'success', 
        message: `Successfully purchased ${infrastructurePoints} infrastructure points for ${selectedCities.length} cities!` 
      });
      setSelectedCities([]);
      // Reset infrastructure points to default after successful purchase if desired, outline keeps it
      // setInfrastructurePoints(50); 
      onUpdate(); // Trigger a refresh of parent state
    } catch (error) {
      console.error("Error purchasing bulk infrastructure:", error);
      setFeedback({ type: 'error', message: 'Failed to purchase infrastructure.' });
    }
    setIsPurchasing(false);
  };

  // Remove handleBuild and associated states as per outline's implicit removal.
  // const [selectedBuildingType, setSelectedBuildingType] = useState('factory');
  // const [buildingQuantityPerCity, setBuildingQuantityPerCity] = useState(1);
  // const handleBuild = async () => { ... } // Removed

  // Display loading message if gameConfig is not yet loaded
  if (!gameConfig) {
    return (
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
        <CardContent className="py-8 text-center text-slate-400">
          Loading infrastructure costs...
        </CardContent>
      </Card>
    );
  }

  // No longer needed after implementing calculateCityInfrastructureCost
  // const costPerPoint = getInfrastructureCost();

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-purple-400" /> {/* Changed icon color to purple */}
          Bulk Infrastructure Purchase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {feedback && (
          <div className={`p-3 rounded-lg text-sm ${
            feedback.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {feedback.message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="bulk-infra-points" className="text-slate-300 mb-2 block">
              Infrastructure Points per City
            </Label>
            <Input
              id="bulk-infra-points" // Added id
              type="number"
              min="50"
              step="50"
              value={infrastructurePoints}
              onChange={(e) => setInfrastructurePoints(Math.max(50, parseInt(e.target.value) || 50))} // Ensure min 50
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-slate-300 text-sm font-medium">Select Cities</label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
                className="border-slate-600 text-slate-300"
              >
                {selectedCities.length === cities.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2"> {/* Added pr-2 for scrollbar */}
              {cities.map((city) => {
                const isSelected = selectedCities.includes(city.id);
                // Ensure city.infrastructure_slots is a number, default to 0
                const currentSlots = Math.floor((city.infrastructure_slots || 0) / 50);
                const newSlots = Math.floor(((city.infrastructure_slots || 0) + infrastructurePoints) / 50);
                const totalBuildings = Object.values(city.infrastructure || {}).reduce((sum, count) => sum + count, 0);
                const cityCost = calculateCityInfrastructureCost(infrastructurePoints, city.infrastructure_slots || 0);

                return (
                  <div 
                    key={city.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-amber-500 bg-amber-500/10' 
                        : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                    }`}
                    onClick={() => handleCityToggle(city.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleCityToggle(city.id)}
                          onClick={(e) => e.stopPropagation()} // Prevent click from toggling parent div
                          className="rounded h-4 w-4"
                        />
                        <div>
                          <div className="text-white font-medium">{city.name}</div>
                          <div className="text-xs text-slate-400">
                            {currentSlots} → {newSlots} slots ({totalBuildings} used)
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-400 font-medium">${cityCost.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">cost for this city</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedCities.length > 0 && (
            <div className="bg-slate-700/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Selected Cities:</span>
                <span className="text-white font-medium">{selectedCities.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Points per City:</span>
                <span className="text-white font-medium">{infrastructurePoints}</span>
              </div>
              <div className="border-t border-slate-600 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Total Cost:</span>
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className={`font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                      ${totalCost.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!canAfford && totalCost > 0 && (
            <div className="text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Insufficient funds. Need ${(totalCost - nation.treasury).toLocaleString()} more.
            </div>
          )}
        </div>

        <Button
          onClick={handlePurchase}
          disabled={!canAfford || selectedCities.length === 0 || isPurchasing}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50" // Changed color
        >
          {isPurchasing 
            ? "Purchasing..." 
            : selectedCities.length === 0
              ? "Select cities to purchase"
              : `Purchase for ${selectedCities.length} Cities - $${totalCost.toLocaleString()}`
          }
        </Button>

        <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <p className="text-blue-400 text-sm">
            <strong>Infrastructure Points:</strong> Purchase raw infrastructure capacity for your cities. 
            Every 50 points grants 1 building slot where you can construct specific improvements.
            The cost of infrastructure increases as your cities acquire more slots.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

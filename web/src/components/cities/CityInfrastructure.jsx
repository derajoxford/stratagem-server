
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Banknote,
  Wrench,
  Factory,
  Zap,
  Shield,
  HeartPulse,
  Leaf,
  University,
  Anchor,
  Crosshair,
  Atom,
  Building,
  DollarSign,
  Trash2,
  Loader2,
  ArrowLeftRight,
  Plus,
  Minus
} from "lucide-react";
import { Nation, GameState, FinancialTransaction, City, Resource } from '@/api/entities'; // Added Resource
import { ResourceTransaction } from "@/api/entities"; // Added ResourceTransaction

const categories = [
  { id: "commercial", name: "Commercial", icon: Banknote },
  { id: "industrial", name: "Industrial", icon: Factory },
  { id: "utilities", name: "Utilities", icon: Zap },
  { id: "public", name: "Public Services", icon: HeartPulse },
  { id: "military", name: "Military", icon: Shield },
];

const buildingDefinitions = {
  commercial: [
    { id: "banks", name: "Banks", icon: Banknote },
    { id: "shopping_malls", name: "Malls", icon: Building },
    { id: "corporate_offices", name: "Offices", icon: Building },
    { id: "logistics_hubs", name: "Logistics", icon: Anchor },
  ],
  industrial: [
    { id: "factories", name: "Factories", icon: Factory },
    { id: "oil_wells", name: "Oil Wells", icon: Wrench },
    { id: "oil_refineries", name: "Refineries", icon: Wrench },
    { id: "coal_mines", name: "Coal Mines", icon: Wrench },
    { id: "iron_mines", name: "Iron Mines", icon: Wrench },
    { id: "bauxite_mines", name: "Bauxite Mines", icon: Wrench },
    { id: "copper_mines", name: "Copper Mines", icon: Wrench },
    { id: "gold_mines", name: "Gold Mines", icon: Wrench },
    { id: "diamond_mines", name: "Diamond Mines", icon: Wrench },
    { id: "uranium_mines", name: "Uranium Mines", icon: Wrench },
    { id: "steel_mills", name: "Steel Mills", icon: Factory },
    { id: "aluminum_smelters", name: "Smelters", icon: Factory },
    { id: "forestry", name: "Forestry", icon: Leaf },
  ],
  utilities: [
    { id: "coal_power_plants", name: "Coal Power", icon: Zap },
    { id: "nuclear_power_plants", name: "Nuclear Power", icon: Atom },
    { id: "recycling_center", name: "Recycling", icon: Leaf },
    { id: "stormwater_management", name: "Stormwater", icon: Leaf },
    { id: "public_transit", name: "Transit", icon: Building },
    { id: "ev_incentives", name: "EV Incentives", icon: Leaf },
  ],
  public: [
    { id: "hospitals", name: "Hospitals", icon: HeartPulse },
    { id: "schools", name: "Schools", icon: University },
    { id: "farms", name: "Farms", icon: Leaf },
  ],
  military: [
    { id: "military_bases", name: "Bases", icon: Shield },
    { id: "ground_armaments", name: "Armaments", icon: Crosshair },
    { id: "airports", name: "Airports", icon: Crosshair },
    { id: "seaports", name: "Seaports", icon: Anchor },
    { id: "ammunition_factories", name: "Ammo Factories", icon: Shield },
    { id: "bomb_factories", name: "Bomb Factories", icon: Atom },
    { id: "high_energy_weapons_center", name: "HEW Center", icon: Atom },
  ],
};

// Default fallback values - now structured as objects with 'money' property and 'resources'
const defaultCosts = {
  banks: { money: 75000, resources: {} },
  factories: { money: 100000, resources: {} },
  shopping_malls: { money: 125000, resources: {} },
  corporate_offices: { money: 150000, resources: {} },
  logistics_hubs: { money: 175000, resources: {} },
  hospitals: { money: 200000, resources: {} },
  schools: { money: 225000, resources: {} },
  coal_power_plants: { money: 300000, resources: { coal: 500 } }, // Example resource cost
  nuclear_power_plants: { money: 3500000, resources: { uranium: 100 } }, // Example resource cost
  uranium_mines: { money: 2500000, resources: {} },
  coal_mines: { money: 750000, resources: {} },
  iron_mines: { money: 850000, resources: {} },
  steel_mills: { money: 1500000, resources: { iron_ore: 200, coal: 100 } }, // Example resource cost
  aluminum_smelters: { money: 1750000, resources: { bauxite: 250 } }, // Example resource cost
  bauxite_mines: { money: 900000, resources: {} },
  oil_wells: { money: 2000000, resources: {} },
  oil_refineries: { money: 2750000, resources: { crude_oil: 300 } }, // Example resource cost
  farms: { money: 500000, resources: {} },
  copper_mines: { money: 700000, resources: {} },
  gold_mines: { money: 1200000, resources: {} },
  diamond_mines: { money: 1800000, resources: {} },
  military_bases: { money: 2000000, resources: {} },
  ground_armaments: { money: 1250000, resources: { steel: 50, aluminum: 20 } }, // Example resource cost
  airports: { money: 3000000, resources: {} },
  seaports: { money: 2500000, resources: {} },
  forestry: { money: 600000, resources: {} },
  recycling_center: { money: 800000, resources: {} },
  stormwater_management: { money: 650000, resources: {} },
  public_transit: { money: 950000, resources: {} },
  ev_incentives: { money: 1100000, resources: {} },
  ammunition_factories: { money: 1400000, resources: { copper: 30, iron_ore: 10 } }, // Example resource cost
  bomb_factories: { money: 2200000, resources: { aluminum: 50, steel: 30 } }, // Example resource cost
  high_energy_weapons_center: { money: 4000000, resources: { uranium: 200, gold: 50 } } // Example resource cost
};


const defaultLimits = {
  banks: 5, factories: 8, shopping_malls: 6, corporate_offices: 4, logistics_hubs: 3,
  hospitals: 4, schools: 6, coal_power_plants: 5, nuclear_power_plants: 3,
  uranium_mines: 4, coal_mines: 6, iron_mines: 8, steel_mills: 4,
  aluminum_smelters: 3, bauxite_mines: 5, oil_wells: 6, oil_refineries: 2,
  farms: 12, copper_mines: 7, gold_mines: 4, diamond_mines: 2,
  military_bases: 3, ground_armaments: 5, airports: 2, seaports: 2,
  forestry: 8, recycling_center: 3, stormwater_management: 4,
  public_transit: 3, ev_incentives: 2, ammunition_factories: 4,
  bomb_factories: 2, high_energy_weapons_center: 1
};

export default function CityInfrastructure({ city, nation, gameConfig, onUpdate }) {
  // Initialize activeCategory from localStorage if available, otherwise use default
  const [activeCategory, setActiveCategory] = useState(() => {
    // Use city?.id to create a unique key for each city's tab state
    const localStorageKey = `cityInfrastructure_activeCategory_${city?.id}`;
    const savedCategory = localStorage.getItem(localStorageKey);
    return savedCategory || "commercial";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gameState, setGameState] = useState(null);

  // Save activeCategory to localStorage whenever it changes
  useEffect(() => {
    if (city?.id) { // Ensure city.id is available before attempting to save
      const localStorageKey = `cityInfrastructure_activeCategory_${city.id}`;
      localStorage.setItem(localStorageKey, activeCategory);
    }
  }, [activeCategory, city?.id]); // Depend on city.id to ensure unique key is used correctly

  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const states = await GameState.list();
        if (states.length > 0) {
          setGameState(states[0]);
        }
      } catch (err) {
        console.error("Failed to fetch game state:", err);
      }
    };
    fetchGameState();
  }, []);

  const handleBuild = async (buildingKey, cost) => {
    if (nation.treasury < cost.money) {
      setError("Not enough funds to build.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const currentTurn = gameState?.current_turn_number || 0;
      const newTreasury = nation.treasury - cost.money;
      const newInfrastructure = {
        ...city.infrastructure,
        [buildingKey]: (city.infrastructure[buildingKey] || 0) + 1,
      };

      // Check if there are resource costs
      const resourceCosts = cost.resources || {};
      const resourceTransactionPromises = [];

      let currentNationResources = null; // To hold the nation's current resources

      // Deduct resource costs if any
      if (Object.keys(resourceCosts).length > 0) {
        const nationResourcesArray = await Resource.filter({ nation_id: nation.id });
        if (nationResourcesArray.length > 0) {
          currentNationResources = nationResourcesArray[0];
          const updatedResources = { ...currentNationResources };

          // Pre-check if nation has enough resources
          for (const [resourceType, amount] of Object.entries(resourceCosts)) {
            if (amount > 0 && (currentNationResources[resourceType] || 0) < amount) {
              setError(`Not enough ${resourceType.replace(/_/g, ' ')} to build.`);
              setIsLoading(false);
              return; // Stop execution if resources are insufficient
            }
          }
          
          for (const [resourceType, amount] of Object.entries(resourceCosts)) {
            if (amount > 0) {
              const currentAmount = updatedResources[resourceType] || 0;
              const newAmount = Math.max(0, currentAmount - amount);
              updatedResources[resourceType] = newAmount;

              // Log resource transaction
              resourceTransactionPromises.push(
                ResourceTransaction.create({
                  nation_id: nation.id,
                  resource_type: resourceType,
                  transaction_type: 'outflow',
                  category: 'Building',
                  sub_category: `Build: ${buildingKey.replace(/_/g, ' ')}`,
                  amount: amount,
                  new_stockpile: newAmount,
                  related_entity_id: city.id,
                  turn_number: currentTurn
                })
              );
            }
          }

          // Update resources
          await Resource.update(currentNationResources.id, updatedResources);
        } else {
          setError("Nation resource data not found.");
          setIsLoading(false);
          return;
        }
      }

      // Execute all updates
      await Promise.all([
        Nation.update(nation.id, { treasury: newTreasury }),
        FinancialTransaction.create({
          nation_id: nation.id,
          transaction_type: 'outflow',
          category: 'Infrastructure',
          sub_category: `Build: ${buildingKey.replace(/_/g, ' ')}`,
          amount: cost.money,
          new_balance: newTreasury,
          related_entity_id: city.id,
          turn_number: currentTurn,
        }),
        ...resourceTransactionPromises
      ]);

      // Update the city
      const updatedCity = await City.update(city.id, { infrastructure: newInfrastructure });
      onUpdate(updatedCity, { treasury: newTreasury }); // onUpdate is triggered only for treasury and city, resources implicitly updated

    } catch (e) {
      console.error("Failed to build:", e);
      setError("An error occurred while building.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuildMax = async (buildingKey, cost, currentLevel, limit, slotsAvailable) => {
    // Calculate how many we can build
    const maxPossibleByLimit = limit - currentLevel;
    const maxPossibleBySlots = slotsAvailable;
    const maxPossibleByMoney = cost.money > 0 ? Math.floor(nation.treasury / cost.money) : 0; // Prevent division by zero
    
    // Check if there are resource costs and calculate max possible by resources
    const resourceCosts = cost.resources || {};
    let maxPossibleByResources = Infinity;
    if (Object.keys(resourceCosts).length > 0) {
      const nationResourcesArray = await Resource.filter({ nation_id: nation.id });
      if (nationResourcesArray.length > 0) {
        const currentNationResources = nationResourcesArray[0];
        for (const [resourceType, unitAmount] of Object.entries(resourceCosts)) {
          if (unitAmount > 0) {
            const currentAmount = currentNationResources[resourceType] || 0;
            maxPossibleByResources = Math.min(maxPossibleByResources, Math.floor(currentAmount / unitAmount));
          }
        }
      } else {
        setError("Nation resource data not found. Cannot calculate max buildable.");
        return;
      }
    }

    const maxToBuild = Math.min(maxPossibleByLimit, maxPossibleBySlots, maxPossibleByMoney, maxPossibleByResources);
    
    if (maxToBuild <= 0) {
      setError("Cannot build any more of this improvement.");
      return;
    }

    const totalCost = maxToBuild * cost.money;
    
    if (!window.confirm(`Build ${maxToBuild} ${buildingKey.replace(/_/g, ' ')} for $${totalCost.toLocaleString()}?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const currentTurn = gameState?.current_turn_number || 0;
      const newTreasury = nation.treasury - totalCost;
      const newInfrastructure = {
        ...city.infrastructure,
        [buildingKey]: currentLevel + maxToBuild,
      };

      // Check if there are resource costs
      const resourceTransactionPromises = [];
      
      if (Object.keys(resourceCosts).length > 0) {
        const currentNationResourcesArray = await Resource.filter({ nation_id: nation.id });
        if (currentNationResourcesArray.length > 0) {
          const currentNationResources = currentNationResourcesArray[0];
          const updatedResources = { ...currentNationResources };
          
          for (const [resourceType, unitAmount] of Object.entries(resourceCosts)) {
            if (unitAmount > 0) {
              const totalAmount = unitAmount * maxToBuild;
              const currentAmount = updatedResources[resourceType] || 0;
              const newAmount = Math.max(0, currentAmount - totalAmount);
              updatedResources[resourceType] = newAmount;

              // Log resource transaction
              resourceTransactionPromises.push(
                ResourceTransaction.create({
                  nation_id: nation.id,
                  resource_type: resourceType,
                  transaction_type: 'outflow',
                  category: 'Building',
                  sub_category: `Build Max: ${maxToBuild}x ${buildingKey.replace(/_/g, ' ')}`,
                  amount: totalAmount,
                  new_stockpile: newAmount,
                  related_entity_id: city.id,
                  turn_number: currentTurn
                })
              );
            }
          }

          await Resource.update(currentNationResources.id, updatedResources);
        }
      }

      // Execute all updates
      await Promise.all([
        Nation.update(nation.id, { treasury: newTreasury }),
        FinancialTransaction.create({
          nation_id: nation.id,
          transaction_type: 'outflow',
          category: 'Infrastructure',
          sub_category: `Build Max: ${maxToBuild}x ${buildingKey.replace(/_/g, ' ')}`,
          amount: totalCost,
          new_balance: newTreasury,
          related_entity_id: city.id,
          turn_number: currentTurn,
        }),
        ...resourceTransactionPromises
      ]);

      // Update the city
      const updatedCity = await City.update(city.id, { infrastructure: newInfrastructure });
      onUpdate(updatedCity, { treasury: newTreasury });

    } catch (e) {
      console.error("Failed to build max:", e);
      setError("An error occurred while building maximum.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSell = async (buildingKey, cost) => {
    setIsLoading(true);
    setError(null);

    try {
      const sellValue = Math.floor(cost.money * ((gameConfig.improvement_sell_percentage || 75) / 100));
      const currentTurn = gameState?.current_turn_number || 0;
      const newTreasury = nation.treasury + sellValue;
      const newInfrastructure = {
        ...city.infrastructure,
        [buildingKey]: city.infrastructure[buildingKey] - 1,
      };

      // Atomically update nation and log transaction
      await Promise.all([
        Nation.update(nation.id, { treasury: newTreasury }),
        FinancialTransaction.create({
          nation_id: nation.id,
          transaction_type: 'inflow',
          category: 'Infrastructure',
          sub_category: `Sell: ${buildingKey.replace(/_/g, ' ')}`,
          amount: sellValue,
          new_balance: newTreasury,
          related_entity_id: city.id,
          turn_number: currentTurn,
        }),
      ]);

      // Then update the city
      const updatedCity = await City.update(city.id, { infrastructure: newInfrastructure });
      onUpdate(updatedCity, { treasury: newTreasury });

    } catch (e) {
      console.error("Failed to sell:", e);
      setError("An error occurred while selling.");
    } finally {
      setIsLoading(false);
    }
  };

  const cityInfrastructure = city?.infrastructure || {};
  const totalBuildings = Object.values(cityInfrastructure).reduce((sum, count) => sum + count, 0);
  const totalBuildingSlots = Math.floor((city?.infrastructure_slots || 0) / 50); // Assuming 50 slots per infrastructure unit
  const slotsAvailable = totalBuildingSlots - totalBuildings;

  // Use fallback values if gameConfig properties are missing
  const costs = gameConfig?.city_improvement_costs || defaultCosts;
  const limits = gameConfig?.city_improvement_limits || defaultLimits;

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-amber-400" />
            City Improvements
          </CardTitle>
          <Badge className={slotsAvailable > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
            {slotsAvailable} building slots available
          </Badge>
        </div>
        <CardDescription className="text-slate-400 pt-2">
          Construct and upgrade buildings to boost your city's economy, happiness, and military capabilities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-4 mb-4">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "secondary" : "ghost"}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 ${activeCategory === category.id ? 'bg-amber-500/20 text-amber-400' : 'text-slate-300'}`}
              disabled={isLoading}
            >
              <category.icon className="w-4 h-4" />
              {category.name}
            </Button>
          ))}
        </div>
        
        <div className="space-y-3">
          {buildingDefinitions[activeCategory]?.map((building) => {
            const currentLevel = cityInfrastructure[building.id] || 0;
            const cost = costs[building.id] || { money: 0, resources: {} };
            const limit = limits[building.id] || 1;
            const canAffordMoney = nation.treasury >= cost.money;

            // Check resource affordability
            let canAffordResources = true;
            if (cost.resources && Object.keys(cost.resources).length > 0) {
              // This is a simplified check for display, actual check is done in handleBuild/Max
              // For a more robust display, we'd fetch resources here, but that's expensive.
              // For now, assume resources are managed by the build logic and just display if cost exists.
              // If you want actual resource checks here, you'd need current nation resource state.
            }
            
            const canBuild = currentLevel < limit && canAffordMoney && canAffordResources && slotsAvailable > 0;
            
            // Calculate max buildable (for display purposes, resource check is simplified)
            const maxPossibleByLimit = limit - currentLevel;
            const maxPossibleBySlots = slotsAvailable;
            const maxPossibleByMoney = cost.money > 0 ? Math.floor(nation.treasury / cost.money) : 0;
            
            // Simplified max by resources for display (doesn't fetch current resources)
            // A more accurate maxBuildable for resources would require fetching `nation.resources`
            // and checking `Math.floor(nation.resources[type] / cost.resources[type])` for each resource.
            // For now, only money, limit, and slots are used for max calculation in UI.
            const maxBuildable = Math.min(maxPossibleByLimit, maxPossibleBySlots, maxPossibleByMoney);
            
            return (
              <div key={building.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <building.icon className="w-4 h-4 text-slate-400" />
                    <span className="text-white font-medium">{building.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {currentLevel}/{limit}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-400">
                    Cost: ${cost.money ? cost.money.toLocaleString() : '0'}
                    {Object.keys(cost.resources || {}).length > 0 && (
                      <span className="ml-2">
                        {Object.entries(cost.resources).map(([resourceType, amount]) => (
                          <span key={resourceType} className="mr-1">
                            {amount} {resourceType.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </span>
                    )}
                    {maxBuildable > 1 && (
                      <span className="ml-2 text-blue-400">
                        (Max: {maxBuildable} for ${(maxBuildable * cost.money).toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleSell(building.id, cost)}
                    disabled={currentLevel === 0 || isLoading}
                    className="p-2"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  {maxBuildable > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      // Pass current nation resources for accurate max buildable calculation
                      onClick={() => handleBuildMax(building.id, cost, currentLevel, limit, slotsAvailable)}
                      disabled={maxBuildable === 0 || isLoading}
                      className="px-3 py-2 border-blue-500 hover:bg-blue-600 text-blue-400"
                    >
                      Max
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleBuild(building.id, cost)}
                    disabled={!canBuild || isLoading}
                    className="p-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

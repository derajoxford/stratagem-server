import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, DollarSign, Zap, Loader2 } from 'lucide-react';

// Default fallback values for missing config properties
const defaultCosts = {
  banks: 75000,
  factories: 100000,
  shopping_malls: 125000,
  corporate_offices: 150000,
  logistics_hubs: 175000,
  hospitals: 200000,
  schools: 225000,
  coal_power_plants: 300000,
  nuclear_power_plants: 3500000,
  uranium_mines: 2500000,
  coal_mines: 750000,
  iron_mines: 850000,
  steel_mills: 1500000,
  aluminum_smelters: 1750000,
  bauxite_mines: 900000,
  oil_wells: 2000000,
  oil_refineries: 2750000,
  farms: 500000,
  copper_mines: 700000,
  gold_mines: 1200000,
  diamond_mines: 1800000,
  military_bases: 2000000,
  ground_armaments: 1250000,
  airports: 3000000,
  seaports: 2500000,
  forestry: 600000,
  recycling_center: 800000,
  stormwater_management: 650000,
  public_transit: 950000,
  ev_incentives: 1100000,
  ammunition_factories: 1400000,
  bomb_factories: 2200000,
  high_energy_weapons_center: 4000000
};

const defaultLimits = {
  banks: 5,
  factories: 8,
  shopping_malls: 6,
  corporate_offices: 4,
  logistics_hubs: 3,
  hospitals: 4,
  schools: 6,
  coal_power_plants: 5,
  nuclear_power_plants: 3,
  uranium_mines: 4,
  coal_mines: 6,
  iron_mines: 8,
  steel_mills: 4,
  aluminum_smelters: 3,
  bauxite_mines: 5,
  oil_wells: 6,
  oil_refineries: 2,
  farms: 12,
  copper_mines: 7,
  gold_mines: 4,
  diamond_mines: 2,
  military_bases: 3,
  ground_armaments: 5,
  airports: 2,
  seaports: 2,
  forestry: 8,
  recycling_center: 3,
  stormwater_management: 4,
  public_transit: 3,
  ev_incentives: 2,
  ammunition_factories: 4,
  bomb_factories: 2,
  high_energy_weapons_center: 1
};

const buildingCategories = {
  commercial: {
    name: 'Commercial',
    icon: DollarSign,
    buildings: ['banks', 'shopping_malls', 'corporate_offices', 'logistics_hubs']
  },
  industrial: {
    name: 'Industrial', 
    icon: DollarSign,
    buildings: ['factories', 'steel_mills', 'aluminum_smelters', 'oil_refineries', 'ammunition_factories', 'bomb_factories']
  },
  utilities: {
    name: 'Utilities',
    icon: Zap,
    buildings: ['coal_power_plants', 'nuclear_power_plants', 'recycling_center', 'stormwater_management', 'public_transit', 'ev_incentives']
  },
  public_services: {
    name: 'Public Services',
    icon: DollarSign,
    buildings: ['hospitals', 'schools']
  },
  military: {
    name: 'Military',
    icon: DollarSign,
    buildings: ['military_bases', 'ground_armaments', 'high_energy_weapons_center']
  },
  resources: {
    name: 'Resource Extraction',
    icon: DollarSign,
    buildings: ['uranium_mines', 'coal_mines', 'iron_mines', 'bauxite_mines', 'oil_wells', 'farms', 'copper_mines', 'gold_mines', 'diamond_mines', 'forestry']
  },
  infrastructure: {
    name: 'Transportation',
    icon: DollarSign,
    buildings: ['airports', 'seaports']
  }
};

const buildingNames = {
  banks: 'Banks',
  factories: 'Factories',
  shopping_malls: 'Shopping Malls',
  corporate_offices: 'Corporate Offices',
  logistics_hubs: 'Logistics Hubs',
  hospitals: 'Hospitals',
  schools: 'Schools',
  coal_power_plants: 'Coal Power Plants',
  nuclear_power_plants: 'Nuclear Power Plants',
  uranium_mines: 'Uranium Mines',
  coal_mines: 'Coal Mines',
  iron_mines: 'Iron Mines',
  steel_mills: 'Steel Mills',
  aluminum_smelters: 'Aluminum Smelters',
  bauxite_mines: 'Bauxite Mines',
  oil_wells: 'Oil Wells',
  oil_refineries: 'Oil Refineries',
  farms: 'Farms',
  copper_mines: 'Copper Mines',
  gold_mines: 'Gold Mines',
  diamond_mines: 'Diamond Mines',
  military_bases: 'Military Bases',
  ground_armaments: 'Ground Armaments',
  airports: 'Airports',
  seaports: 'Seaports',
  forestry: 'Forestry',
  recycling_center: 'Recycling Centers',
  stormwater_management: 'Stormwater Management',
  public_transit: 'Public Transit',
  ev_incentives: 'EV Incentives',
  ammunition_factories: 'Ammunition Factories',
  bomb_factories: 'Bomb Factories',
  high_energy_weapons_center: 'High Energy Weapons Center'
};

export default function BuildingCategory({ 
  category, 
  city, 
  nation, 
  resources, 
  gameConfig, 
  onUpdate 
}) {
  // Use fallback values if gameConfig properties are missing
  const costs = gameConfig?.city_improvement_costs || defaultCosts;
  const limits = gameConfig?.city_improvement_limits || defaultLimits;
  
  // If we still don't have the essential data, show loading
  if (!city || !nation || !costs || !limits) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400 mr-2" />
        <span className="text-slate-400">Loading nation data...</span>
      </div>
    );
  }

  const categoryData = buildingCategories[category];
  if (!categoryData) return null;

  const { name, icon: Icon, buildings } = categoryData;
  const cityInfrastructure = city.infrastructure || {};

  const handleBuild = async (buildingType) => {
    const cost = costs[buildingType] || 0;
    const currentLevel = cityInfrastructure[buildingType] || 0;
    const limit = limits[buildingType] || 1;

    if (currentLevel >= limit) {
      alert(`Maximum level reached for ${buildingNames[buildingType]}`);
      return;
    }

    if (nation.treasury < cost) {
      alert('Insufficient funds');
      return;
    }

    try {
      // Update city infrastructure
      const updatedInfrastructure = {
        ...cityInfrastructure,
        [buildingType]: currentLevel + 1
      };

      await Promise.all([
        // Update city infrastructure
        City.update(city.id, { infrastructure: updatedInfrastructure }),
        // Deduct cost from nation treasury
        Nation.update(nation.id, { treasury: nation.treasury - cost })
      ]);

      onUpdate();
    } catch (error) {
      console.error('Error building infrastructure:', error);
      alert('Failed to build infrastructure. Please try again.');
    }
  };

  const handleDestroy = async (buildingType) => {
    const currentLevel = cityInfrastructure[buildingType] || 0;
    
    if (currentLevel <= 0) return;

    if (!confirm(`Are you sure you want to destroy one ${buildingNames[buildingType]}? This action cannot be undone.`)) {
      return;
    }

    try {
      const updatedInfrastructure = {
        ...cityInfrastructure,
        [buildingType]: Math.max(0, currentLevel - 1)
      };

      await City.update(city.id, { infrastructure: updatedInfrastructure });
      onUpdate();
    } catch (error) {
      console.error('Error destroying infrastructure:', error);
      alert('Failed to destroy infrastructure. Please try again.');
    }
  };

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {buildings.map((buildingType) => {
          const currentLevel = cityInfrastructure[buildingType] || 0;
          const cost = costs[buildingType] || 0;
          const limit = limits[buildingType] || 1;
          const canAfford = nation.treasury >= cost;
          const canBuild = currentLevel < limit && canAfford;

          return (
            <div key={buildingType} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{buildingNames[buildingType]}</span>
                  <Badge variant="outline" className="text-xs">
                    {currentLevel}/{limit}
                  </Badge>
                </div>
                <div className="text-sm text-slate-400">
                  Cost: ${cost.toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDestroy(buildingType)}
                  disabled={currentLevel === 0}
                  className="p-2"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBuild(buildingType)}
                  disabled={!canBuild}
                  className="p-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

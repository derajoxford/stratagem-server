
import React, { useState, useEffect, useCallback } from "react";
import { City, Nation, Resource, User, GameConfig } from "@/entities/all";
import {
  Loader2,
  Building2,
  Users,
  MapPin,
  TrendingUp,
  Smile,
  AlertTriangle,
  ArrowLeft,
  Edit3,
  Trash2,
  Copy,
  Save,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Import all necessary components
import ManageInfrastructure from "../components/cities/ManageInfrastructure";
import ManageLand from "../components/cities/ManageLand";
import CityInfrastructure from "../components/cities/CityInfrastructure";
import CityStats from "../components/cities/CityStats";
import CopyCityBuildModal from "../components/cities/CopyCityBuildModal";
import BulkCityManagement from "../components/cities/BulkCityManagement"; // New import

import { defaultGameConfig } from '@/pages/Admin';

// --- City List View Component (Enhanced with Bulk Management) ---
const CityListView = ({ nation, cities, gameConfig, onCitySelect, onUpdate }) => (
  <div className="p-6 md:p-8">
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">City Management</h1>
          <p className="text-slate-400 text-lg">Develop and customize your {nation.name} cities</p>
        </div>
        <div className="flex gap-3">
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{cities.length} Cities</Badge>
        </div>
      </div>

      {/* Bulk City Management Section */}
      <BulkCityManagement 
        nation={nation}
        cities={cities}
        gameConfig={gameConfig}
        onUpdate={onUpdate}
      />

      {/* Cities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cities.map((city) => (
          <div key={city.id} onClick={() => onCitySelect(city.id)} className="cursor-pointer">
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm hover:border-amber-500/50 transition-colors duration-300 h-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-white text-xl">{city.name}</CardTitle>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    <MapPin className="w-3 h-3 mr-1" />
                    {city.land_area || 0} Acres
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400"><Users className="w-4 h-4" /><span>Population</span></div>
                  <span className="text-white font-medium">{(city.population || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400"><TrendingUp className="w-4 h-4" /><span>Income</span></div>
                  <span className="text-green-400 font-medium">${(city.income_per_turn || 0).toLocaleString()}/turn</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400"><Smile className="w-4 h-4" /><span>Happiness</span></div>
                  <span className="text-white font-medium">{city.happiness || 0}%</span>
                </div>
                <div className="text-xs text-slate-500 pt-3 mt-3 border-t border-slate-700">Click to manage city</div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// --- City Detail View Component (SIMPLIFIED - DUMB COMPONENT) ---
const CityDetailView = ({ city, nation, resources, gameConfig, allCities, onBack, onUpdate }) => {
  const [currentCity, setCurrentCity] = useState(city);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newCityName, setNewCityName] = useState(city.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  // Update internal state if the city prop changes from parent
  useEffect(() => {
    setCurrentCity(city);
    setNewCityName(city.name);
  }, [city]);

  const handleRenameCity = async () => {
    if (!newCityName.trim() || newCityName.trim() === currentCity.name) {
      setIsRenaming(false);
      return;
    }
    try {
      await City.update(currentCity.id, { name: newCityName.trim() });
      setCurrentCity(prev => ({ ...prev, name: newCityName.trim() }));
      setIsRenaming(false);
      onUpdate(); // Tell parent to refresh all data
    } catch (e) { console.error(e); }
  };

  const handleDeleteCity = async () => {
    if (window.confirm(`Are you sure you want to PERMANENTLY delete ${currentCity.name}? This action is irreversible.`)) {
      setIsDeleting(true);
      try {
        await City.delete(currentCity.id);
        await Nation.update(nation.id, { cities: Math.max(0, nation.cities - 1) });
        onBack(); // Go back to the list view
      } catch (error) {
        console.error("Failed to delete city:", error);
        setIsDeleting(false);
      }
    }
  };

  const handleCopyToOtherCities = async (sourceCityId, targetCityIds) => {
    // We can use currentCity directly as it's the source city for this detail view
    const sourceCity = currentCity;
    if (!sourceCity) {
      alert("Source city data not available for copy operation.");
      setShowCopyModal(false);
      return;
    }

    let totalCost = 0;
    const resourceDeltas = {};

    // First pass: Calculate total costs and check sufficiency
    for (const targetCityId of targetCityIds) {
        const targetCity = allCities.find(c => c.id === targetCityId);
        if (!targetCity) continue;

        const sourceInfra = sourceCity.infrastructure || {};
        const targetInfra = targetCity.infrastructure || {};

        for (const [buildingId, sourceLevel] of Object.entries(sourceInfra)) {
            const currentLevel = targetInfra[buildingId] || 0;
            const limit = gameConfig?.city_improvement_limits?.[buildingId] || Infinity;
            
            // Only consider upgrading, not downgrading
            if (sourceLevel > currentLevel) {
                // Calculate levels to build, capped by global limit and source level
                const levelsToReach = Math.min(sourceLevel, limit);
                const levelsToBuild = levelsToReach - currentLevel;
                
                if (levelsToBuild <= 0) continue;

                const costConfig = gameConfig?.city_improvement_costs?.[buildingId] || {};
                totalCost += (costConfig.money || 0) * levelsToBuild;

                if (costConfig.resources) {
                    for (const [res, amount] of Object.entries(costConfig.resources)) {
                        resourceDeltas[res] = (resourceDeltas[res] || 0) + (amount * levelsToBuild);
                    }
                }
            }
        }
    }
    
    // Check if nation has sufficient funds and resources
    if (nation.treasury < totalCost) {
        alert("Insufficient funds for this operation. Please check your nation's treasury.");
        setShowCopyModal(false);
        return;
    }
    for (const [res, amount] of Object.entries(resourceDeltas)) {
        if ((resources[res] || 0) < amount) {
            alert(`Insufficient ${res} for this operation. Please check your nation's resources.`);
            setShowCopyModal(false);
            return;
        }
    }

    // Second pass: Apply updates and deduct costs
    try {
        for (const targetCityId of targetCityIds) {
            const targetCity = allCities.find(c => c.id === targetCityId);
            if (!targetCity) continue;
            
            const sourceInfra = sourceCity.infrastructure || {};
            let updatedInfra = { ...(targetCity.infrastructure || {}) };

            for (const [buildingId, sourceLevel] of Object.entries(sourceInfra)) {
                const currentLevel = updatedInfra[buildingId] || 0;
                const limit = gameConfig?.city_improvement_limits?.[buildingId] || Infinity;
                
                if (sourceLevel > currentLevel) {
                     // Ensure we update to the sourceLevel, but not exceeding the global limit
                     updatedInfra[buildingId] = Math.min(sourceLevel, limit);
                }
            }
            await City.update(targetCity.id, { infrastructure: updatedInfra });
        }

        // Deduct costs after all city updates are (optimistically) successful
        const newResources = { ...resources };
        for (const [res, amount] of Object.entries(resourceDeltas)) {
            newResources[res] = (newResources[res] || 0) - amount;
        }

        await Nation.update(nation.id, { treasury: nation.treasury - totalCost });
        await Resource.update(resources.id, newResources); // Assuming `resources` object has an `id` field for the nation's resource entry
        
        onUpdate(); // Refresh all data in the parent component
        alert("City builds copied successfully!");
    } catch (error) {
        console.error("Error during build copy operation:", error);
        alert(`Failed to copy city build: ${error.message || "An unknown error occurred."}`);
    } finally {
        setShowCopyModal(false); // Close modal regardless of success or failure
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" onClick={onBack} className="border-slate-600 hover:bg-slate-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to City List
          </Button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Building2 className="w-10 h-10 text-amber-400" />
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <Input value={newCityName} onChange={e => setNewCityName(e.target.value)} className="bg-slate-700 border-slate-600" />
                <Button size="icon" onClick={handleRenameCity} className="bg-green-600 hover:bg-green-700"><Save className="w-4 h-4" /></Button>
                <Button size="icon" variant="destructive" onClick={() => setIsRenaming(false)}><X className="w-4 h-4" /></Button>
              </div>
            ) : (
              <h1 className="text-3xl md:text-4xl font-bold text-white">{currentCity.name}</h1>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCopyModal(true)} className="border-slate-600">
                <Copy className="w-4 h-4 mr-2" />
                Copy Build
            </Button>
            {!isRenaming && <Button size="sm" variant="outline" onClick={() => setIsRenaming(true)} className="border-slate-600"><Edit3 className="w-4 h-4 mr-2" />Rename</Button>}
            <Button size="sm" variant="destructive" onClick={handleDeleteCity} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4 mr-2" />}
              {isDeleting ? 'Deleting...' : 'Delete City'}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CityStats city={currentCity} gameConfig={gameConfig} />
            <CityInfrastructure city={currentCity} nation={nation} resources={resources} gameConfig={gameConfig} onUpdate={onUpdate} onShowCopyModal={() => setShowCopyModal(true)} />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <ManageInfrastructure city={currentCity} nation={nation} resources={resources} gameConfig={gameConfig} onUpdate={onUpdate} />
            <ManageLand city={currentCity} nation={nation} resources={resources} gameConfig={gameConfig} onUpdate={onUpdate} />
          </div>
        </div>
      </div>
      {showCopyModal && (
        <CopyCityBuildModal
            isOpen={showCopyModal}
            onClose={() => setShowCopyModal(false)}
            sourceCity={currentCity}
            allCities={allCities}
            onCopyToCities={handleCopyToOtherCities}
        />
      )}
    </div>
  );
};

// --- Main Page Component (Updated to pass gameConfig to CityListView) ---
export default function CitiesPage() {
  const [nation, setNation] = useState(null);
  const [allCities, setAllCities] = useState([]);
  const [resources, setResources] = useState(null);
  const [gameConfig, setGameConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCityId, setSelectedCityId] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await User.me();
      const nations = await Nation.filter({ created_by: user.email, active: true });
      if (nations.length > 0) {
        const userNation = nations[0];
        setNation(userNation);

        const [cityData, resourceData, configDataEntities] = await Promise.all([
          City.filter({ nation_id: userNation.id }),
          Resource.filter({ nation_id: userNation.id }),
          GameConfig.list(),
        ]);
        
        setAllCities(cityData);
        setResources(resourceData[0] || {});

        if (configDataEntities && configDataEntities.length > 0 && configDataEntities[0].config_data_json) {
            try {
              setGameConfig(JSON.parse(configDataEntities[0].config_data_json));
            } catch (e) {
              console.error("Failed to parse gameConfig JSON:", e);
              setGameConfig(defaultGameConfig);
            }
        } else {
            setGameConfig(defaultGameConfig);
        }

      } else {
        setNation(null);
        setAllCities([]);
      }
    } catch (e) {
      setError(e.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBackToList = () => {
    setSelectedCityId(null);
    loadData(); // Refresh list data when coming back
  };
  
  if (isLoading) {
    return <div className="p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-amber-400 mx-auto" /></div>;
  }
  
  if (error) {
    return <div className="p-8 text-center text-red-400">{error}</div>;
  }

  if (!nation) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <Building2 className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">No Nation Found</h1>
          <p className="text-slate-400">Please create a nation first to manage cities.</p>
        </div>
      </div>
    );
  }

  if (selectedCityId) {
    const selectedCity = allCities.find(c => c.id === selectedCityId);
    // Important: Only render the detail view if ALL data is ready AND the city exists
    if (!selectedCity || !gameConfig) {
      return <div className="p-8 text-center"><Loader2 className="h-12 w-12 animate-spin text-amber-400 mx-auto" /><p>Preparing city data...</p></div>;
    }
    return <CityDetailView 
              city={selectedCity}
              nation={nation} 
              resources={resources}
              gameConfig={gameConfig}
              allCities={allCities}
              onBack={handleBackToList}
              onUpdate={loadData} // Pass loadData to refresh EVERYTHING on update
            />;
  }
  
  return <CityListView 
           nation={nation} 
           cities={allCities} 
           gameConfig={gameConfig}
           onCitySelect={setSelectedCityId} 
           onUpdate={loadData}
         />;
}

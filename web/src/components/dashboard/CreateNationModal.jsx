
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Nation, Military, Resource, User, GameState, GameConfig, City } from "@/api/entities";
import { Globe, Loader2 } from "lucide-react";
// defaultGameConfig will be dynamically imported inside handleCreateNation now.

const governmentTypes = [
  { value: "democracy", label: "Democracy" },
  { value: "republic", label: "Republic" },
  { value: "monarchy", label: "Monarchy" },
  { value: "dictatorship", label: "Dictatorship" },
  { value: "federation", label: "Federation" }
];

export default function CreateNationModal({ onNationCreated }) {
  const [name, setName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [governmentType, setGovernmentType] = useState("democracy");
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleCreateNation = async (e) => {
    e.preventDefault();
    if (!name || !leaderName) return;

    setIsCreating(true);
    setFeedback("Initializing game state...");
    try {
      // Get current user first to ensure we have the right user context
      const currentUser = await User.me();
      console.log("Creating nation for user:", currentUser.email);

      // Initialize game state if needed
      const [gameStateList, gameConfigList] = await Promise.all([
        GameState.list(),
        GameConfig.list()
      ]);

      if (gameConfigList.length === 0) {
        setFeedback("Creating game configuration...");
        // Use the new flat storage approach for GameConfig
        const { defaultGameConfig } = await import('@/pages/Admin');
        await GameConfig.create({
          config_data_json: JSON.stringify(defaultGameConfig),
          config_version: "1.0",
          last_updated_by: currentUser.email
        });
      }

      if (gameStateList.length === 0) {
        setFeedback("Setting up game clock...");
        await GameState.create({
          last_turn_processed_at: new Date().toISOString(),
        });
      }

      setFeedback("Establishing your nation...");

      // Create the nation, explicitly setting the created_by field with the user's email
      const newNation = await Nation.create({
        name: name,
        leader_name: leaderName,
        government_type: governmentType,
        created_by: currentUser.email,
        active: true,
        population: 50000,
        territory: 100,
        cities: 1,
      });

      console.log("New nation created:", newNation);

      setFeedback("Deploying initial forces and resources...");
      const resourcePromise = Resource.create({ nation_id: newNation.id });
      const militaryPromise = Military.create({ nation_id: newNation.id });

      setFeedback("Establishing your capital city...");
      const initialCityPopulation = 50000;
      const initialCityLand = 100;

      // CRITICAL FIX: Explicitly define all infrastructure as 0 to override backend defaults.
      const cityPayload = {
          nation_id: newNation.id,
          name: "Capital City",
          population: initialCityPopulation,
          land_area: initialCityLand,
          infrastructure_slots: 0,
          happiness: 75,
          income_per_turn: 5000,
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
          daily_production: {}
      };

      console.log("Payload for Capital City.create:", cityPayload);
      const cityPromise = City.create(cityPayload);

      await Promise.all([resourcePromise, militaryPromise, cityPromise]);

      setFeedback("Nation successfully established!");

      setTimeout(() => {
        onNationCreated();
      }, 1000);

    } catch (error) {
      console.error("Error creating nation:", error);
      setFeedback(`Error: ${error.message}`);
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="bg-slate-800 border-slate-700" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-400" />
            Establish Your Nation
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreateNation} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nationName" className="text-slate-300">Nation Name</Label>
            <Input
              id="nationName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Republic of Stratagem"
              className="bg-slate-700 border-slate-600 text-white"
              required
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leaderName" className="text-slate-300">Leader Name</Label>
            <Input
              id="leaderName"
              value={leaderName}
              onChange={(e) => setLeaderName(e.target.value)}
              placeholder="e.g., Commander Valerius"
              className="bg-slate-700 border-slate-600 text-white"
              required
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Government Type</Label>
            <Select
              value={governmentType}
              onValueChange={(value) => setGovernmentType(value)}
              disabled={isCreating}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {governmentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-white">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              disabled={isCreating || !name || !leaderName}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {feedback || "Creating..."}
                </>
              ) : "Found Your Nation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

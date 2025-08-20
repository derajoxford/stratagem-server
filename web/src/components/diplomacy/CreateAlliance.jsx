
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alliance, Nation } from "@/api/entities"; // Added Nation import
import { Crown, Users, AlertCircle } from "lucide-react";

export default function CreateAlliance({ nation, hasAlliance, onUpdate }) {
  const [allianceData, setAllianceData] = useState({
    name: "",
    description: ""
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allianceData.name.trim() || !allianceData.description.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const newAlliance = await Alliance.create({
        name: allianceData.name.trim(),
        description: allianceData.description.trim(),
        founder_nation_id: nation.id,
        member_nations: [],
        member_roles: {
          [nation.id]: 'founder'
        },
        total_military_strength: 0,
        treasury: 0,
        tax_rate: 0,
        resources: {
          oil: 0, iron: 0, steel: 0, aluminum: 0, coal: 0, uranium: 0, 
          food: 0, gold: 0, bauxite: 0, copper: 0, diamonds: 0, wood: 0
        },
        total_cities: nation.cities || 1, // Added total_cities
        active: true
      });

      // FIX: Update the founder's nation record with the new alliance ID
      await Nation.update(nation.id, { alliance_id: newAlliance.id });

      setAllianceData({ name: "", description: "" });
      onUpdate();
    } catch (error) {
      console.error("Error creating alliance:", error);
      setError("Failed to create alliance. Please try again.");
    }
    setIsCreating(false);
  };

  if (hasAlliance) {
    return (
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
        <CardContent className="text-center py-12">
          <Users className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Already in Alliance</h3>
          <p className="text-slate-400">
            You are already a member of an alliance. Leave your current alliance before creating a new one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            Create New Alliance
          </CardTitle>
          <p className="text-slate-400">
            Found a new alliance and invite other nations to join your cause.
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="alliance-name" className="text-slate-300">Alliance Name</Label>
              <Input
                id="alliance-name"
                value={allianceData.name}
                onChange={(e) => setAllianceData({...allianceData, name: e.target.value})}
                placeholder="Enter your alliance name..."
                className="bg-slate-700 border-slate-600 text-white"
                maxLength={50}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alliance-description" className="text-slate-300">Description</Label>
              <Textarea
                id="alliance-description"
                value={allianceData.description}
                onChange={(e) => setAllianceData({...allianceData, description: e.target.value})}
                placeholder="Describe your alliance's goals and values..."
                className="bg-slate-700 border-slate-600 text-white h-32"
                maxLength={500}
                required
              />
              <div className="text-xs text-slate-400 text-right">
                {allianceData.description.length}/500 characters
              </div>
            </div>

            <div className="bg-slate-700/50 p-4 rounded-lg">
              <h4 className="text-amber-400 font-medium mb-2">Alliance Benefits</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                <div>• Shared military intelligence</div>
                <div>• Coordinated diplomacy</div>
                <div>• Economic cooperation</div>
                <div>• Mutual defense pacts</div>
                <div>• Resource sharing</div>
                <div>• Strategic planning</div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                disabled={isCreating || !allianceData.name.trim() || !allianceData.description.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900"
              >
                {isCreating ? "Creating..." : "Found Alliance"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

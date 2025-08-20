
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Coins, Shield, Zap, Award, Loader2 } from "lucide-react"; // Added Zap, Award, Loader2
import { Military, Nation } from "@/api/entities";

export default function TrainingCenter({ nation, military, onUpdate }) {
  const [isTraining, setIsTraining] = useState(false);

  const calculateTrainingCost = (currentLevel) => {
    return currentLevel * 100000;
  };

  const handleTraining = async () => {
    if (!military) return;
    
    const cost = calculateTrainingCost(military.training_level);
    if (nation.treasury < cost) return;

    setIsTraining(true);
    try {
      await Promise.all([
        Military.update(military.id, {
          training_level: Math.min(10, military.training_level + 1),
          military_investment: military.military_investment + cost
        }),
        Nation.update(nation.id, {
          treasury: nation.treasury - cost
        })
      ]);
      onUpdate();
    } catch (error) {
      console.error("Error upgrading training:", error);
    }
    setIsTraining(false);
  };

  if (!military) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-600 backdrop-blur-sm">
        <div className="p-6 text-center space-y-4">
          <TrendingUp className="w-12 h-12 text-slate-500 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Training Unavailable</h3>
            <p className="text-slate-400 text-sm">Deploy military forces first</p>
          </div>
        </div>
      </div>
    );
  }

  const trainingCost = calculateTrainingCost(military.training_level);
  const canAfford = nation.treasury >= trainingCost;
  const maxLevel = military.training_level >= 10;
  const trainingProgress = (military.training_level / 10) * 100;

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-600 backdrop-blur-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-slate-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Training Academy</h3>
            <p className="text-slate-300 text-sm">Elite force development</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">Training Level</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-3 py-1">
                Level {military.training_level}
              </Badge>
              <span className="text-slate-400 text-sm">of 10</span>
            </div>
          </div>

          <div className="relative">
            <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
              <div 
                className="h-4 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${trainingProgress}%` }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full"></div>
          </div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
          <h4 className="text-white font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Combat Bonuses
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Effectiveness Bonus</span>
              <span className="text-green-400 font-bold">+{(military.training_level * 10)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Investment</span>
              <span className="text-amber-400 font-bold">${military.military_investment.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {!maxLevel && (
          <>
            <div className="border-t border-slate-600 pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400">Next Level Cost:</span>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className={`font-bold text-lg ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                    ${trainingCost.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleTraining}
                disabled={!canAfford || isTraining}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed py-3"
              >
                {isTraining ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Training in Progress...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Advance Training Level
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {maxLevel && (
          <div className="border border-amber-500/30 bg-amber-500/10 rounded-lg p-4 text-center">
            <Award className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-400 font-bold">Elite Training Completed!</p>
            <p className="text-amber-300 text-sm mt-1">Maximum combat efficiency achieved</p>
          </div>
        )}
      </div>
    </div>
  );
}

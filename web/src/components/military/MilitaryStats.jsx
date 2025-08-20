
import React from "react";
import {
  Shield,
  Target,
  Zap,
  Award
} from "lucide-react";

export default function MilitaryStats({ military }) {
  if (!military) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-600 backdrop-blur-sm">
        <div className="p-6 text-center space-y-4">
          <Shield className="w-12 h-12 text-slate-500 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">No Military Data</h3>
            <p className="text-slate-400 text-sm">Deploy forces to view statistics</p>
          </div>
        </div>
      </div>
    );
  }

  const totalUnits = military.soldiers + military.tanks + military.aircraft + military.warships;
  const offensiveUnits = military.tanks + military.aircraft + military.conventional_bombs + military.nuclear_weapons;
  const defensiveUnits = military.soldiers + military.warships;

  const offensiveRating = Math.min(100, (offensiveUnits / Math.max(totalUnits, 1)) * 100);
  const defensiveRating = Math.min(100, (defensiveUnits / Math.max(totalUnits, 1)) * 100);
  const readinessRating = Math.min(100, military.training_level * 10);

  const StatBar = ({ label, value, color, icon: Icon }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-slate-300 text-sm font-medium">{label}</span>
        </div>
        <span className={`${color} font-bold text-lg`}>{Math.floor(value)}%</span>
      </div>
      <div className="relative">
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${
              color.includes('red') ? 'from-red-500 to-red-400' :
              color.includes('blue') ? 'from-blue-500 to-blue-400' :
              'from-green-500 to-green-400'
            }`}
            style={{ width: `${Math.min(100, value)}%` }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full"></div>
      </div>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-600 backdrop-blur-sm overflow-hidden">
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4 border-b border-slate-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Combat Analysis</h3>
            <p className="text-slate-300 text-sm">Real-time military assessment</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <StatBar
          label="Offensive Capability"
          value={offensiveRating}
          color="text-red-400"
          icon={Target}
        />

        <StatBar
          label="Defensive Strength"
          value={defensiveRating}
          color="text-blue-400"
          icon={Shield}
        />

        <StatBar
          label="Combat Readiness"
          value={readinessRating}
          color="text-green-400"
          icon={Zap}
        />

        <div className="border-t border-slate-700 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="text-white font-medium">Force Summary</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{totalUnits.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Total Units</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{military.nuclear_weapons}</div>
              <div className="text-xs text-slate-400">Nuclear Arsenal</div>
            </div>
          </div>

          <div className="mt-4 bg-slate-700/30 rounded-lg p-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Military Investment</span>
              <span className="text-amber-400 font-bold">${military.military_investment.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

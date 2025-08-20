
import React, { useState, useEffect, useCallback } from 'react';
import { Nation, Military, Resource, City, GameConfig } from "@/entities/all";
import { User } from "@/entities/User";
import { Loader2, ShieldAlert } from 'lucide-react';
import CreateNationModal from '../components/dashboard/CreateNationModal';
import MilitaryUnits from '../components/military/MilitaryUnits';
import TrainingCenter from '../components/military/TrainingCenter';
import MilitaryStats from '../components/military/MilitaryStats';
import { defaultGameConfig } from '@/components/data/defaultGameConfig.js';

export default function MilitaryPage() {
    const [nation, setNation] = useState(null);
    const [military, setMilitary] = useState(null);
    const [resources, setResources] = useState(null);
    const [cities, setCities] = useState(null);
    const [gameConfig, setGameConfig] = useState(null); // This will now hold the parsed object
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateNationModal, setShowCreateNationModal] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const user = await User.me();
            const nations = await Nation.filter({ created_by: user.email });

            if (nations.length > 0) {
                const myNation = nations[0];
                setNation(myNation);

                const [militaryData, resourcesData, citiesData, configDataEntities] = await Promise.all([
                    Military.filter({ nation_id: myNation.id }),
                    Resource.filter({ nation_id: myNation.id }),
                    City.filter({ nation_id: myNation.id }),
                    GameConfig.list()
                ]);

                if (militaryData.length === 0) {
                    const newMilitary = await Military.create({ nation_id: myNation.id });
                    setMilitary(newMilitary);
                } else {
                    setMilitary(militaryData[0]);
                }

                setResources(resourcesData[0]);
                setCities(citiesData);
                
                // CRITICAL FIX: Parse gameConfig here before setting it to state
                if (configDataEntities && configDataEntities.length > 0 && configDataEntities[0].config_data_json) {
                    try {
                        setGameConfig(JSON.parse(configDataEntities[0].config_data_json));
                    } catch (e) {
                        console.error("MilitaryPage: Failed to parse gameConfig JSON:", e);
                        // Fallback to defaultGameConfig if parsing fails
                        setGameConfig(defaultGameConfig); // Use the directly imported defaultGameConfig
                    }
                } else {
                    // If no config entity exists, use defaultGameConfig
                    setGameConfig(defaultGameConfig); // Use the directly imported defaultGameConfig
                }

            } else {
                setShowCreateNationModal(true);
            }
        } catch (error) {
            console.error("Failed to load military data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Stagger initial load to prevent API rate limiting
        const randomDelay = Math.random() * 300 + 100; // Random delay between 100-400ms
        const timer = setTimeout(() => {
            loadData();
        }, randomDelay);

        return () => clearTimeout(timer);
    }, [loadData]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex justify-center items-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-16 h-16 text-amber-400 animate-spin mx-auto" />
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Loading Military Command</h3>
                        <p className="text-slate-400">Establishing secure connection...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (showCreateNationModal) {
        return <CreateNationModal onNationCreated={loadData} />;
    }

    if (!nation) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center items-center text-center p-8">
                <div className="max-w-md space-y-6">
                    <ShieldAlert className="w-24 h-24 text-red-500 mx-auto opacity-80" />
                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold text-white">Access Denied</h1>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            You must establish a nation before accessing the military command center.
                        </p>
                    </div>
                    <div className="w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 rounded-full opacity-50"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Enhanced Header Section */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-b border-slate-600">
                <div className="absolute inset-0 bg-military-pattern opacity-5"></div>
                <div className="relative p-6 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
                                            <ShieldAlert className="w-8 h-8 text-white" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                                            <span className="text-xs font-bold text-slate-900">⚡</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                                            Military Command
                                        </h1>
                                        <p className="text-lg text-slate-300">
                                            {nation.name} Defense Ministry
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-4">
                                <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg px-4 py-3 border border-slate-600">
                                    <div className="text-sm text-slate-400">Defense Budget</div>
                                    <div className="text-xl font-bold text-green-400">
                                        ${nation.treasury?.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg px-4 py-3 border border-slate-600">
                                    <div className="text-sm text-slate-400">Military Strength</div>
                                    <div className="text-xl font-bold text-red-400">
                                        {nation.military_strength?.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-6 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        {/* Left Column - Primary Actions */}
                        <div className="xl:col-span-3 space-y-8">
                            <MilitaryUnits
                                nation={nation}
                                military={military}
                                resources={resources}
                                cities={cities}
                                gameConfig={gameConfig}
                                onUpdate={loadData}
                            />
                        </div>
                        
                        {/* Right Column - Status & Management */}
                        <div className="xl:col-span-1 space-y-6">
                            <MilitaryStats military={military} />
                            <TrainingCenter 
                                nation={nation} 
                                military={military} 
                                onUpdate={loadData} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

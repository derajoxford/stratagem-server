
import React, { useState, useEffect, useCallback } from 'react';
import { Nation, User, Alliance, GameConfig, War } from '@/entities/all';
import { Loader2, Globe, Users, Shield, Search, AlertTriangle } from 'lucide-react';
import NationCard from '../components/world/NationCard'; // Assuming path to NationCard is correct based on original
import NationDetailsModal from '../components/world/NationDetailsModal';
import DeclareWarModal from '../components/war/DeclareWarModal';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; // Button is imported but not used in the final JSX. Keeping it as per outline.

export default function WorldNations() {
    const [nations, setNations] = useState([]);
    const [alliances, setAlliances] = useState([]);
    const [gameConfig, setGameConfig] = useState(null);
    const [wars, setWars] = useState([]);
    const [myNation, setMyNation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedNation, setSelectedNation] = useState(null);
    const [isDeclareWarModalOpen, setDeclareWarModalOpen] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const currentUser = await User.me();
            const [nationsData, alliancesData, gameConfigData, warsData] = await Promise.all([
                Nation.list('-military_strength'),
                Alliance.list(),
                GameConfig.list(),
                War.list()
            ]);

            setNations(nationsData);
            setAlliances(alliancesData);
            setGameConfig(gameConfigData[0] || null);
            setWars(warsData);

            // Correctly find the player's nation using email
            const playerNation = nationsData.find(n => n.created_by === currentUser.email && n.active);
            setMyNation(playerNation || null);

        } catch (err) {
            console.error("Error loading world nations data:", err);
            setError("Failed to load world data. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Stagger initial load to prevent API rate limiting
        const randomDelay = Math.random() * 400 + 150; // Random delay between 150-550ms
        const timer = setTimeout(() => {
            loadData();
        }, randomDelay);

        return () => clearTimeout(timer);
    }, [loadData]);
    
    const filteredNations = nations.filter(nation =>
        nation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nation.leader_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDeclareWar = (nation) => {
        setSelectedNation(nation);
        setDeclareWarModalOpen(true);
    };

    const handleOpenDetails = (nation) => {
        setSelectedNation(nation);
    };
    
    const handleCloseModal = () => {
        setSelectedNation(null);
        setDeclareWarModalOpen(false);
    };

    if (isLoading) {
        return (
            <div className="p-8 flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                <p className="ml-4 text-slate-400">Loading World Data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-400 flex flex-col items-center justify-center h-full">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Error</h2>
                <p>{error}</p>
            </div>
        );
    }
    
    return (
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
                            <Globe className="w-8 h-8 text-blue-400" />
                            World Nations
                        </h1>
                        <p className="text-slate-400 text-lg">Survey the global landscape of power.</p>
                    </div>
                    <div className="w-full md:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Search nations or leaders..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-72 bg-slate-700 border-slate-600 text-white pl-10"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredNations.map((nation) => (
                        <NationCard
                            key={nation.id}
                            nation={nation}
                            alliance={alliances.find(a => a.id === nation.alliance_id)}
                            onDeclareWar={myNation && myNation.id !== nation.id ? handleDeclareWar : undefined}
                            onViewDetails={handleOpenDetails}
                            isMyNation={myNation?.id === nation.id}
                            wars={wars}
                        />
                    ))}
                </div>

                {selectedNation && (
                    <NationDetailsModal
                        nation={selectedNation}
                        alliance={alliances.find(a => a.id === selectedNation.alliance_id)}
                        isOpen={!!selectedNation && !isDeclareWarModalOpen}
                        onClose={handleCloseModal}
                        onDeclareWar={myNation && myNation.id !== selectedNation.id ? handleDeclareWar : undefined}
                        isMyNation={myNation?.id === selectedNation.id}
                        wars={wars}
                    />
                )}
                
                {isDeclareWarModalOpen && selectedNation && myNation && (
                    <DeclareWarModal
                        isOpen={isDeclareWarModalOpen}
                        onClose={handleCloseModal}
                        attackerNation={myNation}
                        defenderNation={selectedNation}
                        onWarDeclared={() => {
                            loadData(); // Reload data after war is declared
                            handleCloseModal();
                        }}
                    />
                )}
            </div>
        </div>
    );
}

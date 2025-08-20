
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { User, Nation, Military, War, Alliance, GameConfig, CeasefireProposal, Resource } from '@/entities/all';
import { Loader2, Swords, ShieldOff, Globe, AlertTriangle } from 'lucide-react';
import WarSelector from '@/components/war/WarSelector';
import ActiveConflict from '@/components/war/ActiveConflict';
import WarConclusionReport from '@/components/war/WarConclusionReport';
import { defaultGameConfig } from '@/components/data/defaultGameConfig.js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';

export default function WarRoom() {
    const [nation, setNation] = useState(null);
    const [military, setMilitary] = useState(null);
    const [wars, setWars] = useState([]);
    const [allNations, setAllNations] = useState([]);
    const [allMilitaries, setAllMilitaries] = useState([]);
    const [allResources, setAllResources] = useState([]);
    const [alliances, setAlliances] = useState([]);
    const [gameConfig, setGameConfig] = useState(null);
    const [ceasefireProposals, setCeasefireProposals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedWarId, setSelectedWarId] = useState(null);
    const [showWarConclusion, setShowWarConclusion] = useState(false);
    const [concludedWar, setConcludedWar] = useState(null);

    const location = useLocation();
    const [lastLoadTime, setLastLoadTime] = useState(0);

    const loadWarData = useCallback(async (newWarId = null, forceRefresh = false, checkForConcludedWars = false) => {
        const now = Date.now();
        if (!forceRefresh && now - lastLoadTime < 2000) {
            return;
        }
        setLastLoadTime(now);

        console.log('WarRoom: loadWarData called with newWarId:', newWarId);
        setIsLoading(true);
        setError(null);

        try {
            const myUser = await User.me();
            if (!myUser) throw new Error("You must be logged in to view the War Room.");

            const nationsData = await Nation.list();
            const currentNation = nationsData.find(n => n.created_by === myUser.email && n.active);

            if (!currentNation || !currentNation.id) {
                setNation(null);
                setIsLoading(false);
                return;
            }
            setNation(currentNation);

            const myNationId = currentNation.id;
            const myAllianceId = currentNation.alliance_id;

            console.log('WarRoom: My Nation ID:', myNationId);

            const [
                militariesData,
                resourcesData,
                alliancesData,
                gameConfigData,
                allActiveWarsData,
                ceasefireProposalsData,
                allRecentlyEndedWarsData
            ] = await Promise.all([
                Military.list(),
                Resource.list(),
                Alliance.list(),
                GameConfig.list(),
                War.filter({ status: 'active' }),
                CeasefireProposal.filter({ status: 'pending' }),
                checkForConcludedWars ? War.filter({
                    status: { $in: ['attacker_victory', 'defender_victory', 'peace_treaty', 'stalemate', 'ceasefire'] }
                }, '-end_date', 10) : Promise.resolve([])
            ]);

            console.log('WarRoom: All active wars fetched:', allActiveWarsData);
            console.log('WarRoom: Number of all active wars:', allActiveWarsData ? allActiveWarsData.length : 'null/undefined');

            // CLIENT-SIDE FILTERING: Filter wars that involve this nation
            const relevantActiveWars = (allActiveWarsData || []).filter(war => {
                const isAttacker = war.attacker_nation_id === myNationId;
                const isDefender = war.defender_nation_id === myNationId;
                const isAttackerAlliance = myAllianceId && war.attacker_alliance_id === myAllianceId;
                const isDefenderAlliance = myAllianceId && war.defender_alliance_id === myAllianceId;
                
                const isInvolved = isAttacker || isDefender || isAttackerAlliance || isDefenderAlliance;
                
                if (isInvolved) {
                    console.log('WarRoom: Found relevant war:', {
                        warId: war.id,
                        isAttacker,
                        isDefender,
                        isAttackerAlliance,
                        isDefenderAlliance
                    });
                }
                
                return isInvolved;
            });

            console.log('WarRoom: Relevant active wars after client-side filtering:', relevantActiveWars);
            console.log('WarRoom: Number of relevant active wars:', relevantActiveWars.length);

            // CLIENT-SIDE FILTERING: Filter recently ended wars if checking for conclusions
            const relevantRecentlyEndedWars = checkForConcludedWars ? 
                (allRecentlyEndedWarsData || []).filter(war => {
                    const isAttacker = war.attacker_nation_id === myNationId;
                    const isDefender = war.defender_nation_id === myNationId;
                    const isAttackerAlliance = myAllianceId && war.attacker_alliance_id === myAllianceId;
                    const isDefenderAlliance = myAllianceId && war.defender_alliance_id === myAllianceId;
                    
                    return isAttacker || isDefender || isAttackerAlliance || isDefenderAlliance;
                }) : [];

            console.log('WarRoom: Relevant recently ended wars:', relevantRecentlyEndedWars);

            let involvedWars = relevantActiveWars;

            // Handle case where a newly created war might not be in the list yet due to DB lag
            if (newWarId && !involvedWars.some(w => w.id === newWarId)) {
                console.log(`WarRoom: New war (${newWarId}) was not in filtered list. Fetching directly.`);
                try {
                    const newlyCreatedWar = await War.get(newWarId);
                    // Double check if this war actually involves us, to prevent someone sending a random warId
                    const isMyWar = newlyCreatedWar.attacker_nation_id === myNationId ||
                                  newlyCreatedWar.defender_nation_id === myNationId ||
                                  (myAllianceId && (newlyCreatedWar.attacker_alliance_id === myAllianceId || newlyCreatedWar.defender_alliance_id === myAllianceId));

                    if (newlyCreatedWar && newlyCreatedWar.status === 'active' && isMyWar) {
                        console.log('WarRoom: Successfully fetched new war directly. Adding to list.');
                        involvedWars.push(newlyCreatedWar);
                    }
                } catch (e) {
                    console.error(`Could not fetch newly created war ${newWarId}:`, e);
                }
            }

            // Set states
            setWars(involvedWars);
            console.log('WarRoom: Final wars state being set:', involvedWars);
            setAllNations(nationsData); // Keep all nations for opponent lookups
            setMilitary(militariesData.find(m => m.nation_id === currentNation.id) || null);
            setAllMilitaries(militariesData); // Store all militaries for war calculations
            setAllResources(resourcesData);
            setAlliances(alliancesData);
            const warIds = involvedWars.map(war => war.id);
            setCeasefireProposals(ceasefireProposalsData.filter(p => warIds.includes(p.war_id)));

            if (gameConfigData.length > 0) {
                try {
                    const parsedConfig = JSON.parse(gameConfigData[0].config_data_json);
                    setGameConfig(parsedConfig);
                } catch (e) {
                    console.error("Failed to parse game config, using default:", e);
                    setGameConfig(defaultGameConfig);
                }
            } else {
                setGameConfig(defaultGameConfig);
            }
            
            // Check for recently concluded war
            if (checkForConcludedWars && relevantRecentlyEndedWars.length > 0) {
                const myRecentlyEndedWar = relevantRecentlyEndedWars.find(war => {
                    const isRecent = war.end_date && (Date.now() - new Date(war.end_date).getTime()) < 30000;
                    return isRecent;
                });
                if (myRecentlyEndedWar && !showWarConclusion) {
                    setConcludedWar(myRecentlyEndedWar);
                    setShowWarConclusion(true);
                }
            }

            // Update selected war ID logic
            const currentSelectedWar = involvedWars.find(w => w.id === selectedWarId);
            if (involvedWars.length > 0 && (!currentSelectedWar || newWarId)) {
                // If a new war ID is specified, select it, otherwise select the first in the list.
                setSelectedWarId(newWarId || involvedWars[0].id);
            } else if (involvedWars.length === 0) {
                setSelectedWarId(null);
            }

        } catch (err) {
            console.error("Error loading war room data:", err);
            const errorMessage = err.message ? err.message.toLowerCase() : '';
            if (errorMessage.includes('network') || errorMessage.includes('failed to fetch') || errorMessage.includes('connection lost')) {
                 setError("Connection to the server failed. Please check your internet connection and refresh the page.");
            } else {
                setError(err.message || "An unexpected error occurred while loading data. Please refresh.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedWarId, lastLoadTime, showWarConclusion]);

    useEffect(() => {
        // Stagger initial load to prevent API rate limiting
        const params = new URLSearchParams(location.search);
        const warIdFromUrl = params.get('warId');
        
        const randomDelay = Math.random() * 450 + 175; // Random delay between 175-625ms
        const timer = setTimeout(() => {
            loadWarData(warIdFromUrl, false, true);
        }, randomDelay);

        return () => clearTimeout(timer);
    }, [location.search, loadWarData]);

    const activeWars = wars;
    const selectedWar = wars.find(war => war.id === selectedWarId);

    const forceRefresh = useCallback(() => {
        loadWarData(selectedWarId, true, true);
    }, [selectedWarId, loadWarData]);

    // NEW: Handle war data update from ActiveConflict, potentially leading to conclusion display
    const handleWarDataUpdate = useCallback(() => {
        console.log('WarRoom: War data update triggered, checking for concluded wars');
        loadWarData(selectedWarId, true, true);
    }, [selectedWarId, loadWarData]);

    // NEW: Handle closing war conclusion report
    const handleCloseWarConclusion = () => {
        console.log('WarRoom: Closing war conclusion report');
        setShowWarConclusion(false);
        setConcludedWar(null);
        forceRefresh();
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center items-center h-[calc(100vh-200px)]"><Loader2 className="w-12 h-12 text-amber-400 animate-spin" /><p className="ml-4 text-slate-400">Loading War Room...</p></div>;
    }

    if (error) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Failed to Load War Room</h2>
                <p className="text-slate-400 max-w-md mb-6">{error}</p>
                <Button onClick={() => loadWarData(null, true)} className="bg-amber-600 hover:bg-amber-700">
                    Try Again
                </Button>
            </div>
        );
    }

    if (!nation) {
        return (
            <div className="p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <Card className="bg-slate-800/80 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-amber-400 flex items-center gap-3">
                                <ShieldOff className="w-6 h-6" />
                                Nation Required
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-300 mb-4">You must have an active nation to access the War Room.</p>
                            <Button asChild>
                                <Link to={createPageUrl("Dashboard")}>Create Your Nation</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Safeguard to find opponent nation BEFORE rendering the report
    const opponentNationForReport = concludedWar && nation ? allNations.find(n => 
        n.id === (concludedWar.attacker_nation_id === nation.id ? 
            concludedWar.defender_nation_id : 
            concludedWar.attacker_nation_id)
    ) : null;

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            {/* War Conclusion Report Overlay */}
            {showWarConclusion && concludedWar && nation && opponentNationForReport && (
                <WarConclusionReport
                    key={concludedWar.id}
                    war={concludedWar}
                    myNation={nation}
                    opponentNation={opponentNationForReport}
                    onClose={handleCloseWarConclusion}
                />
            )}

            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl lg:text-4xl font-bold text-white flex items-center gap-3">
                        <Swords className="w-8 h-8 text-red-500" />
                        War Room
                    </h1>
                    <p className="text-slate-400 text-base lg:text-lg">Manage ongoing conflicts and review war history.</p>
                </div>

                {activeWars.length > 0 && nation && (
                    <div className="mb-6">
                        <WarSelector
                            wars={activeWars}
                            selectedWarId={selectedWarId}
                            onSelectWar={setSelectedWarId}
                            myNationId={nation.id}
                            allNations={allNations}
                        />
                    </div>
                )}

                {selectedWar && nation && military !== undefined && gameConfig ? (
                    <ActiveConflict
                        key={selectedWar.id}
                        war={selectedWar}
                        myNation={nation}
                        myMilitary={military}
                        allNations={allNations}
                        allMilitaries={allMilitaries}
                        allResources={allResources}
                        gameConfig={gameConfig}
                        ceasefireProposals={ceasefireProposals.filter(p => p.war_id === selectedWar.id)}
                        onUpdate={forceRefresh}
                        onBattleComplete={forceRefresh}
                        onWarDataUpdate={handleWarDataUpdate}
                    />
                ) : (
                    <Card className="bg-slate-800/80 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-400 flex items-center gap-3">
                                <ShieldOff className="w-6 h-6" />
                                At Peace
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-300 mb-4">You are not involved in any active conflicts.</p>
                             <p className="text-slate-400 text-sm mb-6">Visit the World Nations page to survey other powers, engage in diplomacy, or declare war.</p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                                    <Link to={createPageUrl("WorldNations")}>
                                        <Globe className="w-4 h-4 mr-2"/>
                                        Go to World Nations
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="border-slate-600 hover:bg-slate-700">
                                    <Link to={createPageUrl("BattleHistory")}>
                                        <Swords className="w-4 h-4 mr-2"/>
                                        View Battle History
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

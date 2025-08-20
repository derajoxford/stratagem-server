import React, { useState, useEffect } from 'react';
import { User, Nation, War } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  History, 
  Search, 
  Swords, 
  Calendar,
  Users as UsersIcon,
  Trophy,
  Skull,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import WarHistoryCard from '../components/war/WarHistoryCard';

export default function WarHistoryPage() {
    const [myNation, setMyNation] = useState(null);
    const [allNations, setAllNations] = useState([]);
    const [concludedWars, setConcludedWars] = useState([]);
    const [filteredWars, setFilteredWars] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const loadData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const user = await User.me();
            const nations = await Nation.filter({ created_by: user.email, active: true });
            
            if (nations.length === 0) {
                setError("You need an active nation to view war history.");
                setIsLoading(false);
                return;
            }

            const nation = nations[0];
            setMyNation(nation);

            // Fetch all nations for name resolution
            const allNationsData = await Nation.filter({ active: true });
            setAllNations(allNationsData);

            // Fetch concluded wars
            const allWars = await War.list();
            
            // Filter for concluded wars where this nation was a participant
            const concludedStatuses = ['attacker_victory', 'defender_victory', 'peace_treaty', 'stalemate', 'ceasefire'];
            const relevantWars = allWars.filter(war => 
                concludedStatuses.includes(war.status) &&
                (war.attacker_nation_id === nation.id || war.defender_nation_id === nation.id)
            );

            // Sort by end_date descending (most recent first)
            relevantWars.sort((a, b) => {
                if (!a.end_date) return 1;
                if (!b.end_date) return -1;
                return new Date(b.end_date) - new Date(a.end_date);
            });

            setConcludedWars(relevantWars);
            setFilteredWars(relevantWars);
        } catch (err) {
            console.error('Error loading war history:', err);
            setError(err.message || 'Failed to load war history');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        // Filter wars based on search term and status filter
        let filtered = concludedWars;

        if (searchTerm.trim()) {
            filtered = filtered.filter(war => {
                const warName = war.war_name || `War ${war.id.slice(-8)}`;
                const attackerName = allNations.find(n => n.id === war.attacker_nation_id)?.name || 'Unknown';
                const defenderName = allNations.find(n => n.id === war.defender_nation_id)?.name || 'Unknown';
                
                return warName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       attackerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       defenderName.toLowerCase().includes(searchTerm.toLowerCase());
            });
        }

        if (filterStatus !== 'all') {
            if (filterStatus === 'victory') {
                filtered = filtered.filter(war => {
                    const isAttacker = war.attacker_nation_id === myNation?.id;
                    return (isAttacker && war.status === 'attacker_victory') ||
                           (!isAttacker && war.status === 'defender_victory');
                });
            } else if (filterStatus === 'defeat') {
                filtered = filtered.filter(war => {
                    const isAttacker = war.attacker_nation_id === myNation?.id;
                    return (isAttacker && war.status === 'defender_victory') ||
                           (!isAttacker && war.status === 'attacker_victory');
                });
            } else {
                filtered = filtered.filter(war => war.status === filterStatus);
            }
        }

        setFilteredWars(filtered);
    }, [concludedWars, searchTerm, filterStatus, myNation, allNations]);

    const getWarStats = () => {
        if (!myNation) return { total: 0, victories: 0, defeats: 0, diplomatic: 0 };
        
        const total = concludedWars.length;
        let victories = 0;
        let defeats = 0;
        let diplomatic = 0;

        concludedWars.forEach(war => {
            const isAttacker = war.attacker_nation_id === myNation.id;
            
            if (war.status === 'peace_treaty' || war.status === 'ceasefire' || war.status === 'stalemate') {
                diplomatic++;
            } else if (
                (isAttacker && war.status === 'attacker_victory') ||
                (!isAttacker && war.status === 'defender_victory')
            ) {
                victories++;
            } else {
                defeats++;
            }
        });

        return { total, victories, defeats, diplomatic };
    };

    if (isLoading) {
        return (
            <div className="p-8 flex justify-center items-center h-[calc(100vh-200px)]">
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
                <p className="ml-4 text-slate-400">Loading war history...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Error Loading War History</h2>
                <p className="text-slate-400 max-w-md mb-6">{error}</p>
                <Button onClick={loadData} className="bg-amber-600 hover:bg-amber-700">
                    Try Again
                </Button>
            </div>
        );
    }

    const stats = getWarStats();

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl lg:text-4xl font-bold text-white flex items-center gap-3 mb-2">
                        <History className="w-8 h-8 text-amber-400" />
                        War History
                    </h1>
                    <p className="text-slate-400 text-base lg:text-lg">
                        Review your nation's military conflicts and their outcomes
                    </p>
                </div>

                {/* Statistics Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-slate-800/80 border-slate-700">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-white">{stats.total}</div>
                            <div className="text-sm text-slate-400">Total Wars</div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-green-900/20 border-green-700/50">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-400">{stats.victories}</div>
                            <div className="text-sm text-green-300">Victories</div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-red-900/20 border-red-700/50">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-red-400">{stats.defeats}</div>
                            <div className="text-sm text-red-300">Defeats</div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-blue-900/20 border-blue-700/50">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-400">{stats.diplomatic}</div>
                            <div className="text-sm text-blue-300">Diplomatic</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Search wars by name or participants..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-800/50 border-slate-600 text-white"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
                        >
                            <option value="all">All Wars</option>
                            <option value="victory">My Victories</option>
                            <option value="defeat">My Defeats</option>
                            <option value="peace_treaty">Peace Treaties</option>
                            <option value="ceasefire">Ceasefires</option>
                            <option value="stalemate">Stalemates</option>
                        </select>
                    </div>
                </div>

                {/* Wars List */}
                {filteredWars.length === 0 ? (
                    <Card className="bg-slate-800/80 border-slate-700">
                        <CardContent className="p-8 text-center">
                            <History className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {concludedWars.length === 0 ? 'No War History' : 'No Results Found'}
                            </h3>
                            <p className="text-slate-400">
                                {concludedWars.length === 0 
                                    ? 'Your nation has not participated in any concluded wars yet.'
                                    : 'Try adjusting your search or filter criteria.'
                                }
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {filteredWars.map((war) => (
                            <WarHistoryCard
                                key={war.id}
                                war={war}
                                myNation={myNation}
                                allNations={allNations}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

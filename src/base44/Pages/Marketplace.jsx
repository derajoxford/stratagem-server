
import React, { useState, useEffect } from 'react';
import { Nation, User, MarketListing, Resource, BuyOrder, GameConfig, MarketSnapshot } from "@/entities/all";
import { Loader2, Store, AlertTriangle, ShieldBan, DollarSign } from 'lucide-react';
import MarketListings from '../components/marketplace/MarketListings';
import CreateListing from '../components/marketplace/CreateListing';
import BuyOrders from '../components/marketplace/BuyOrders';
import CreateBuyOrder from '../components/marketplace/CreateBuyOrder';
import MyTransactions from '../components/marketplace/MyTransactions';
import MarketTicker from '../components/marketplace/MarketTicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarketTrendChart from "../components/marketplace/MarketTrendChart"; // This component is removed in the new layout

export default function MarketplacePage() {
    const [myNation, setMyNation] = useState(null);
    const [resources, setResources] = useState(null);
    const [listings, setListings] = useState([]);
    const [buyOrders, setBuyOrders] = useState([]);
    const [allNations, setAllNations] = useState([]);
    const [gameConfig, setGameConfig] = useState(null);
    const [marketHistory, setMarketHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("listings");

    const loadData = async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            
            // First, explicitly fetch the user's nation
            const userNations = await Nation.filter({ created_by: currentUser.email, active: true });
            
            if (!userNations || userNations.length === 0) {
                setMyNation(null);
                setIsLoading(false);
                return;
            }
            
            const userNation = userNations[0];
            setMyNation(userNation);

            // Now fetch all other data in parallel
            const [allNationsData, listingsData, resourcesData, buyOrdersData, configData, historyData] = await Promise.all([
                Nation.list(),
                MarketListing.filter({ status: 'active' }, '-created_date'),
                Resource.filter({ nation_id: userNation.id }),
                BuyOrder.filter({ status: 'active' }, '-created_date'),
                GameConfig.list(),
                MarketSnapshot.list('-turn_number', 50)
            ]);

            setAllNations(allNationsData);
            setResources(resourcesData[0] || null);
            setListings(listingsData);
            setBuyOrders(buyOrdersData);
            setGameConfig(configData[0]);
            setMarketHistory(historyData);

        } catch (error) {
            console.error("Error loading market data:", error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        // Stagger initial load to prevent API rate limiting
        const randomDelay = Math.random() * 400 + 150; // Random delay between 150-550ms
        const timer = setTimeout(() => {
            loadData();
        }, randomDelay);

        return () => clearTimeout(timer);
    }, []);

    const calculateMarketStats = () => {
        const averagePrices = {};
        const resourceCounts = {};
        let totalMarketValue = 0;

        listings.forEach(listing => {
            const resource = listing.resource_type;
            
            if (!averagePrices[resource]) {
                averagePrices[resource] = 0;
                resourceCounts[resource] = 0;
            }
            
            averagePrices[resource] += listing.price_per_unit;
            resourceCounts[resource] += 1;
            totalMarketValue += listing.total_value;
        });

        Object.keys(averagePrices).forEach(resource => {
            averagePrices[resource] = averagePrices[resource] / resourceCounts[resource];
        });

        return {
            averagePrices,
            totalMarketValue,
            totalListings: listings.length
        };
    };

    const marketStats = calculateMarketStats();

    if (isLoading) {
        return (
            <div className="p-8 flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                <span className="ml-2 text-slate-400">Loading marketplace...</span>
            </div>
        );
    }
    
    if (!myNation) {
        return (
            <div className="p-8 text-center">
                 <h2 className="text-2xl font-bold text-white mb-2">Create Your Nation First</h2>
                 <p className="text-slate-400">You need a nation to access the Global Marketplace.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Global Marketplace</h1>
                        <p className="text-slate-400">Trade resources with nations across the world</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {myNation && (
                            <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-lg">
                                <DollarSign className="w-5 h-5 text-amber-400" />
                                <span className="text-white font-medium">
                                    Treasury: ${myNation.treasury?.toLocaleString() || 0}
                                </span>
                            </div>
                        )}
                        <MarketTicker 
                            averagePrices={marketStats.averagePrices}
                            totalMarketValue={marketStats.totalMarketValue}
                            totalListings={marketStats.totalListings}
                            marketHistory={marketHistory}
                            tickerSpeed={gameConfig?.market_ticker_speed_seconds || 30}
                        />
                    </div>
                </div>

                {/* NEW: Naval Blockade Warning Banner */}
                {myNation?.is_blockaded && (
                    <div className="mb-6 p-4 bg-red-900/30 border-2 border-red-500 rounded-lg">
                        <div className="flex items-center gap-3">
                            <ShieldBan className="w-8 h-8 text-red-400 animate-pulse" />
                            <div>
                                <h3 className="text-xl font-bold text-red-300">Naval Blockade Active</h3>
                                <p className="text-red-200">
                                    Your nation is under naval blockade and cannot participate in marketplace activities. 
                                    Achieve a Naval Victory to break free, or wait for your blockading enemy to lose their naval fleet.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="listings">Sell Orders</TabsTrigger>
                        <TabsTrigger value="orders">Buy Orders</TabsTrigger>
                        <TabsTrigger value="my-transactions">My Transactions</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="listings" className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <MarketListings 
                                    listings={listings} 
                                    myNation={myNation} 
                                    allNations={allNations} 
                                    onBuy={loadData}
                                    isBlocked={myNation.is_blockaded}
                                />
                            </div>
                            <div>
                                <CreateListing 
                                    nation={myNation} 
                                    resources={resources} 
                                    onUpdate={loadData}
                                    isBlockaded={myNation.is_blockaded}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="orders" className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <BuyOrders 
                                    buyOrders={buyOrders} 
                                    myNation={myNation} 
                                    allNations={allNations} 
                                    onUpdate={loadData}
                                    resources={resources}
                                    isBlockaded={myNation.is_blockaded}
                                />
                            </div>
                            <div>
                                <CreateBuyOrder 
                                    myNation={myNation} 
                                    onUpdate={loadData}
                                    isBlockaded={myNation.is_blockaded}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="my-transactions">
                        <MyTransactions 
                            nation={myNation}
                            listings={listings.filter(l => l.seller_nation_id === myNation.id)}
                            buyOrders={buyOrders.filter(o => o.buyer_nation_id === myNation.id)}
                            onUpdate={loadData}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}


import React, { useState, useEffect, useCallback, useMemo } from "react";
import { User, Nation, Resource, City, GameConfig, FinancialTransaction, ResourceTransaction, GameState } from "@/entities/all";
import { Loader2, Banknote, AlertCircle } from "lucide-react";
import { subDays, startOfDay, endOfDay } from 'date-fns';

import NationalEconomyStats from "../components/economy/NationalEconomyStats";
import ResourceProduction from "../components/economy/ResourceProduction";
import CityEconomicReport from "../components/economy/CityEconomicReport";
import MarketplacePreview from "../components/dashboard/MarketplacePreview";
import FinancialSummary from "../components/banking/FinancialSummary";
import TransactionHistory from "../components/banking/TransactionHistory";
import GlobalEnvironmentStatus from "../components/economy/GlobalEnvironmentStatus"; // New component

const buildingToResourceMap = {
    uranium_mines: 'uranium', coal_mines: 'coal', iron_mines: 'iron',
    steel_mills: 'steel', aluminum_smelters: 'aluminum', bauxite_mines: 'bauxite',
    oil_wells: 'oil', farms: 'food', copper_mines: 'copper', gold_mines: 'gold',
    diamond_mines: 'diamonds', forestry: 'wood'
};

export default function EconomicDashboardPage() {
    // Consolidated State
    const [nation, setNation] = useState(null);
    const [resources, setResources] = useState(null);
    const [cities, setCities] = useState([]);
    const [gameConfig, setGameConfig] = useState(null);
    const [gameState, setGameState] = useState(null); // New state for global env data
    const [financialTransactions, setFinancialTransactions] = useState([]);
    const [resourceTransactions, setResourceTransactions] = useState([]);
    
    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filter & Date Range State
    const [summaryDateRange, setSummaryDateRange] = useState({
        from: startOfDay(subDays(new Date(), 29)),
        to: endOfDay(new Date()),
    });
    const [historyFilters, setHistoryFilters] = useState({
        dateRange: { from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) },
        type: 'all',
        category: 'all',
        resourceType: 'all',
    });

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Add delay to prevent API call conflicts
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const currentUser = await User.me();
            const nations = await Nation.filter({ created_by: currentUser.email, active: true });

            if (nations.length > 0) {
                const userNation = nations[0];
                setNation(userNation);

                // Stagger the API calls to prevent rate limiting
                const resourceData = await Resource.filter({ nation_id: userNation.id });
                setResources(resourceData[0] || {});
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const cityData = await City.filter({ nation_id: userNation.id });
                setCities(cityData || []);
                
                // NEW: Load GameState for global environment data
                const gameStateData = await GameState.list();
                setGameState(gameStateData[0] || {});

                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Load config and transactions with additional delay
                setTimeout(async () => {
                    try {
                        const [configData, finTrans, resTrans] = await Promise.all([
                            GameConfig.list(),
                            FinancialTransaction.filter({ nation_id: userNation.id }, '-created_date', 1000), // Reduced limit
                            ResourceTransaction.filter({ nation_id: userNation.id }, '-created_date', 1000), // Reduced limit
                        ]);
                        
                        setGameConfig(configData[0] || {});
                        setFinancialTransactions(finTrans || []);
                        setResourceTransactions(resTrans || []);
                    } catch (transactionError) {
                        console.warn("EconomicDashboard: Could not load transaction data:", transactionError);
                        setFinancialTransactions([]);
                        setResourceTransactions([]);
                    }
                }, 300);
            }
        } catch (err) {
            console.error("EconomicDashboard: Error loading data:", err);
            if (err.message && err.message.includes('429')) {
                setError("Server is busy. Please wait a moment and refresh the page.");
            } else {
                setError("Failed to load economic data. Please try again later.");
            }
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        // Add delay before initial load to avoid conflicts with other pages
        const timer = setTimeout(() => {
            loadData();
        }, 500);
        
        return () => clearTimeout(timer);
    }, [loadData]);
    
    // Memoized Calculations
    const { totalIncome, netDailyIncome, resourceProduction } = useMemo(() => {
        if (!gameConfig || !cities.length) return { totalIncome: 0, netDailyIncome: 0, resourceProduction: {} };
        const income = cities.reduce((sum, city) => sum + (city.income_per_turn || 0), 0);
        const dailyIncome = gameConfig?.turns_per_game_day ? income * gameConfig.turns_per_game_day : 0;
        
        const production = {};
        const productionRates = gameConfig.resource_production_rates || {};
        const envSettings = gameConfig.environmental_settings || {};
        const diseaseSettings = gameConfig.disease_settings || {};

        cities.forEach(city => {
            const cityInfra = city.infrastructure || {};
            for (const [building, count] of Object.entries(cityInfra)) {
                const resourceProduced = buildingToResourceMap[building];
                if (resourceProduced) {
                    let rate = productionRates[building] || 0;
                    
                    // Apply food production penalties
                    if (resourceProduced === 'food') {
                        let foodReductionPercent = 0;
                        (envSettings.local_pollution_food_reduction_thresholds || []).forEach(t => {
                            if ((city.pollution_level || 0) >= t.level) foodReductionPercent = Math.max(foodReductionPercent, t.reduction_percent);
                        });
                        (envSettings.local_fallout_food_reduction_thresholds || []).forEach(t => {
                            if ((city.fallout_level || 0) >= t.level) foodReductionPercent = Math.max(foodReductionPercent, t.reduction_percent);
                        });
                        if (city.disease_active) {
                            foodReductionPercent = Math.max(foodReductionPercent, diseaseSettings.disease_food_reduction_percent || 0);
                        }
                        rate *= (1 - (foodReductionPercent / 100));
                    }
                    
                    production[resourceProduced] = (production[resourceProduced] || 0) + (count * rate);
                }
            }
        });
        
        // Apply global food production penalties (applied nationally)
        if (production.food > 0) {
            let globalFoodReductionPercent = 0;
            (envSettings.global_pollution_food_reduction_thresholds || []).forEach(t => {
                if ((gameState?.global_pollution_index || 0) >= t.level) globalFoodReductionPercent = Math.max(globalFoodReductionPercent, t.reduction_percent);
            });
            (envSettings.global_radiation_food_reduction_thresholds || []).forEach(t => {
                if ((gameState?.global_radiation_index || 0) >= t.level) globalFoodReductionPercent = Math.max(globalFoodReductionPercent, t.reduction_percent);
            });
            production.food *= (1 - (globalFoodReductionPercent / 100));
        }

        return { totalIncome: income, netDailyIncome: dailyIncome, resourceProduction: production };
    }, [cities, gameConfig, gameState]);

    // Memoized Transaction Filtering
    const summaryFinancialTransactions = useMemo(() => {
        if (!summaryDateRange.from) return [];
        return financialTransactions.filter(t => {
            const txDate = new Date(t.created_date);
            const fromDate = startOfDay(summaryDateRange.from);
            const toDate = endOfDay(summaryDateRange.to || new Date());
            return txDate >= fromDate && txDate <= toDate;
        });
    }, [financialTransactions, summaryDateRange]);
    
    const summaryResourceTransactions = useMemo(() => {
        if (!summaryDateRange.from) return [];
        return resourceTransactions.filter(t => {
            const txDate = new Date(t.created_date);
            const fromDate = startOfDay(summaryDateRange.from);
            const toDate = endOfDay(summaryDateRange.to || new Date());
            return txDate >= fromDate && txDate <= toDate;
        });
    }, [resourceTransactions, summaryDateRange]);

    if (isLoading) {
        return <div className="p-8 flex justify-center items-center h-full"><Loader2 className="w-12 h-12 text-amber-400 animate-spin" /></div>;
    }
    
    if (error) {
        return <div className="p-8 text-center text-red-400 bg-red-900/30 rounded-lg m-8"><AlertCircle className="w-12 h-12 mx-auto mb-4" /><h2 className="text-xl font-bold text-white mb-2">Error</h2><p>{error}</p></div>;
    }

    if (!nation) {
        return <div className="p-8 text-center text-slate-400">You must have a nation to access the economic dashboard. Please create one from the main Dashboard.</div>;
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <Banknote className="w-8 h-8 text-amber-400" />
                <div>
                    <h1 className="text-3xl font-bold text-white">Economic Dashboard</h1>
                    <p className="text-slate-400">Manage your nation's finances, resources, and production.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <NationalEconomyStats 
                        nation={nation}
                        totalIncome={totalIncome}
                        netDailyIncome={netDailyIncome}
                        cities={cities}
                    />
                </div>
                <div className="lg:col-span-1">
                    <GlobalEnvironmentStatus gameState={gameState} />
                </div>
            </div>

            <FinancialSummary 
                nation={nation}
                financialTransactions={summaryFinancialTransactions}
                resourceTransactions={summaryResourceTransactions}
                dateRange={summaryDateRange}
                onDateRangeChange={setSummaryDateRange}
                isLoading={isLoading}
            />
            
            <ResourceProduction 
                currentStockpile={resources} 
                productionPerTurn={resourceProduction}
            />

            <TransactionHistory 
                financialTransactions={financialTransactions}
                resourceTransactions={resourceTransactions}
                filters={historyFilters}
                onFilterChange={setHistoryFilters}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <CityEconomicReport cities={cities} />
                </div>
                <div>
                    <MarketplacePreview />
                </div>
            </div>
        </div>
    );
}

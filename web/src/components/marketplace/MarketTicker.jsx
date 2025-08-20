import React, { useState, useEffect } from "react";
import { MarketListing, GameConfig } from "@/api/entities";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MarketTicker() {
    const [listings, setListings] = useState([]);
    const [config, setConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [listingsData, configData] = await Promise.all([
                    MarketListing.filter({ status: 'active' }, '-created_date', 50),
                    GameConfig.list()
                ]);
                setListings(listingsData);
                setConfig(configData[0] || { market_ticker_speed_seconds: 30 });
            } catch (error) {
                console.error("Failed to load market ticker data:", error);
            }
            setIsLoading(false);
        };

        loadData();
        const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    if (isLoading || listings.length === 0) {
        return (
            <div className="bg-slate-900/90 border-slate-700 border rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-400">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Loading market data...</span>
                </div>
            </div>
        );
    }

    const tickerSpeed = config?.market_ticker_speed_seconds || 30;
    const totalValue = listings.reduce((sum, listing) => sum + listing.total_value, 0);

    return (
        <div className="bg-slate-900/90 border-slate-700 border rounded-lg overflow-hidden">
            <div className="p-2 bg-slate-800/50 border-b border-slate-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-white">Live Market</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Total Value:</span>
                        <Badge className="bg-green-500/20 text-green-400">
                            ${totalValue.toLocaleString()}
                        </Badge>
                    </div>
                </div>
            </div>
            
            <div className="relative h-8 overflow-hidden">
                <div 
                    className="absolute whitespace-nowrap flex items-center h-full animate-scroll"
                    style={{ 
                        animationDuration: `${tickerSpeed}s`,
                        animationTimingFunction: 'linear',
                        animationIterationCount: 'infinite'
                    }}
                >
                    {listings.map((listing, index) => (
                        <div key={`${listing.id}-${index}`} className="flex items-center gap-4 px-6">
                            <span className="text-sm text-slate-300 capitalize">
                                {listing.resource_type}
                            </span>
                            <span className="text-sm text-amber-400">
                                {listing.quantity.toLocaleString()} @ ${listing.price_per_unit.toFixed(2)}
                            </span>
                            <div className="w-px h-4 bg-slate-600"></div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes scroll {
                    from {
                        transform: translateX(100%);
                    }
                    to {
                        transform: translateX(-100%);
                    }
                }
                .animate-scroll {
                    animation-name: scroll;
                }
            `}</style>
        </div>
    );
}
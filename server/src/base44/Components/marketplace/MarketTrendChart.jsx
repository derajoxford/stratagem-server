import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';

export default function MarketTrendChart({ marketHistory }) {
    // Use the passed marketHistory prop instead of fetching data internally
    const chartData = marketHistory || [];

    const formatTooltip = (value, name) => {
        if (name === 'total_market_value') {
            return [`$${value.toLocaleString()}`, 'Market Value'];
        }
        if (name === 'total_listings') {
            return [`${value}`, 'Active Listings'];
        }
        return [value, name];
    };

    const formatXAxisLabel = (tickItem) => {
        return `Turn ${tickItem}`;
    };

    if (!chartData || chartData.length === 0) {
        return (
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-400" />
                        Market Trends
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 text-center">
                    <div className="text-slate-400">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No market data available yet.</p>
                        <p className="text-sm mt-2">Market trends will appear after a few game turns.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Market Trends
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div style={{ width: '100%', height: '300px' }}>
                    <ResponsiveContainer>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="turn_number" 
                                stroke="#9CA3AF"
                                tickFormatter={formatXAxisLabel}
                            />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip 
                                formatter={formatTooltip}
                                labelFormatter={(label) => `Turn ${label}`}
                                contentStyle={{
                                    backgroundColor: '#1E293B',
                                    border: '1px solid #374151',
                                    borderRadius: '0.5rem',
                                    color: '#F1F5F9'
                                }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="total_market_value" 
                                stroke="#10B981" 
                                strokeWidth={2}
                                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                                name="total_market_value"
                            />
                            <Line 
                                type="monotone" 
                                dataKey="total_listings" 
                                stroke="#3B82F6" 
                                strokeWidth={2}
                                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                                name="total_listings"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-green-400">
                            ${chartData[chartData.length - 1]?.total_market_value?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-slate-400">Current Market Value</div>
                    </div>
                    <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-400">
                            {chartData[chartData.length - 1]?.total_listings || '0'}
                        </div>
                        <div className="text-sm text-slate-400">Active Listings</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

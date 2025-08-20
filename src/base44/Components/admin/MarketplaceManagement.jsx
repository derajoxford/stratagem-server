
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Store, ShoppingCart, Ban } from 'lucide-react';
import { MarketListing, BuyOrder, Nation, GameState, FinancialTransaction } from '@/entities/all';

export default function MarketplaceManagement() {
    const [listings, setListings] = useState([]);
    const [buyOrders, setBuyOrders] = useState([]);
    const [nations, setNations] = useState({}); // For display (id to name)
    const [allNations, setAllNations] = useState([]); // For finding nation objects
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState({}); // Used for both delete and cancel operations
    const [feedback, setFeedback] = useState(null);
    const [gameState, setGameState] = useState(null);

    useEffect(() => {
        loadMarketData();
        const fetchGameState = async () => {
            try {
                const states = await GameState.list();
                if (states.length > 0) {
                    setGameState(states[0]);
                }
            } catch (err) {
                console.error("Failed to fetch game state:", err);
            }
        };
        fetchGameState();
    }, []);

    const loadMarketData = async () => {
        setIsLoading(true);
        try {
            const [listingsData, ordersData, nationsData] = await Promise.all([
                MarketListing.list('-created_date'),
                BuyOrder.list('-created_date'),
                Nation.list()
            ]);
            setListings(listingsData);
            setBuyOrders(ordersData);
            const nationMap = {};
            nationsData.forEach(n => { nationMap[n.id] = n.name; });
            setNations(nationMap);
            setAllNations(nationsData); // Store full nation objects
        } catch (error) {
            setFeedback({ type: 'error', message: 'Failed to load marketplace data.' });
        }
        setIsLoading(false);
    };

    const handleDeleteListing = async (listingId) => {
        setIsProcessing(prev => ({ ...prev, [listingId]: true }));
        try {
            await MarketListing.delete(listingId);
            setFeedback({ type: 'success', message: 'Market listing deleted.' });
            loadMarketData();
        } catch (error) {
            setFeedback({ type: 'error', message: 'Failed to delete listing.' });
        }
        setIsProcessing(prev => ({ ...prev, [listingId]: false }));
    };

    const handleDeleteBuyOrder = async (orderId) => {
        setIsProcessing(prev => ({ ...prev, [orderId]: true }));
        try {
            await BuyOrder.delete(orderId);
            setFeedback({ type: 'success', message: 'Buy order deleted.' });
            loadMarketData();
        } catch (error) {
            setFeedback({ type: 'error', message: 'Failed to delete buy order.' });
        }
        setIsProcessing(prev => ({ ...prev, [orderId]: false }));
    };

    const handleClearAllListings = async () => {
        if (!window.confirm(`Are you sure you want to delete all ${listings.length} market listings? This cannot be undone.`)) return;
        setIsLoading(true);
        try {
            const deletePromises = listings.map(listing => MarketListing.delete(listing.id));
            await Promise.all(deletePromises);
            setFeedback({ type: 'success', message: `Deleted ${listings.length} market listings.` });
            loadMarketData();
        } catch (error) {
            setFeedback({ type: 'error', message: 'Failed to clear all listings.' });
        }
        setIsLoading(false);
    };

    const handleClearAllOrders = async () => {
        if (!window.confirm(`Are you sure you want to delete all ${buyOrders.length} buy orders? This cannot be undone.`)) return;
        setIsLoading(true);
        try {
            const deletePromises = buyOrders.map(order => BuyOrder.delete(order.id));
            await Promise.all(deletePromises);
            setFeedback({ type: 'success', message: `Deleted ${buyOrders.length} buy orders.` });
            loadMarketData();
        } catch (error) {
            setFeedback({ type: 'error', message: 'Failed to clear all orders.' });
        }
        setIsLoading(false);
    };

    const handleCancelBuyOrder = async (order) => {
        if (!window.confirm(`Are you sure you want to cancel this buy order for ${order.quantity} ${order.resource_type}? The funds will be returned to the buyer.`)) {
            return;
        }
        setIsProcessing(prev => ({ ...prev, [order.id]: true }));
        try {
            const buyerNation = allNations.find(n => n.id === order.buyer_nation_id);
            if (!buyerNation) {
                throw new Error("Buyer nation not found.");
            }

            const currentTurn = gameState?.current_turn_number || 0;
            const orderBudget = order.quantity * order.max_price_per_unit; // Calculate total budget
            const newTreasury = buyerNation.treasury + orderBudget;

            await Promise.all([
                Nation.update(buyerNation.id, { treasury: newTreasury }),
                BuyOrder.update(order.id, { status: 'cancelled' }),
                FinancialTransaction.create({
                    nation_id: buyerNation.id,
                    transaction_type: 'inflow',
                    category: 'Market Refund',
                    sub_category: `Buy Order Cancelled (${order.resource_type})`,
                    amount: orderBudget,
                    new_balance: newTreasury,
                    related_entity_id: order.id,
                    turn_number: currentTurn,
                })
            ]);

            setFeedback({ type: 'success', message: 'Buy order cancelled and funds returned.' });
            loadMarketData();
        } catch (error) {
            console.error("Failed to cancel buy order:", error);
            setFeedback({ type: 'error', message: `Failed to cancel order: ${error.message}` });
        }
        setIsProcessing(prev => ({ ...prev, [order.id]: false }));
    };

    if (isLoading) return <p className="text-slate-400">Loading marketplace data...</p>;

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Store className="w-5 h-5 text-purple-400" />Marketplace Management</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                {feedback && <div className={`p-3 rounded-lg text-sm ${feedback.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{feedback.message}</div>}
                <div className="flex gap-4 mb-6">
                    <Button onClick={handleClearAllListings} disabled={isLoading || listings.length === 0} variant="destructive">Clear All Listings ({listings.length})</Button>
                    <Button onClick={handleClearAllOrders} disabled={isLoading || buyOrders.length === 0} variant="destructive">Clear All Buy Orders ({buyOrders.length})</Button>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-medium text-white mb-4">Market Listings</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {listings.length === 0 ? <p className="text-slate-400 text-sm">No listings found.</p> : listings.map((listing) => (
                                <div key={listing.id} className="p-3 bg-slate-700/50 rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <div><span className="text-white font-medium capitalize">{listing.resource_type}</span><Badge className={`ml-2 ${listing.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>{listing.status}</Badge></div>
                                        <Button onClick={() => handleDeleteListing(listing.id)} disabled={isProcessing[listing.id]} variant="destructive" size="sm">
                                            {isProcessing[listing.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        <div>Seller: {nations[listing.seller_nation_id] || 'Unknown'}</div>
                                        <div>Qty: {listing.quantity.toLocaleString()} @ ${listing.price_per_unit.toLocaleString()}/unit</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white mb-4">Buy Orders</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {buyOrders.length === 0 ? <p className="text-slate-400 text-sm">No buy orders found.</p> : buyOrders.map((order) => (
                                <div key={order.id} className="p-3 bg-slate-700/50 rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-white font-medium capitalize">{order.resource_type}</span>
                                            <Badge className={`ml-2 ${order.status === 'active' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>{order.status}</Badge>
                                        </div>
                                        <div className="flex gap-2">
                                            {order.status === 'active' && (
                                                <Button onClick={() => handleCancelBuyOrder(order)} disabled={isProcessing[order.id]} variant="outline" size="sm" className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30">
                                                    {isProcessing[order.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="w-4 h-4 mr-1" />}
                                                    Cancel
                                                </Button>
                                            )}
                                            <Button onClick={() => handleDeleteBuyOrder(order.id)} disabled={isProcessing[order.id]} variant="destructive" size="sm">
                                                {isProcessing[order.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        <div>Buyer: {nations[order.buyer_nation_id] || 'Unknown'}</div>
                                        <div>Qty: {order.quantity.toLocaleString()} @ Max ${order.max_price_per_unit.toLocaleString()}/unit</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

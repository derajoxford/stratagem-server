
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BuyOrder, Nation, Resource, MarketListing, ResourceTransaction, GameState } from "@/api/entities"; // Added ResourceTransaction and GameState
import {
  ShoppingCart,
  DollarSign,
  User,
  Package,
  Fuel,
  Gem,
  Zap,
  Mountain,
  Wheat,
  Coins,
  Pickaxe,
  Drill,
  Trees,
  Hammer,
  Layers,
  ShieldBan
} from "lucide-react";

const resourceIcons = {
  oil: Fuel,
  iron: Mountain,
  steel: Hammer,
  aluminum: Layers,
  coal: Pickaxe,
  uranium: Zap,
  food: Wheat,
  gold: Coins,
  bauxite: Mountain,
  copper: Drill,
  diamonds: Gem,
  wood: Trees
};

export default function BuyOrders({ buyOrders, myNation, allNations, onUpdate, resources, isBlockaded }) {
  const [isFulfilling, setIsFulfilling] = React.useState(null); // State to track which order is being fulfilled (its ID)
  const [nations, setNations] = React.useState({});
  const [feedback, setFeedback] = React.useState(null); // State for displaying feedback messages

  React.useEffect(() => {
    loadNationNames();
  }, [buyOrders]);

  const loadNationNames = async () => {
    const nationIds = [...new Set(buyOrders.map(o => o.buyer_nation_id))];
    const nationsData = await Nation.list();
    const nationMap = {};
    nationsData.forEach(n => {
      nationMap[n.id] = n.name;
    });
    setNations(nationMap);
  };

  const handleFulfillOrder = async (order) => {
    if (isBlockaded) {
      setFeedback({ type: 'error', message: 'Cannot fulfill orders while under naval blockade.' });
      return;
    }

    const availableResource = resources?.[order.resource_type] || 0;
    if (availableResource < order.quantity) {
      setFeedback({ type: 'error', message: `Insufficient ${order.resource_type} to fulfill this order.` });
      return;
    }

    setIsFulfilling(order.id);
    setFeedback(null); // Clear previous feedback

    try {
      // Fetch buyer's nation, GameState, and resources first
      const [buyer, gameStateData] = await Promise.all([
        Nation.get(order.buyer_nation_id),
        GameState.list() // Assuming GameState.list() returns an array
      ]);
      const gameState = gameStateData[0]; // Assuming current GameState is the first item
      const currentTurn = gameState?.current_turn_number || 0;

      if (!buyer) {
        console.error("Buyer nation not found. Cancelling buy order.");
        await BuyOrder.update(order.id, { status: 'cancelled' });
        onUpdate();
        setFeedback({ type: 'error', message: "Buyer nation not found. Order cancelled." });
        setIsFulfilling(null);
        return;
      }

      const buyerResourceData = await Resource.filter({ nation_id: order.buyer_nation_id });
      if (buyerResourceData.length === 0) {
        console.error("Buyer resources not found. Cancelling buy order.");
        await BuyOrder.update(order.id, { status: 'cancelled' });
        onUpdate();
        setFeedback({ type: 'error', message: "Buyer resources not found. Order cancelled." });
        setIsFulfilling(null);
        return;
      }
      const buyerResources = buyerResourceData[0]; // Get buyer's current resources

      const quantityToFulfill = order.quantity;
      const totalPayment = order.total_budget;

      const newSellerResourceAmount = availableResource - quantityToFulfill;
      const newSellerTreasury = myNation.treasury + totalPayment;

      const newBuyerResourceAmount = (buyerResources?.[order.resource_type] || 0) + quantityToFulfill;
      const newBuyerTreasury = buyer.treasury - totalPayment;

      const orderUpdate = { status: 'filled' };

      await Promise.all([
        // Update seller's resources and treasury
        Resource.update(resources.id, {
          ...resources,
          [order.resource_type]: newSellerResourceAmount
        }),
        Nation.update(myNation.id, { treasury: newSellerTreasury }),

        // Update buyer's resources and treasury  
        Resource.update(buyerResources.id, {
          ...buyerResources,
          [order.resource_type]: newBuyerResourceAmount
        }),
        Nation.update(buyer.id, { treasury: newBuyerTreasury }),

        // Update the buy order
        BuyOrder.update(order.id, orderUpdate),

        // Log resource transactions for seller (outflow)
        ResourceTransaction.create({
          nation_id: myNation.id,
          resource_type: order.resource_type,
          transaction_type: 'outflow',
          category: 'Market Trade',
          sub_category: `Fulfill Buy Order: ${order.resource_type}`,
          amount: quantityToFulfill,
          new_stockpile: newSellerResourceAmount,
          related_entity_id: order.id,
          turn_number: currentTurn
        }),

        // Log resource transactions for buyer (inflow)
        ResourceTransaction.create({
          nation_id: buyer.id,
          resource_type: order.resource_type,
          transaction_type: 'inflow',
          category: 'Market Trade',
          sub_category: `Buy Order Fulfilled: ${order.resource_type}`,
          amount: quantityToFulfill,
          new_stockpile: newBuyerResourceAmount,
          related_entity_id: order.id,
          turn_number: currentTurn
        }),
      ]);

      onUpdate();
      setFeedback({ type: 'success', message: `Successfully fulfilled ${quantityToFulfill.toLocaleString()} ${order.resource_type} for $${totalPayment.toLocaleString()}!` });
    } catch (error) {
      console.error("Error fulfilling buy order:", error);
      setFeedback({ type: 'error', message: `Error fulfilling buy order: ${error.message}` });
    } finally {
      setIsFulfilling(null);
    }
  };

  const filteredOrders = buyOrders.filter(o => o.buyer_nation_id !== myNation.id);

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-400" />
          Active Buy Orders
          {isBlockaded && (
            <Badge variant="destructive" className="ml-2">
              <ShieldBan className="w-3 h-3 mr-1" />
              Blocked
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {feedback && (
          <div className={`p-3 rounded-md mb-4 text-sm ${feedback.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
            {feedback.message}
          </div>
        )}

        {filteredOrders.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredOrders.map((order) => {
              const ResourceIcon = resourceIcons[order.resource_type];
              const availableResource = resources?.[order.resource_type] || 0;
              const canFulfill = availableResource >= order.quantity;
              const buyerName = nations[order.buyer_nation_id] || 'Unknown Nation';

              return (
                <div key={order.id} className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-2">
                    {/* Left-side info block - Grouping original grid content responsively */}
                    <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2">
                      {/* Resource Type & Icon */}
                      <div className="flex items-center gap-2">
                        {ResourceIcon && <ResourceIcon className="w-5 h-5 text-blue-400" />}
                        <span className="text-white capitalize font-medium">{order.resource_type}</span>
                      </div>

                      {/* Quantity & Max Per Unit */}
                      <div className="text-sm">
                        <div className="text-slate-400">Qty: <span className="text-white font-medium">{order.quantity.toLocaleString()}</span></div>
                        <div className="text-slate-400">Max Per Unit: <span className="text-green-400 font-medium">${order.max_price_per_unit.toLocaleString()}</span></div>
                      </div>

                      {/* Buyer */}
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-400">Buyer:</span>
                        <span className="text-white font-medium">{buyerName}</span>
                      </div>

                      {/* Your stock & Total Payment */}
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-500" />
                          <span className="text-slate-400">You have:</span>
                          <span className={`font-medium ${canFulfill ? 'text-green-400' : 'text-red-400'}`}>
                            {availableResource.toLocaleString()} units
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <DollarSign className="w-4 h-4 text-green-400" />
                          <span className="text-slate-400">Total Payment:</span>
                          <span className="text-green-400 font-bold">${order.total_budget.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex justify-start">
                        <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                          Wanted
                        </Badge>
                      </div>
                    </div>

                    {/* Right-side button */}
                    {order.buyer_nation_id !== myNation.id && (
                      <Button
                        onClick={() => handleFulfillOrder(order)}
                        disabled={isFulfilling !== null || !canFulfill || isBlockaded}
                        className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600"
                        size="sm"
                      >
                        {isFulfilling === order.id ? "Selling..." : (
                          isBlockaded ? 'Blocked' : (
                            canFulfill ? (
                              <>
                                <Package className="w-4 h-4 mr-2" />
                                Sell
                              </>
                            ) : "Insufficient Resources"
                          )
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Buy Orders</h3>
            <p className="text-slate-400">
              No nations are currently looking to purchase resources.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

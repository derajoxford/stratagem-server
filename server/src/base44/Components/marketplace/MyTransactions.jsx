
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketListing, BuyOrder, Resource, Nation } from "@/entities/all";
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  X,
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
  Layers // Added Layers icon for aluminum
} from "lucide-react";

const resourceIcons = {
  oil: Fuel,
  iron: Mountain,
  steel: Hammer,
  aluminum: Layers, // Added aluminum with Layers icon
  coal: Pickaxe,
  uranium: Zap,
  food: Wheat,
  gold: Coins,
  bauxite: Mountain,
  copper: Drill,
  diamonds: Gem,
  wood: Trees
};

export default function MyTransactions({ nation, listings, buyOrders, onUpdate }) {
  const [isCancelling, setIsCancelling] = React.useState({});

  const handleCancelListing = async (listing) => {
    setIsCancelling({ ...isCancelling, [listing.id]: true });

    try {
      // Return resources to seller's inventory
      const resourceData = await Resource.filter({ nation_id: nation.id });
      const resources = resourceData[0];
      const updatedResources = {
        ...resources,
        [listing.resource_type]: (resources[listing.resource_type] || 0) + listing.quantity
      };

      await Promise.all([
        Resource.update(resources.id, updatedResources),
        MarketListing.update(listing.id, { status: 'cancelled' })
      ]);

      onUpdate();
    } catch (error) {
      console.error("Error cancelling listing:", error);
    }

    setIsCancelling({ ...isCancelling, [listing.id]: false });
  };

  const handleCancelBuyOrder = async (order) => {
    setIsCancelling({ ...isCancelling, [order.id]: true });

    try {
      // Return funds to buyer's treasury
      await Promise.all([
        Nation.update(nation.id, { treasury: nation.treasury + order.total_budget }),
        BuyOrder.update(order.id, { status: 'cancelled' })
      ]);

      onUpdate();
    } catch (error) {
      console.error("Error cancelling buy order:", error);
    }

    setIsCancelling({ ...isCancelling, [order.id]: false });
  };

  return (
    <Tabs defaultValue="listings" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
        <TabsTrigger value="listings" className="data-[state=active]:bg-slate-700">
          My Listings ({listings.length})
        </TabsTrigger>
        <TabsTrigger value="orders" className="data-[state=active]:bg-slate-700">
          My Buy Orders ({buyOrders.length})
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="listings" className="mt-6">
        {listings.length === 0 ? (
          <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardContent className="text-center py-12">
              <Package className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Active Listings</h3>
              <p className="text-slate-400">You haven't created any resource listings yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => {
              const ResourceIcon = resourceIcons[listing.resource_type];

              return (
                <Card key={listing.id} className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ResourceIcon className="w-6 h-6 text-green-400" />
                        <CardTitle className="text-white capitalize">
                          {listing.resource_type}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="border-green-500/30 text-green-400">
                        Listed
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Quantity:</span>
                        <div className="text-white font-medium">
                          {listing.quantity.toLocaleString()} units
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Per Unit:</span>
                        <div className="text-amber-400 font-medium">
                          ${listing.price_per_unit.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Total Value:</span>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 font-bold">
                            ${listing.total_value.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleCancelListing(listing)}
                      disabled={isCancelling[listing.id]}
                      variant="outline"
                      className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      {isCancelling[listing.id] ? "Cancelling..." : (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Cancel Listing
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="orders" className="mt-6">
        {buyOrders.length === 0 ? (
          <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardContent className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Active Buy Orders</h3>
              <p className="text-slate-400">You haven't created any buy orders yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buyOrders.map((order) => {
              const ResourceIcon = resourceIcons[order.resource_type];

              return (
                <Card key={order.id} className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ResourceIcon className="w-6 h-6 text-blue-400" />
                        <CardTitle className="text-white capitalize">
                          {order.resource_type}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                        Wanted
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Quantity:</span>
                        <div className="text-white font-medium">
                          {order.quantity.toLocaleString()} units
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Max Per Unit:</span>
                        <div className="text-green-400 font-medium">
                          ${order.max_price_per_unit.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Budget Reserved:</span>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400 font-bold">
                            ${order.total_budget.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleCancelBuyOrder(order)}
                      disabled={isCancelling[order.id]}
                      variant="outline"
                      className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      {isCancelling[order.id] ? "Cancelling..." : (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Cancel Order
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

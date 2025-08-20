
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MarketListing, Nation, Resource, GameState, FinancialTransaction } from "@/entities/all";
import { ShoppingCart, DollarSign, Package, User, Store, ShieldBan, Loader2 } from "lucide-react";
import { ResourceTransaction } from "@/entities/ResourceTransaction"; // Added ResourceTransaction import

export default function MarketListings({ listings, myNation, allNations, onBuy, isBlocked = false }) {
  const [buyQuantities, setBuyQuantities] = useState({});
  const [isBuying, setIsBuying] = useState(null); // Changed isProcessing to isBuying, stores listing.id if a purchase is in progress
  const [feedback, setFeedback] = useState(null); // Added feedback state

  const handleQuantityChange = (listingId, quantity) => {
    setBuyQuantities(prev => ({
      ...prev,
      [listingId]: Math.max(1, Math.min(quantity, getMaxPurchasableQuantity(listingId)))
    }));
  };

  const getMaxPurchasableQuantity = (listingId) => {
    const listing = listings.find(l => l.id === listingId);
    if (!listing || !myNation) return 0;
    
    const maxAffordable = Math.floor(myNation.treasury / listing.price_per_unit);
    return Math.min(maxAffordable, listing.quantity);
  };

  const getBuyQuantity = (listingId) => {
    return buyQuantities[listingId] || 1;
  };

  const getCostForQuantity = (listing, quantity) => {
    return quantity * listing.price_per_unit;
  };

  const handleBuy = async (listing, quantity) => { // Modified signature to accept quantity
    if (isBlocked) {
      setFeedback({ type: 'error', message: 'Cannot purchase resources while under naval blockade.' });
      return;
    }
    if (!myNation || listing.seller_nation_id === myNation.id) {
      setFeedback({ type: 'error', message: 'You cannot buy from your own listing.' });
      return;
    }

    const quantityToBuy = quantity; // Use the passed quantity directly
    const totalCost = getCostForQuantity(listing, quantityToBuy);

    if (myNation.treasury < totalCost) {
      setFeedback({ type: 'error', message: 'Insufficient funds for this purchase.' }); // Changed alert to setFeedback
      return;
    }

    setIsBuying(listing.id); // Set processing state for the specific listing
    setFeedback(null); // Clear previous feedback

    try {
      // Get current seller and buyer data, and game state
      // FIX: Removed fetching seller's resources as it's not needed and causes errors.
      // Resources were already removed from seller when the listing was created.
      const [seller, buyerResources, gameState] = await Promise.all([
        Nation.get(listing.seller_nation_id),
        Resource.filter({ nation_id: myNation.id }).then(res => res[0]), // Ensure we get the single resource object
        GameState.list().then(res => res[0]), // Fetch current game state for turn number
      ]);
      
      // FIX: Simplified check.
      if (!seller || !buyerResources) {
        throw new Error("Could not find seller or buyer resources.");
      }

      const currentTurn = gameState?.current_turn_number || 0; // Get current turn number

      // Update buyer's treasury and resources
      const newBuyerTreasury = myNation.treasury - totalCost;
      const currentBuyerResourceAmount = buyerResources[listing.resource_type] || 0;
      const updatedBuyerResourceAmount = currentBuyerResourceAmount + quantityToBuy;

      // Update seller's treasury
      const newSellerTreasury = seller.treasury + totalCost;
      // Subtract the quantity from seller's resources - NO LONGER NEEDED, removed when listing was created

      // Update or remove the listing based on remaining quantity
      const newListingQuantity = listing.quantity - quantityToBuy;
      const listingUpdate = {
        quantity: newListingQuantity,
        status: newListingQuantity <= 0 ? 'sold' : 'active', // Set status to 'sold' if quantity is 0 or less
      };

      await Promise.all([
        // Update buyer's nation treasury
        Nation.update(myNation.id, { treasury: newBuyerTreasury }),
        
        // Update buyer's resources
        Resource.update(buyerResources.id, {
          ...buyerResources,
          [listing.resource_type]: updatedBuyerResourceAmount
        }),
        
        // Update seller's treasury
        Nation.update(seller.id, { treasury: newSellerTreasury }),

        // FIX: Removed the incorrect attempt to update seller's resources.
        // Resource.update(sellerResources.id, {
        //     ...sellerResources,
        //     [listing.resource_type]: updatedSellerResourceAmount
        // }),
        
        // Update the market listing
        MarketListing.update(listing.id, listingUpdate),

        // Log resource transaction for buyer (inflow)
        ResourceTransaction.create({
          nation_id: myNation.id,
          resource_type: listing.resource_type,
          transaction_type: 'inflow',
          category: 'Market Trade',
          sub_category: `Market Purchase: ${listing.resource_type}`,
          amount: quantityToBuy,
          new_stockpile: updatedBuyerResourceAmount,
          related_entity_id: listing.id,
          turn_number: currentTurn
        }),

        // Log buyer's financial transaction
        FinancialTransaction.create({
            nation_id: myNation.id,
            transaction_type: 'outflow',
            category: 'Market Purchase',
            sub_category: `${quantityToBuy} ${listing.resource_type} @ $${listing.price_per_unit}`,
            amount: totalCost,
            new_balance: newBuyerTreasury,
            related_entity_id: listing.id, // Link to the market listing
            turn_number: currentTurn,
        }),
        // Log seller's financial transaction
        FinancialTransaction.create({
            nation_id: seller.id,
            transaction_type: 'inflow',
            category: 'Market Sale',
            sub_category: `${quantityToBuy} ${listing.resource_type} @ $${listing.price_per_unit}`,
            amount: totalCost,
            new_balance: newSellerTreasury,
            related_entity_id: listing.id, // Link to the market listing
            turn_number: currentTurn,
        }),
      ]);

      onBuy(); // Kept onBuy as per current code (outline had onUpdate)
      setFeedback({ type: 'success', message: `Successfully purchased ${quantityToBuy} ${listing.resource_type} for $${totalCost.toLocaleString()}!` });

    } catch (error) {
      console.error("Purchase failed:", error);
      setFeedback({ type: 'error', message: "Failed to complete purchase. Please try again." }); // Changed alert to setFeedback
    } finally {
      setIsBuying(null); // Clear processing state
      // setBuyQuantities({}); // Removed as per outline
    }
  };

  const getNationName = (nationId) => {
    const nation = allNations.find(n => n.id === nationId);
    return nation?.name || 'Unknown Nation';
  };

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Store className="w-5 h-5 text-purple-400" />
          Market Listings
          {isBlocked && (
            <Badge variant="destructive" className="ml-2">
              <ShieldBan className="w-3 h-3 mr-1" />
              Blocked
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {feedback && (
          <div className={`mb-4 p-3 rounded-md text-sm ${
            feedback.type === 'error' ? 'bg-red-900/50 text-red-300 border border-red-800' : 'bg-green-900/50 text-green-300 border border-green-800'
          }`}>
            {feedback.message}
          </div>
        )}

        {!listings.length ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">No active listings available</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {listings.map((listing) => {
              const maxPurchasable = getMaxPurchasableQuantity(listing.id);
              const selectedQuantity = getBuyQuantity(listing.id);
              const totalCost = getCostForQuantity(listing, selectedQuantity);
              const isOwnListing = listing.seller_nation_id === myNation?.id;
              const canBuy = !isOwnListing && maxPurchasable > 0 && myNation?.treasury >= totalCost && !isBlocked;

              return (
                <Card key={listing.id} className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-xl font-bold text-white capitalize">
                            {listing.resource_type}
                          </h4>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {listing.quantity.toLocaleString()} available
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-slate-300 mb-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            <span>${listing.price_per_unit.toLocaleString()} per unit</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-400" />
                            <span>{getNationName(listing.seller_nation_id)}</span>
                          </div>
                        </div>

                        {!isOwnListing && maxPurchasable > 0 && (
                          <div className="flex items-center gap-3 mb-3">
                            <label className="text-slate-400 text-sm whitespace-nowrap">
                              Quantity to buy:
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max={maxPurchasable}
                              value={selectedQuantity}
                              onChange={(e) => handleQuantityChange(listing.id, parseInt(e.target.value))}
                              className="w-32 bg-slate-700 border-slate-600 text-white"
                              disabled={isBlocked || isBuying === listing.id} // Disable input during purchase
                            />
                            <span className="text-slate-400 text-sm">
                              (max: {maxPurchasable.toLocaleString()})
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        {!isOwnListing && maxPurchasable > 0 && (
                          <>
                            <div className="text-slate-400 text-sm mb-2">
                              Total Cost: <span className="text-white font-bold">${totalCost.toLocaleString()}</span>
                            </div>
                            <Button
                              // Pass selectedQuantity to handleBuy
                              onClick={() => handleBuy(listing, selectedQuantity)}
                              // Update disabled check to use isBuying state
                              disabled={!canBuy || isBuying === listing.id || isBlocked}
                              className={`${(canBuy && !isBlocked) ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600'} min-w-24`}
                              size="sm"
                            >
                              {/* Update button text for loading state */}
                              {isBuying === listing.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                isBlocked ? "Blocked" : "Buy"
                              )}
                            </Button>
                          </>
                        )}
                        
                        {isOwnListing && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                            Your Listing
                          </Badge>
                        )}
                        
                        {!isOwnListing && maxPurchasable === 0 && (
                          <Badge variant="secondary" className="bg-slate-600/50 text-slate-400">
                            Cannot Afford
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketListing, Nation, Resource } from "@/entities/all";
import { ResourceTransaction } from "@/entities/ResourceTransaction"; // NEW import
import { GameState } from "@/entities/GameState"; // NEW import (assuming GameState is a separate entity)
import { Package, ShieldBan, Loader2, Tag } from "lucide-react";

const resourceTypes = [
  { value: 'oil', label: 'Oil' },
  { value: 'iron', label: 'Iron' },
  { value: 'steel', label: 'Steel' },
  { value: 'aluminum', label: 'Aluminum' },
  { value: 'coal', label: 'Coal' },
  { value: 'uranium', label: 'Uranium' },
  { value: 'food', label: 'Food' },
  { value: 'gold', label: 'Gold' },
  { value: 'bauxite', label: 'Bauxite' },
  { value: 'copper', label: 'Copper' },
  { value: 'diamonds', label: 'Diamonds' },
  { value: 'wood', label: 'Wood' },
  { value: 'ammo', label: 'Ammo' }
];

export default function CreateListing({ onUpdate, nation, resources, isBlockaded = false }) {
  const [listingData, setListingData] = useState({
    resource_type: '',
    quantity: '',
    price_per_unit: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const selectedResourceAmount = resources?.[listingData.resource_type] || 0;
  const totalValue = (parseFloat(listingData.quantity) || 0) * (parseFloat(listingData.price_per_unit) || 0);
  const canList = listingData.resource_type &&
                 parseFloat(listingData.quantity) > 0 &&
                 parseFloat(listingData.quantity) <= selectedResourceAmount &&
                 parseFloat(listingData.price_per_unit) > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isBlockaded) {
        setFeedback({ type: 'error', message: 'Cannot create listings while under naval blockade.' });
        return;
    }

    if (!canList || !resources || !nation) {
        setFeedback({ type: 'error', message: 'Please ensure all fields are valid and you have sufficient resources.' });
        return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const resourceType = listingData.resource_type;
      const quantity = parseFloat(listingData.quantity);
      const pricePerUnit = parseFloat(listingData.price_per_unit);
      const totalListingValue = quantity * pricePerUnit;

      // Fetch current game state for turn number
      const [gameState] = await Promise.all([
        GameState.list().then(res => res[0])
      ]);
      const currentTurn = gameState?.current_turn_number || 0;

      // Calculate new resource amount
      const currentAmount = resources?.[resourceType] || 0;
      const newAmount = currentAmount - quantity;

      await Promise.all([
        // Create the market listing
        MarketListing.create({
          seller_nation_id: nation.id,
          resource_type: resourceType,
          quantity: quantity,
          price_per_unit: pricePerUnit,
          total_value: totalListingValue,
          status: 'active'
        }),
        
        // Remove resources from seller's inventory
        Resource.update(resources.id, {
          ...resources,
          [resourceType]: newAmount
        }),

        // Log resource transaction for seller (outflow)
        ResourceTransaction.create({
          nation_id: nation.id,
          resource_type: resourceType,
          transaction_type: 'outflow',
          category: 'Market Trade',
          sub_category: `Market Listing: ${resourceType}`,
          amount: quantity,
          new_stockpile: newAmount,
          turn_number: currentTurn
        })
      ]);

      // Reset form
      setListingData({
        resource_type: '',
        quantity: '',
        price_per_unit: ''
      });
      setFeedback({ type: 'success', message: 'Listing created successfully!' });
      onUpdate();
    } catch (error) {
      console.error("Error creating listing:", error);
      setFeedback({ type: 'error', message: `Error creating listing: ${error.message || 'Unknown error'}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-green-400" />
          Create Listing
        </CardTitle>
        {isBlockaded && (
            <div className="text-red-400 text-sm flex items-center gap-2 mt-2">
                <ShieldBan className="w-4 h-4" />
                Trading disabled due to naval blockade
            </div>
        )}
      </CardHeader>
      <CardContent>
        {feedback && (
          <div className={`p-3 rounded-md mb-4 text-sm ${feedback.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Resource Type</Label>
            <Select
              value={listingData.resource_type}
              onValueChange={(value) => {
                setListingData({...listingData, resource_type: value, quantity: ''});
                setFeedback(null);
              }}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select resource to sell" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {resourceTypes.map((type) => {
                  const amount = resources?.[type.value] || 0;
                  return (
                    <SelectItem
                      key={type.value}
                      value={type.value}
                      className="text-white"
                      disabled={amount === 0}
                    >
                      {type.label} ({amount.toLocaleString()} available)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {listingData.resource_type && (
            <>
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-slate-300">
                  Quantity (Max: {selectedResourceAmount.toLocaleString()})
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedResourceAmount}
                  value={listingData.quantity}
                  onChange={(e) => {
                    setListingData({...listingData, quantity: e.target.value});
                    setFeedback(null);
                  }}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Enter quantity to sell"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="text-slate-300">Price per Unit ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={listingData.price_per_unit}
                  onChange={(e) => {
                    setListingData({...listingData, price_per_unit: e.target.value});
                    setFeedback(null);
                  }}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Enter price per unit"
                />
              </div>

              {totalValue > 0 && (
                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Value:</span>
                    <div className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-bold text-lg">
                        ${totalValue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={!canList || isSubmitting || isBlockaded}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:bg-slate-600"
              >
                {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Package className="w-4 h-4 mr-2" />
                )}
                {isBlockaded ? 'Blocked by Naval Blockade' : (isSubmitting ? 'Creating...' : 'Create Listing')}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

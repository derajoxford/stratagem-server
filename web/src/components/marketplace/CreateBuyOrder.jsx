
import React, { useState, useEffect } from "react";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuyOrder, Nation, GameState, FinancialTransaction } from "@/api/entities"; // Added GameState and FinancialTransaction
import { DollarSign, ShoppingCart, ShieldBan, Loader2 } from "lucide-react"; // Ensured used icons are imported

const resourceTypes = [
  { value: 'oil', label: 'Oil' },
  { value: 'iron', label: 'Iron' },
  { value: 'steel', label: 'Steel' },
  { value: 'aluminum', label: 'Aluminum' },
  { value: 'coal', label: 'Coal' },
  { value: 'uranium', label: 'Uranium' },
  { value: 'food', label: 'Food' },
  { value: 'gold', label: 'Gold' },
  { value: 'bauxite', 'label': 'Bauxite' },
  { value: 'copper', label: 'Copper' },
  { value: 'diamonds', label: 'Diamonds' },
  { value: 'wood', label: 'Wood' },
  { value: 'ammo', label: 'Ammo' }
];

export default function CreateBuyOrder({ myNation, onUpdate, isBlocked = false }) { // Changed onOrderCreated to onUpdate
  const [orderData, setOrderData] = useState({
    resource_type: '',
    quantity: '',
    max_price_per_unit: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [gameState, setGameState] = useState(null); // Added gameState state

  // Guard clause to prevent rendering if nation data is not available
  if (!myNation) {
    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <ShoppingCart className="w-6 h-6 text-blue-400" />
                    Create Buy Order
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-slate-400">Loading nation data...</p>
            </CardContent>
        </Card>
    );
  }

  // Effect hook to fetch game state
  useEffect(() => {
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

  const totalBudget = (parseFloat(orderData.quantity) || 0) * (parseFloat(orderData.max_price_per_unit) || 0);
  const canCreateOrder = orderData.resource_type &&
                        parseFloat(orderData.quantity) > 0 &&
                        parseFloat(orderData.max_price_per_unit) > 0 &&
                        totalBudget <= myNation.treasury;

  const handleSubmit = async (e) => { // Renamed from handleCreateOrder to handleSubmit to match existing code structure
    e.preventDefault();

    setFeedback(null); // Clear previous feedback

    if (isBlocked) {
        setFeedback({ type: 'error', message: 'Cannot create buy orders while under naval blockade.' });
        return;
    }
    
    // The existing canCreateOrder check already handles validation for quantity, price, and treasury.
    // We add specific feedback messages if the condition is not met.
    if (!canCreateOrder) {
        if (!orderData.resource_type || parseFloat(orderData.quantity) <= 0 || parseFloat(orderData.max_price_per_unit) <= 0) {
            setFeedback({ type: 'error', message: 'Please select a resource and enter positive values for quantity and price.' });
        } else if (totalBudget > myNation.treasury) {
            setFeedback({ type: 'error', message: `Insufficient funds. You need $${(totalBudget - myNation.treasury).toLocaleString()} more.` });
        }
        return;
    }

    setIsSubmitting(true);
    try {
      const quantity = parseFloat(orderData.quantity);
      const maxPricePerUnit = parseFloat(orderData.max_price_per_unit);
      const budget = quantity * maxPricePerUnit;
      const currentTurn = gameState?.current_turn_number || 0; // Get current turn number

      // Create the buy order
      const newOrder = await BuyOrder.create({
        buyer_nation_id: myNation.id,
        resource_type: orderData.resource_type,
        quantity: quantity,
        max_price_per_unit: maxPricePerUnit,
        total_budget: budget,
        status: 'active'
      });

      // Calculate new treasury before updating
      const newNationTreasury = myNation.treasury - budget;

      // Reserve funds from buyer's treasury
      await Nation.update(myNation.id, {
        treasury: newNationTreasury
      });

      // Create Financial Transaction record for the buy order
      await FinancialTransaction.create({
        nation_id: myNation.id,
        transaction_type: 'outflow',
        category: 'Market Purchase',
        sub_category: `Buy Order Placed (${orderData.resource_type})`,
        amount: budget,
        new_balance: newNationTreasury,
        related_entity_id: newOrder.id,
        turn_number: currentTurn,
      });

      // Reset form
      setOrderData({
        resource_type: '',
        quantity: '',
        max_price_per_unit: ''
      });

      onUpdate(); // Changed from onOrderCreated to onUpdate
      setFeedback({ type: 'success', message: 'Buy order created successfully!' });
    } catch (error) {
      console.error("Error creating buy order:", error);
      setFeedback({ type: 'error', message: `Error creating buy order: ${error.message || error}` });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-400" />
          Create Buy Order
        </CardTitle>
        {isBlocked && (
            <div className="text-red-400 text-sm flex items-center gap-2 mt-2">
                <ShieldBan className="w-4 h-4" />
                Trading disabled due to naval blockade
            </div>
        )}
      </CardHeader>
      <CardContent>
        {feedback && (
            <div className={`p-3 rounded-md mb-4 ${feedback.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
                {feedback.message}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Resource Type</Label>
            <Select
              value={orderData.resource_type}
              onValueChange={(value) => setOrderData({...orderData, resource_type: value})}
              disabled={isBlocked || isSubmitting}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select resource to buy" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {resourceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-white">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-slate-300">Quantity Needed</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={orderData.quantity}
              onChange={(e) => setOrderData({...orderData, quantity: e.target.value})}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Enter quantity needed"
              disabled={isBlocked || isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPrice" className="text-slate-300">Maximum Price per Unit ($)</Label>
            <Input
              id="maxPrice"
              type="number"
              min="0.01"
              step="0.01"
              value={orderData.max_price_per_unit}
              onChange={(e) => setOrderData({...orderData, max_price_per_unit: e.target.value})}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Enter max price per unit"
              disabled={isBlocked || isSubmitting}
            />
          </div>

          {totalBudget > 0 && (
            <div className="space-y-3">
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400">Total Budget Required:</span>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    <span className={`font-bold text-lg ${totalBudget <= myNation.treasury ? 'text-green-400' : 'text-red-400'}`}>
                      ${totalBudget.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Available Treasury:</span>
                  <span className="text-white">${myNation.treasury.toLocaleString()}</span>
                </div>
              </div>

              {totalBudget > myNation.treasury && (
                <p className="text-red-400 text-sm">
                  Insufficient funds. You need ${(totalBudget - myNation.treasury).toLocaleString()} more.
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={!canCreateOrder || isSubmitting || isBlocked}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
            {isBlocked ? 'Blocked by Naval Blockade' : (isSubmitting ? 'Creating...' : 'Create Buy Order')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Banknote, Package, Send, Loader2, ArrowDownToLine,
  ArrowUpToLine, History, UserPlus, TrendingUp,
  ShieldBan, Upload
} from "lucide-react";
import { format } from "date-fns";
import { Alliance, Nation, Resource, AllianceTransaction, GameState, FinancialTransaction } from "@/api/entities"; // Added GameState and FinancialTransaction
import { transferAllianceFunds } from "@/api/functions";

const resourceTypes = [
  'oil', 'iron', 'steel', 'aluminum', 'coal', 'uranium',
  'food', 'gold', 'bauxite', 'copper', 'diamonds', 'wood', 'ammo'
];

const resourceIcons = {
  oil: Package, iron: Package, steel: Package, aluminum: Package, coal: Package, uranium: Package,
  food: Package, gold: Package, bauxite: Package, copper: Package, diamonds: Package, wood: Package, ammo: Package
};

export default function AllianceBank({ alliance, myNation, myNationResources, allNationsData, allianceTransactions, onUpdate, userPermissions }) {
  // CRITICAL: This comment ensures the component is completely new
  // Build timestamp: 2025-01-11-01:15

  // Existing deposit/withdraw states
  const [moneyDeposit, setMoneyDeposit] = useState('');
  const [resourceDeposits, setResourceDeposits] = useState({});
  const [moneyWithdraw, setMoneyWithdraw] = useState('');
  const [resourceWithdrawals, setResourceWithdrawals] = useState({});

  // NEW: Transfer states - these are the critical additions
  const [transferTargetNation, setTransferTargetNation] = useState('');
  const [transferMoney, setTransferMoney] = useState('');
  const [transferResources, setTransferResources] = useState({});
  const [transferNote, setTransferNote] = useState('');

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  // NEW: Feedback state for messages (e.g., blockade)
  const [feedback, setFeedback] = useState(null);

  // NEW: GameState for turn number
  const [gameState, setGameState] = useState(null);

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

  // Check permissions
  const myRoleKey = alliance?.founder_nation_id === myNation?.id
    ? 'founder'
    : alliance?.member_roles?.[myNation?.id] || 'member';
  const myPermissions = (myRoleKey && alliance?.custom_roles?.[myRoleKey]?.permissions) || {};
  const canWithdraw = myPermissions.withdraw_funds || alliance?.founder_nation_id === myNation?.id;

  // Get alliance member nations for transfer dropdown
  const allianceMembers = allNationsData?.filter(n =>
    n.id === alliance?.founder_nation_id ||
    alliance?.member_nations?.includes(n.id)
  ) || [];

  const handleResourceDeposit = (resource, value) => {
    const amount = parseInt(value) || 0;
    const maxAmount = myNationResources?.[resource] || 0;
    setResourceDeposits(prev => ({
      ...prev,
      [resource]: Math.max(0, Math.min(amount, maxAmount))
    }));
  };

  const handleResourceWithdrawal = (resource, value) => {
    const amount = parseInt(value) || 0;
    const maxAmount = alliance?.resources?.[resource] || 0;
    setResourceWithdrawals(prev => ({
      ...prev,
      [resource]: Math.max(0, Math.min(amount, maxAmount))
    }));
  };

  // NEW: Transfer resource handler
  const handleTransferResourceChange = (resource, value) => {
    const amount = parseInt(value) || 0;
    const maxAmount = alliance?.resources?.[resource] || 0;
    setTransferResources(prev => ({
      ...prev,
      [resource]: Math.max(0, Math.min(amount, maxAmount))
    }));
  };

  const handleDeposit = async (e) => { // Added 'e' parameter
    e.preventDefault(); // Prevent default form submission

    // NEW: Check if myNation is blockaded
    if (myNation?.is_blockaded) {
      setFeedback({
        type: 'error',
        message: 'Cannot make deposits while under naval blockade.'
      });
      return;
    }

    setIsProcessing(true);
    setFeedback(null); // Clear previous feedback when starting processing

    const moneyToDeposit = parseInt(moneyDeposit) || 0;
    const resourceChanges = {};
    Object.entries(resourceDeposits).forEach(([res, amount]) => {
      if (amount > 0) {
        resourceChanges[res] = amount;
      }
    });

    if (moneyToDeposit <= 0 && Object.keys(resourceChanges).length === 0) {
      setIsProcessing(false);
      setFeedback({ type: 'warning', message: 'Enter an amount to deposit.' });
      return;
    }

    // Validate funds
    if (myNation.treasury < moneyToDeposit) {
      console.error("Not enough money to deposit.");
      setFeedback({ type: 'error', message: 'You do not have enough money in your treasury.' });
      setIsProcessing(false);
      return;
    }
    for (const res in resourceChanges) {
      if ((myNationResources?.[res] || 0) < resourceChanges[res]) {
        console.error(`Not enough ${res} to deposit.`);
        setFeedback({ type: 'error', message: `You do not have enough ${res} in your stockpile.` });
        setIsProcessing(false);
        return;
      }
    }

    try {
      const currentTurn = gameState?.current_turn_number || 0; // Get current turn number

      const nationResourceUpdate = { ...myNationResources };
      const allianceResourceUpdate = { ...(alliance.resources || {}) };

      for (const res in resourceChanges) {
        const amount = resourceChanges[res];
        nationResourceUpdate[res] = (nationResourceUpdate[res] || 0) - amount;
        allianceResourceUpdate[res] = (allianceResourceUpdate[res] || 0) + amount;
      }

      const newNationTreasury = myNation.treasury - moneyToDeposit;
      const newAllianceTreasury = (alliance.treasury || 0) + moneyToDeposit;

      // Log transaction
      await AllianceTransaction.create({
        alliance_id: alliance.id,
        transaction_type: 'deposit',
        initiator_nation_id: myNation.id,
        amount: moneyToDeposit,
        resources: resourceChanges,
        description: `Deposited ${moneyToDeposit > 0 ? `$${moneyToDeposit.toLocaleString()}` : ''}${moneyToDeposit > 0 && Object.keys(resourceChanges).length > 0 ? ' and ' : ''}${Object.keys(resourceChanges).length > 0 ? 'resources' : ''}`
      });

      await Promise.all([
        Nation.update(myNation.id, { treasury: newNationTreasury }),
        Resource.update(myNationResources.id, nationResourceUpdate),
        Alliance.update(alliance.id, {
          treasury: newAllianceTreasury,
          resources: allianceResourceUpdate
        }),
        // Add FinancialTransaction logging for deposit
        moneyToDeposit > 0 && FinancialTransaction.create({
          nation_id: myNation.id,
          transaction_type: 'outflow',
          category: 'Alliance',
          sub_category: 'Deposit to Alliance Bank',
          amount: moneyToDeposit,
          new_balance: newNationTreasury,
          related_entity_id: alliance.id,
          turn_number: currentTurn,
        })
      ].filter(Boolean)); // Filter out false if moneyToDeposit is 0

      setMoneyDeposit('');
      setResourceDeposits({});
      setFeedback({ type: 'success', message: 'Deposit successful!' });
      onUpdate();
    } catch (error) {
      console.error("Error depositing to alliance bank:", error);
      setFeedback({ type: 'error', message: 'Failed to deposit: ' + error.message });
    }
    setIsProcessing(false);
  };

  const handleWithdraw = async () => {
    if (!canWithdraw) return;

    setIsProcessing(true);
    setFeedback(null); // Clear previous feedback

    const moneyToWithdraw = parseInt(moneyWithdraw) || 0;
    const resourceChanges = {};

    Object.entries(resourceWithdrawals).forEach(([res, amount]) => {
      if (amount > 0) {
        resourceChanges[res] = amount;
      }
    });

    if (moneyToWithdraw <= 0 && Object.keys(resourceChanges).length === 0) {
      setIsProcessing(false);
      setFeedback({ type: 'warning', message: 'Enter an amount to withdraw.' });
      return;
    }

    // Validate alliance funds
    if ((alliance.treasury || 0) < moneyToWithdraw) {
      console.error("Not enough money in alliance treasury.");
      setFeedback({ type: 'error', message: 'Not enough money in alliance treasury.' });
      setIsProcessing(false);
      return;
    }
    for (const res in resourceChanges) {
      if ((alliance.resources?.[res] || 0) < resourceChanges[res]) {
        console.error(`Not enough ${res} in alliance stockpile.`);
        setFeedback({ type: 'error', message: `Not enough ${res} in alliance stockpile.` });
        setIsProcessing(false);
        return;
      }
    }

    try {
      const currentTurn = gameState?.current_turn_number || 0; // Get current turn number

      const recipientNation = myNation;
      const recipientResources = myNationResources;

      if (!recipientResources) {
        console.error("Recipient nation resources not found.");
        setFeedback({ type: 'error', message: 'Recipient nation resources not found.' });
        setIsProcessing(false);
        return;
      }

      const recipientResourceUpdate = { ...recipientResources };
      const allianceResourceUpdate = { ...(alliance.resources || {}) };

      for (const res in resourceChanges) {
        const amount = resourceChanges[res];
        recipientResourceUpdate[res] = (recipientResourceUpdate[res] || 0) + amount;
        allianceResourceUpdate[res] = (allianceResourceUpdate[res] || 0) - amount;
      }

      const newNationTreasury = recipientNation.treasury + moneyToWithdraw;
      const newAllianceTreasury = (alliance.treasury || 0) - moneyToWithdraw;

      // Log transaction
      await AllianceTransaction.create({
        alliance_id: alliance.id,
        transaction_type: 'withdrawal',
        initiator_nation_id: myNation.id,
        recipient_nation_id: recipientNation.id,
        amount: moneyToWithdraw,
        resources: resourceChanges,
        description: `Withdrew ${moneyToWithdraw > 0 ? `$${moneyToWithdraw.toLocaleString()}` : ''}${moneyToWithdraw > 0 && Object.keys(resourceChanges).length > 0 ? ' and ' : ''}${Object.keys(resourceChanges).length > 0 ? 'resources' : ''} to ${recipientNation.name}`
      });

      await Promise.all([
        Nation.update(recipientNation.id, { treasury: newNationTreasury }),
        Resource.update(recipientResources.id, recipientResourceUpdate),
        Alliance.update(alliance.id, {
          treasury: newAllianceTreasury,
          resources: allianceResourceUpdate
        }),
        // Add FinancialTransaction logging for withdrawal
        moneyToWithdraw > 0 && FinancialTransaction.create({
          nation_id: myNation.id,
          transaction_type: 'inflow',
          category: 'Alliance',
          sub_category: 'Withdrawal from Alliance Bank',
          amount: moneyToWithdraw,
          new_balance: newNationTreasury,
          related_entity_id: alliance.id,
          turn_number: currentTurn,
        })
      ].filter(Boolean)); // Filter out false if moneyToWithdraw is 0

      setMoneyWithdraw('');
      setResourceWithdrawals({});
      setFeedback({ type: 'success', message: 'Withdrawal successful!' });
      onUpdate();

    } catch (error) {
      console.error("Error withdrawing from alliance bank:", error);
      setFeedback({ type: 'error', message: 'Failed to withdraw: ' + error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // NEW: Transfer function
  const handleTransfer = async () => {
    if (!canWithdraw) return;

    setIsProcessing(true);
    setFeedback(null); // Clear previous feedback

    const moneyToTransfer = parseInt(transferMoney) || 0;
    const resourceChanges = {};

    Object.entries(transferResources).forEach(([res, amount]) => {
      if (amount > 0) {
        resourceChanges[res] = amount;
      }
    });

    if (moneyToTransfer <= 0 && Object.keys(resourceChanges).length === 0) {
      setIsProcessing(false);
      setFeedback({ type: 'warning', message: 'Enter an amount or select resources to transfer.' });
      return;
    }

    try {
      const result = await transferAllianceFunds({
        allianceId: alliance.id,
        initiatorNationId: myNation.id, // Add initiator nation ID for logging
        recipientNationId: transferTargetNation,
        amount: moneyToTransfer,
        resources: resourceChanges,
        note: transferNote || `Transfer from alliance bank to member`
      });

      if (result.data?.success) {
        setTransferTargetNation('');
        setTransferMoney('');
        setTransferResources({});
        setTransferNote('');
        setFeedback({ type: 'success', message: 'Transfer successful!' });
        onUpdate();
      } else {
        console.error("Transfer failed:", result.data?.error);
        setFeedback({ type: 'error', message: `Transfer failed: ${result.data?.error || 'Unknown error'}` });
      }
    } catch (error) {
      console.error("Error transferring alliance funds:", error);
      setFeedback({ type: 'error', message: 'Error transferring funds: ' + error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="bg-slate-800/80 border-slate-700"> {/* Updated styling as per outline */}
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2"> {/* Updated styling as per outline */}
          <Banknote className="w-5 h-5 text-green-400" /> {/* Updated icon styling */}
          Alliance Treasury {/* Updated title text */}
          {myNation?.is_blockaded && ( // Using myNation.is_blockaded
            <Badge variant="destructive" className="ml-2">
              <ShieldBan className="w-3 h-3 mr-1" />
              Deposits Blocked
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-slate-400">
          Manage your alliance's shared treasury and resources.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center bg-slate-800 p-4 rounded-lg">
          <p className="text-sm text-slate-400">Alliance Treasury</p>
          <p className="text-3xl font-bold text-green-400">${(alliance.treasury || 0).toLocaleString()}</p>
        </div>

        {/* NEW: 4 TABS INCLUDING TRANSFER AND HISTORY */}
        <Tabs defaultValue="deposit">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="deposit">
              <ArrowDownToLine className="w-4 h-4 mr-1" />
              Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" disabled={!canWithdraw}>
              <ArrowUpToLine className="w-4 h-4 mr-1" />
              Withdraw
            </TabsTrigger>
            <TabsTrigger value="transfer" disabled={!canWithdraw}>
              <UserPlus className="w-4 h-4 mr-1" />
              Transfer
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="pt-4">
            <div className="border-t border-slate-700 pt-6"> {/* Added from outline */}
              <h3 className="text-lg font-medium text-white mb-4">Make Deposit</h3> {/* Added from outline */}
              {myNation?.is_blockaded && ( // Using myNation.is_blockaded
                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  <ShieldBan className="w-4 h-4 inline mr-2" />
                  Deposits are blocked while your nation is under naval blockade.
                </div>
              )}

              {/* Feedback Display */}
              {feedback && (
                <div className={`mb-4 p-3 rounded-lg text-sm
                        ${feedback.type === 'error' ? 'bg-red-900/20 border border-red-500/30 text-red-300' :
                           feedback.type === 'success' ? 'bg-green-900/20 border border-green-500/30 text-green-300' :
                           'bg-yellow-900/20 border border-yellow-500/30 text-yellow-300'}`}>
                  {feedback.message}
                </div>
              )}

              <form onSubmit={handleDeposit} className="space-y-4"> {/* Wrapped in form */}
                <div>
                  <Label className="text-slate-300">Deposit Money</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={`Your treasury: $${myNation.treasury.toLocaleString()}`}
                      value={moneyDeposit}
                      onChange={(e) => setMoneyDeposit(e.target.value)}
                      className="bg-slate-600 border-slate-500"
                      disabled={isProcessing || myNation?.is_blockaded} // Disable when blockaded
                    />
                    {/* The deposit button is now part of the form submit */}
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Deposit Resources</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 bg-slate-800/50 p-3 rounded-md">
                    {resourceTypes.map(res => {
                      const Icon = resourceIcons[res] || Package;
                      const available = myNationResources?.[res] || 0;
                      return (
                        <div key={res} className="grid grid-cols-3 items-center gap-2">
                          <div className="flex items-center gap-2 col-span-1">
                            <Icon className="w-4 h-4 text-slate-400" />
                            <Label className="capitalize text-slate-300">{res}</Label>
                          </div>
                          <span className="text-xs text-slate-400 text-right">({available.toLocaleString()} avail.)</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={resourceDeposits[res] || ''}
                            onChange={(e) => handleResourceDeposit(res, e.target.value)}
                            className="bg-slate-600 border-slate-500 h-8"
                            disabled={isProcessing || myNation?.is_blockaded} // Disable when blockaded
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isProcessing || myNation?.is_blockaded || ((parseInt(moneyDeposit) || 0) <= 0 && Object.values(resourceDeposits).every(v => (v || 0) <= 0))}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} {/* Changed icon to Upload */}
                  {myNation?.is_blockaded ? 'Blocked by Naval Blockade' : (isProcessing ? 'Processing...' : 'Deposit Funds')} {/* Updated text */}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="withdraw" className="pt-4">
            {canWithdraw ? (
              <div className="space-y-4">
                {feedback && (
                  <div className={`mb-4 p-3 rounded-lg text-sm
                        ${feedback.type === 'error' ? 'bg-red-900/20 border border-red-500/30 text-red-300' :
                             feedback.type === 'success' ? 'bg-green-900/20 border border-green-500/30 text-green-300' :
                             'bg-yellow-900/20 border border-yellow-500/30 text-yellow-300'}`}>
                    {feedback.message}
                  </div>
                )}
                <div>
                  <Label className="text-slate-300">Withdraw Money</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={`Alliance treasury: $${(alliance.treasury || 0).toLocaleString()}`}
                      value={moneyWithdraw}
                      onChange={(e) => setMoneyWithdraw(e.target.value)}
                      className="bg-slate-600 border-slate-500"
                      disabled={isProcessing}
                    />
                    <Button
                      onClick={handleWithdraw}
                      disabled={isProcessing || ((parseInt(moneyWithdraw) || 0) <= 0 && Object.values(resourceWithdrawals).every(v => (v || 0) <= 0))}
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Withdraw Resources</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 bg-slate-800/50 p-3 rounded-md">
                    {resourceTypes.map(res => {
                      const Icon = resourceIcons[res] || Package;
                      const available = alliance.resources?.[res] || 0;
                      return (
                        <div key={res} className="grid grid-cols-3 items-center gap-2">
                          <div className="flex items-center gap-2 col-span-1">
                            <Icon className="w-4 h-4 text-slate-400" />
                            <Label className="capitalize text-slate-300">{res}</Label>
                          </div>
                          <span className="text-xs text-slate-400 text-right">({available.toLocaleString()} avail.)</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={resourceWithdrawals[res] || ''}
                            onChange={(e) => handleResourceWithdrawal(res, e.target.value)}
                            className="bg-slate-600 border-slate-500 h-8"
                            disabled={isProcessing}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-400">You do not have permission to withdraw funds.</p>
            )}
          </TabsContent>

          {/* NEW: TRANSFER TAB */}
          <TabsContent value="transfer" className="pt-4">
            {canWithdraw ? (
              <div className="space-y-4">
                {feedback && (
                  <div className={`mb-4 p-3 rounded-lg text-sm
                        ${feedback.type === 'error' ? 'bg-red-900/20 border border-red-500/30 text-red-300' :
                             feedback.type === 'success' ? 'bg-green-900/20 border border-green-500/30 text-green-300' :
                             'bg-yellow-900/20 border border-yellow-500/30 text-yellow-300'}`}>
                    {feedback.message}
                  </div>
                )}
                <div>
                  <Label className="text-slate-300">Send Funds to Member</Label>
                  <Select value={transferTargetNation} onValueChange={setTransferTargetNation} disabled={isProcessing}>
                    <SelectTrigger className="bg-slate-600 border-slate-500">
                      <SelectValue placeholder="Select alliance member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allianceMembers
                        .filter(member => member.id !== myNation.id) // Don't show current user
                        .map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} ({member.leader_name})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-300">Transfer Amount</Label>
                  <Input
                    type="number"
                    placeholder={`Max: $${(alliance.treasury || 0).toLocaleString()}`}
                    value={transferMoney}
                    onChange={(e) => setTransferMoney(e.target.value)}
                    className="bg-slate-600 border-slate-500"
                    disabled={isProcessing}
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Transfer Resources</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 bg-slate-800/50 p-3 rounded-md">
                    {resourceTypes.slice(0, 6).map(res => {
                      const Icon = resourceIcons[res] || Package;
                      const available = alliance.resources?.[res] || 0;
                      return (
                        <div key={res} className="grid grid-cols-3 items-center gap-2">
                          <div className="flex items-center gap-2 col-span-1">
                            <Icon className="w-4 h-4 text-slate-400" />
                            <Label className="capitalize text-slate-300">{res}</Label>
                          </div>
                          <span className="text-xs text-slate-400 text-right">({available.toLocaleString()} avail.)</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={transferResources[res] || ''}
                            onChange={(e) => handleTransferResourceChange(res, e.target.value)}
                            className="bg-slate-600 border-slate-500 h-8"
                            disabled={isProcessing}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Transfer Note (Optional)</Label>
                  <Textarea
                    placeholder="Add a note about this transfer..."
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="bg-slate-600 border-slate-500 h-20"
                    maxLength={200}
                    disabled={isProcessing}
                  />
                </div>

                <Button
                  onClick={handleTransfer}
                  disabled={isProcessing || !transferTargetNation || ((parseInt(transferMoney) || 0) <= 0 && Object.values(transferResources).every(v => (v || 0) <= 0))}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending Transfer...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Transfer
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-center text-slate-400">You do not have permission to transfer funds.</p>
            )}
          </TabsContent>

          {/* NEW: HISTORY TAB */}
          <TabsContent value="history" className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Transaction History</h3>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2">
                {allianceTransactions?.length > 0 ? (
                  allianceTransactions.map((transaction, index) => {
                    const initiatorNation = allNationsData?.find(n => n.id === transaction.initiator_nation_id);
                    const recipientNation = allNationsData?.find(n => n.id === transaction.recipient_nation_id);

                    return (
                      <div key={transaction.id || index} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {transaction.transaction_type === 'deposit' && <ArrowDownToLine className="w-4 h-4 text-green-400" />}
                            {transaction.transaction_type === 'withdrawal' && <ArrowUpToLine className="w-4 h-4 text-red-400" />}
                            {transaction.transaction_type === 'transfer_out' && <Send className="w-4 h-4 text-blue-400" />}
                            {transaction.transaction_type === 'transfer_in' && <TrendingUp className="w-4 h-4 text-purple-400" />}

                            <Badge className={
                              transaction.transaction_type === 'deposit' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              transaction.transaction_type === 'withdrawal' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              transaction.transaction_type === 'transfer_out' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                              'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            }>
                              {transaction.transaction_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <span className="text-xs text-slate-400">
                            {transaction.created_date ? format(new Date(transaction.created_date), 'PPp') : 'Unknown date'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm text-slate-300">
                            <span className="font-medium">Initiated by:</span> {initiatorNation?.name || 'Unknown Nation'}
                          </p>
                          {recipientNation && (
                            <p className="text-sm text-slate-300">
                              <span className="font-medium">Recipient:</span> {recipientNation.name}
                            </p>
                          )}
                          {transaction.amount > 0 && (
                            <p className="text-sm text-slate-300">
                              <span className="font-medium">Amount:</span> <span className="text-green-400">${transaction.amount.toLocaleString()}</span>
                            </p>
                          )}
                          {transaction.resources && Object.keys(transaction.resources).length > 0 && (
                            <p className="text-sm text-slate-300">
                              <span className="font-medium">Resources:</span> {Object.entries(transaction.resources)
                                .filter(([_, amount]) => amount > 0)
                                .map(([resource, amount]) => `${amount} ${resource}`)
                                .join(', ')}
                            </p>
                          )}
                          {transaction.description && (
                            <p className="text-xs text-slate-400 italic">{transaction.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <History className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p>No transactions recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

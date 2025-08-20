
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  ArrowRight, 
  DollarSign, 
  Package,
  Handshake,
  AlertCircle,
  History,
  Shield,
  Users,
  Loader2,
  ShieldBan, // Added for blockade
  ArrowRightLeft // Added for transfer icon
} from "lucide-react";
import { format } from "date-fns";
import { Alliance, Nation, Resource, User, AllianceTransaction } from "@/entities/all";
import { transferAllianceFunds } from '@/functions/transferAllianceFunds'; // New import

const resourceTypes = [
  'oil', 'iron', 'steel', 'aluminum', 'coal', 'uranium',
  'food', 'gold', 'bauxite', 'copper', 'diamonds', 'wood'
];

const resourceIcons = {
  oil: Package, iron: Package, steel: Package, aluminum: Package, coal: Package, uranium: Package,
  food: Package, gold: Package, bauxite: Package, copper: Package, diamonds: Package, wood: Package
};

export default function AllianceTransfersPage() {
  const [myAlliance, setMyAlliance] = useState(null);
  const [nation, setNation] = useState(null); // Renamed from 'myNation' in outline to match existing 'nation'
  const [targetAlliances, setTargetAlliances] = useState([]);
  const [allNations, setAllNations] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed from isTransferring
  const [feedback, setFeedback] = useState(null); // New state for feedback messages
  
  // Transfer form state
  const [selectedRecipient, setSelectedRecipient] = useState(''); // Renamed from selectedTargetAlliance
  const [transferAmount, setTransferAmount] = useState('');
  const [transferResources, setTransferResources] = useState({}); // Renamed from resourceTransfers
  const [transferDescription, setTransferDescription] = useState(''); // Renamed from transferNote

  useEffect(() => {
    loadData(); // Renamed function call
  }, []);

  const loadData = async () => { // Renamed function
    setIsLoading(true);
    try {
      const user = await User.me();
      const nations = await Nation.filter({ created_by: user.email });
      
      if (nations.length > 0) {
        const userNation = nations[0];
        setNation(userNation);

        // Load all alliances and nations
        const [alliancesData, nationsData] = await Promise.all([
          Alliance.list(),
          Nation.list()
        ]);

        // Find user's alliance
        const userAlliance = alliancesData.find(alliance => 
          alliance.founder_nation_id === userNation.id || 
          alliance.member_nations.includes(userNation.id)
        );
        setMyAlliance(userAlliance);

        // Filter target alliances (exclude own alliance)
        const targets = alliancesData.filter(a => 
          a.active && userAlliance && a.id !== userAlliance.id
        );
        setTargetAlliances(targets);

        // Create nations map
        const nationMap = {};
        nationsData.forEach(n => { nationMap[n.id] = n; });
        setAllNations(nationMap);

        // Load transactions for this alliance
        if (userAlliance) {
          const txs = await AllianceTransaction.filter({ alliance_id: userAlliance.id }, '-created_date', 20);
          setTransactions(txs.filter(tx => tx.transaction_type.includes('transfer')));
        }
      }
    } catch (error) {
      console.error("Error loading transfer data:", error);
      setFeedback({ type: 'error', message: 'Failed to load data. Please try again.' });
    }
    setIsLoading(false);
  };

  const canTransferFunds = myAlliance && nation && (
    myAlliance.founder_nation_id === nation.id ||
    (myAlliance.member_roles &&
     myAlliance.custom_roles &&
     myAlliance.member_roles[nation.id] &&
     myAlliance.custom_roles[myAlliance.member_roles[nation.id]]?.permissions?.withdraw_funds)
  );

  const handleResourceTransferChange = (resource, value) => {
    const amount = parseInt(value) || 0;
    const maxAmount = myAlliance?.resources?.[resource] || 0;
    setTransferResources(prev => ({ // Updated state variable name
      ...prev,
      [resource]: Math.max(0, Math.min(amount, maxAmount))
    }));
  };

  const handleSendTransfer = async (e) => { // Renamed function
    e.preventDefault();
        
    if (nation?.is_blockaded) { // Used 'nation' instead of 'myNation' for consistency
        setFeedback({ 
            type: 'error', 
            message: 'Cannot send transfers while under naval blockade.' 
        });
        return;
    }

    const moneyToTransfer = parseInt(transferAmount) || 0;
    const resourceChanges = {};
    
    Object.entries(transferResources).forEach(([res, amount]) => { // Updated state variable name
      if (amount > 0) {
        resourceChanges[res] = amount;
      }
    });

    if (moneyToTransfer <= 0 && Object.keys(resourceChanges).length === 0) {
      setFeedback({ type: 'error', message: "Please specify an amount or resource to transfer." });
      return;
    }

    // Frontend validation (backend will re-validate)
    if ((myAlliance.treasury || 0) < moneyToTransfer) {
      setFeedback({ type: 'error', message: "Not enough money in alliance treasury." });
      return;
    }
    for (const res in resourceChanges) {
      if ((myAlliance.resources?.[res] || 0) < resourceChanges[res]) {
        setFeedback({ type: 'error', message: `Not enough ${res} in alliance stockpile.` });
        return;
      }
    }


    setIsSubmitting(true);
    setFeedback(null);

    try {
      // Assuming transferAllianceFunds takes recipientAllianceId, not recipientNationId for this page's context
      const result = await transferAllianceFunds({
          initiatorNationId: nation.id, // Pass initiator nation ID for logging
          initiatorAllianceId: myAlliance.id, // Pass initiator alliance ID for logging
          recipientAllianceId: selectedRecipient, // Updated to recipientAllianceId
          amount: moneyToTransfer,
          resources: resourceChanges,
          description: transferDescription
      });

      if (result.success) { // Assuming 'success' is a boolean directly from the function's return
          setFeedback({ type: 'success', message: result.message || "Transfer completed successfully!" });
          // Reset form
          setSelectedRecipient('');
          setTransferAmount('');
          setTransferResources({});
          setTransferDescription('');
          loadData(); // Refresh data
      } else {
          setFeedback({ type: 'error', message: result.message || "Transfer failed." });
      }
    } catch (error) {
        console.error("Error processing alliance transfer:", error);
        setFeedback({ type: 'error', message: `Transfer failed: ${error.message || "An unknown error occurred."}` });
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!nation) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <Users className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">No Nation Found</h1>
          <p className="text-slate-400">Please create a nation first to access alliance transfer features.</p>
        </div>
      </div>
    );
  }

  if (!myAlliance) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <Handshake className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">No Alliance Found</h1>
          <p className="text-slate-400">You must be a member of an alliance to access transfer features.</p>
        </div>
      </div>
    );
  }

  if (!canTransferFunds) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-slate-400 mb-4">
            You don't have permission to transfer alliance funds.
          </p>
          <p className="text-slate-500 text-sm">
            Contact your alliance leadership to request transfer permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Inter-Alliance Transfers</h1>
          <p className="text-xl text-slate-400">
            Send funds and resources from {myAlliance.name} to other alliances.
          </p>
        </div>

        {nation?.is_blockaded && ( // Used 'nation' instead of 'myNation'
            <div className="mb-6 p-4 bg-red-900/30 border-2 border-red-500 rounded-lg">
                <div className="flex items-center gap-3">
                    <ShieldBan className="w-6 h-6 text-red-400 animate-pulse" />
                    <div>
                        <h3 className="text-lg font-bold text-red-300">Naval Blockade Active</h3>
                        <p className="text-red-200">
                            Your nation is under naval blockade and cannot send alliance transfers.
                        </p>
                    </div>
                </div>
            </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Transfer Form */}
          <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-400" /> {/* Updated icon */}
                Send Transfer
                {nation?.is_blockaded && ( // Used 'nation' instead of 'myNation'
                    <Badge variant="destructive" className="ml-2">
                        <ShieldBan className="w-3 h-3 mr-1" />
                        Blocked
                    </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Transfer funds and resources to another alliance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {feedback && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${feedback.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                      {feedback.message}
                  </div>
              )}
              <form onSubmit={handleSendTransfer} className="space-y-4"> {/* Added form tag and onSubmit */}
                {/* Alliance Treasury Overview */}
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <h4 className="text-slate-300 font-medium mb-2">Available Funds</h4>
                  <div className="text-2xl font-bold text-green-400 mb-2">
                    ${(myAlliance.treasury || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400">
                    Resources available in alliance stockpile
                  </div>
                </div>

                {/* Target Alliance Selection */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Target Alliance</Label>
                  <Select value={selectedRecipient} onValueChange={setSelectedRecipient}> {/* Updated state variable name */}
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue placeholder="Select alliance to send funds to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {targetAlliances.map(alliance => (
                        <SelectItem key={alliance.id} value={alliance.id}>
                          {alliance.name} ({(alliance.member_nations?.length || 0) + 1} members)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Money Transfer */}
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Money Transfer (Available: ${(myAlliance.treasury || 0).toLocaleString()})
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={transferAmount}
                    onChange={e => setTransferAmount(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                {/* Resource Transfers */}
                <div className="space-y-4">
                  <Label className="text-slate-300">Resource Transfers</Label>
                  <div className="max-h-60 overflow-y-auto pr-2 space-y-3 bg-slate-700/30 p-4 rounded-lg">
                    {resourceTypes.map(res => {
                      const Icon = resourceIcons[res] || Package;
                      const available = myAlliance.resources?.[res] || 0;
                      return (
                        <div key={res} className="grid grid-cols-3 items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-slate-400" />
                            <Label className="text-slate-300 capitalize text-sm">{res}</Label>
                          </div>
                          <span className="text-xs text-slate-400 text-right">
                            ({available.toLocaleString()} avail.)
                          </span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={transferResources[res] || ''} // Updated state variable name
                            onChange={e => handleResourceTransferChange(res, e.target.value)}
                            className="bg-slate-600 border-slate-500 h-8 text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Transfer Note */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Transfer Note (Optional)</Label>
                  <Textarea
                    value={transferDescription} // Updated state variable name
                    onChange={e => setTransferDescription(e.target.value)} // Updated state variable name
                    placeholder="Add a note about this transfer..."
                    className="bg-slate-700 border-slate-600 text-white h-20"
                    maxLength={200}
                  />
                  <div className="text-xs text-slate-400 text-right">
                    {transferDescription.length}/200 characters {/* Updated state variable name */}
                  </div>
                </div>

                {/* Transfer Button */}
                <Button
                  type="submit" // Changed to type="submit" for form
                  disabled={
                    isSubmitting || 
                    !selectedRecipient || 
                    ((parseInt(transferAmount) || 0) <= 0 && Object.values(transferResources).every(v => (v || 0) <= 0)) || // Updated state variable name
                    nation?.is_blockaded // Disabled by blockade
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600" // Added disabled style
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing Transfer...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {nation?.is_blockaded ? 'Blocked by Naval Blockade' : 'Send Transfer'} {/* Updated button text */}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Transfer History */}
          <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                Transfer History
              </CardTitle>
              <CardDescription>
                Recent inter-alliance transfers involving {myAlliance.name}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <History className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p>No inter-alliance transfers recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map(tx => {
                    const initiatorNation = allNations[tx.initiator_nation_id];
                    const isOutgoing = tx.transaction_type === 'transfer_out';
                    const targetAllianceName = targetAlliances.find(a => 
                      a.id === tx.target_alliance_id
                    )?.name || 'Unknown Alliance';

                    return (
                      <div key={tx.id} className="bg-slate-700/50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-white font-medium flex items-center gap-2">
                              {isOutgoing ? (
                                <ArrowRight className="w-4 h-4 text-red-400" />
                              ) : (
                                <ArrowRight className="w-4 h-4 text-green-400 rotate-180" />
                              )}
                              {isOutgoing ? 'Sent to' : 'Received from'} {targetAllianceName}
                            </div>
                            <div className="text-slate-400 text-sm">
                              by {initiatorNation?.name || 'Unknown Nation'}
                            </div>
                          </div>
                          <Badge 
                            className={isOutgoing ? 
                              'bg-red-500/20 text-red-400 border-red-500/30' : 
                              'bg-green-500/20 text-green-400 border-green-500/30'
                            }
                          >
                            {isOutgoing ? 'Outgoing' : 'Incoming'}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="text-slate-300 text-sm">
                            {tx.amount > 0 && (
                              <span className={isOutgoing ? 'text-red-400' : 'text-green-400'}>
                                {isOutgoing ? '-' : '+'}${tx.amount.toLocaleString()}
                              </span>
                            )}
                            {tx.amount > 0 && Object.keys(tx.resources || {}).some(k => tx.resources[k] > 0) && (
                              <span className="text-slate-400"> + resources</span>
                            )}
                            {tx.amount === 0 && Object.keys(tx.resources || {}).some(k => tx.resources[k] > 0) && (
                              <span className="text-slate-400">Resources only</span>
                            )}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {format(new Date(tx.created_date), 'MMM d, HH:mm')}
                          </div>
                        </div>
                        
                        {tx.description && (
                          <div className="text-slate-400 text-sm mt-2 italic">
                            "{tx.description.split(':').slice(1).join(':').trim() || tx.description}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

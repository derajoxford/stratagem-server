
import React, { useState, useEffect, useCallback } from "react";
import { User, Nation, Military, Resource, City, GameConfig, War, MarketListing, BuyOrder, Message, AllianceApplication, AllianceInvitation, CeasefireProposal, BattleLog, Alliance, Treaty, AllianceTransaction, MergeProposal } from "@/api/entities";
import { Loader2, ShieldX, AlertTriangle } from "lucide-react";

import CreateNationModal from "../components/dashboard/CreateNationModal";
import NationOverview from "../components/dashboard/NationOverview";
import QuickActions from "../components/dashboard/QuickActions";
import ResourceStatus from "../components/dashboard/ResourceStatus";
import MilitaryStatus from "../components/dashboard/MilitaryStatus";
import MarketplacePreview from "../components/dashboard/MarketplacePreview";
import NationProfileEditor from "../components/dashboard/NationProfileEditor";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [nation, setNation] = useState(null); // Renamed from myNation
  const [military, setMilitary] = useState(null); // Renamed from myMilitary
  const [resources, setResources] = useState(null); // Renamed from myResources
  const [gameConfig, setGameConfig] = useState(null);
  const [cities, setCities] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Renamed from loading
  const [isBanned, setIsBanned] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // New state
  const [error, setError] = useState(null); // New state
  const [showCreateNationModal, setShowCreateNationModal] = useState(false); // New state

  const loadData = useCallback(async () => { // Renamed from loadDashboardData, wrapped in useCallback
    setIsLoading(true);
    setError(null); // Clear any previous errors

    try {
      // Add delay to prevent concurrent API calls
      await new Promise(resolve => setTimeout(resolve, 100));

      let currentUser;
      try {
        currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.warn("Dashboard: User not logged in:", error);
        setIsLoading(false);
        return;
      }

      if (currentUser.is_banned) {
        setIsBanned(true);
        setNation(null); // Ensure no stale data
        setIsLoading(false);
        return;
      }

      try {
        const nations = await Nation.filter({ created_by: currentUser.email, active: true });
        if (nations && nations.length > 0) {
          const foundNation = nations[0];
          setNation(foundNation);

          // Batch the remaining calls with staggered timing
          const [militaryData, resourceData, cityData] = await Promise.all([
            Military.filter({ nation_id: foundNation.id }),
            Resource.filter({ nation_id: foundNation.id }),
            City.filter({ nation_id: foundNation.id })
          ]);

          // Load game config separately to avoid overwhelming the API
          setTimeout(async () => {
            try {
              const gameConfigData = await GameConfig.list();
              setGameConfig(gameConfigData[0]);
            } catch (configError) {
              console.warn("Dashboard: Could not load game config:", configError);
              setGameConfig(null);
            }
          }, 200);

          setMilitary(militaryData[0]);
          setResources(resourceData[0]);
          setCities(cityData);
          setShowCreateNationModal(false); // Hide creation modal if nation found
        } else {
          setNation(null);
          setMilitary(null);
          setResources(null);
          setCities([]);
          setShowCreateNationModal(true); // Show creation modal if no nation found
        }
      } catch (error) {
        console.error("Dashboard: Failed to load dashboard data:", error);
        setError("There was a problem loading your nation's data. Please try refreshing in a moment.");
      }
    } catch (error) {
      console.error("Dashboard: Critical error:", error);
      setError("Connection issue. Please wait a moment and refresh the page.");
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array means this function is created once

  useEffect(() => {
    // Add small delay before initial load to avoid conflicting with layout and prevent API bombardment
    const randomDelay = Math.random() * 500 + 200; // Random delay between 200-700ms
    const timer = setTimeout(() => {
      loadData();
    }, randomDelay);

    return () => clearTimeout(timer);
  }, [loadData]); // Dependency on loadData to prevent infinite loops and ensure latest loadData is used

  const handleDeleteNation = async () => {
    if (!nation) {
      alert("Cannot delete nation: essential data is missing.");
      return;
    }

    // UPDATED: Check for active alliance membership, not just alliance_id presence
    if (nation.alliance_id) {
        // Double-check if the alliance actually exists and is active
        try {
            const alliance = await Alliance.get(nation.alliance_id);
            if (alliance && alliance.active) {
                alert("You cannot delete your nation while it is part of an active alliance. Please leave the alliance first.");
                return;
            }
            // If alliance doesn't exist or is inactive, we can proceed but should clear the alliance_id
        } catch (error) {
            // Alliance doesn't exist, we can proceed but should clear the alliance_id
            console.log("Alliance referenced by nation no longer exists or is inactive, proceeding with deletion:", error);
        }
    }

    const activeWars = await War.filter({ $or: [{ attacker_nation_id: nation.id }, { defender_nation_id: nation.id }], status: 'active' });
    if (activeWars.length > 0) {
        alert("You cannot delete your nation while it is in an active war. This action is disabled for nations in active conflicts.");
        return;
    }

    if (window.confirm("Are you sure you want to PERMANENTLY delete your nation? This action is irreversible and will erase all your progress, including cities, military, resources, market listings, and messages. You will then be able to create a new nation.")) {
      setIsDeleting(true);
      setError(null);
      try {
        // --- ENHANCED Deletion Cascade - includes ALL related entities ---
        
        // 1. Delete Market Presence
        const listings = await MarketListing.filter({ seller_nation_id: nation.id });
        for (const listing of listings) { 
          await MarketListing.delete(listing.id); 
        }
        const buyOrders = await BuyOrder.filter({ buyer_nation_id: nation.id });
        for (const order of buyOrders) { 
          await BuyOrder.delete(order.id); 
        }
        
        // 2. Delete Communications
        const messages = await Message.filter({ $or: [{ sender_nation_id: nation.id }, { recipient_nation_id: nation.id }] });
        for (const message of messages) { 
          await Message.delete(message.id); 
        }
        
        // 3. Delete Diplomatic Records
        const apps = await AllianceApplication.filter({ applicant_nation_id: nation.id });
        for (const app of apps) { 
          await AllianceApplication.delete(app.id); 
        }
        const invites = await AllianceInvitation.filter({ $or: [{ invited_nation_id: nation.id }, { inviter_nation_id: nation.id }] });
        for (const invite of invites) { 
          await AllianceInvitation.delete(invite.id); 
        }

        // 4. Delete Treaty records (if nation was involved in proposing treaties)
        try {
          const treaties = await Treaty.filter({ $or: [
            { proposed_by_alliance_id: nation.alliance_id },
            { cancelled_by_alliance_id: nation.alliance_id }
          ]});
          for (const treaty of treaties) {
            await Treaty.delete(treaty.id);
          }
        } catch (e) {
          // Treaty entity might not exist, skip
          console.log("No treaties to clean up or Treaty entity not found:", e);
        }

        // 5. Delete Alliance Transactions
        try {
          const transactions = await AllianceTransaction.filter({ $or: [
            { initiator_nation_id: nation.id },
            { recipient_nation_id: nation.id }
          ]});
          for (const transaction of transactions) {
            await AllianceTransaction.delete(transaction.id);
          }
        } catch (e) {
          // AllianceTransaction entity might not exist, skip
          console.log("No alliance transactions to clean up or AllianceTransaction entity not found:", e);
        }

        // 6. Delete Merge Proposals
        try {
          const mergeProposals = await MergeProposal.filter({ $or: [
            { proposed_by_nation_id: nation.id },
            { responded_by_nation_id: nation.id }
          ]});
          for (const proposal of mergeProposals) {
            await MergeProposal.delete(proposal.id);
          }
        } catch (e) {
          // MergeProposal entity might not exist, skip
          console.log("No merge proposals to clean up or MergeProposal entity not found:", e);
        }
        
        // 7. Delete Wars and related entities
        const allWars = await War.filter({ $or: [{ attacker_nation_id: nation.id }, { defender_nation_id: nation.id }] });
        for (const war of allWars) {
            // Delete ceasefire proposals for this war
            const proposals = await CeasefireProposal.filter({ war_id: war.id });
            for (const proposal of proposals) { 
              await CeasefireProposal.delete(proposal.id); 
            }
            // Delete battle logs for this war
            const logs = await BattleLog.filter({ war_id: war.id });
            for (const log of logs) { 
              await BattleLog.delete(log.id); 
            }
            // Delete the war itself
            await War.delete(war.id);
        }

        // 8. Remove nation from any alliance membership (if still listed)
        if (nation.alliance_id) {
          try {
            const alliance = await Alliance.get(nation.alliance_id);
            if (alliance) {
              const updatedMembers = alliance.member_nations.filter(id => id !== nation.id);
              await Alliance.update(alliance.id, { 
                member_nations: updatedMembers,
                total_cities: Math.max(0, alliance.total_cities - (nation.cities || 0)), // Ensure default 0 if null
                total_military_strength: Math.max(0, alliance.military_strength - (nation.military_strength || 0)) // Ensure default 0 if null
              });
            }
          } catch (e) {
            console.log("Alliance cleanup handled or alliance no longer exists:", e);
          }
        }

        // 9. Delete Core Nation Assets (Cities, Resources, Military)
        const nationCities = await City.filter({ nation_id: nation.id });
        for (const city of nationCities) {
          await City.delete(city.id);
        }
        const nationResources = await Resource.filter({ nation_id: nation.id });
        if (nationResources[0]) {
            await Resource.delete(nationResources[0].id);
        }
        const nationMilitary = await Military.filter({ nation_id: nation.id });
        if (nationMilitary[0]) {
            await Military.delete(nationMilitary[0].id);
        }

        // 10. Finally, delete the nation itself
        await Nation.delete(nation.id);

        setNation(null);
        setMilitary(null);
        setResources(null);
        setCities([]);
        setShowCreateNationModal(true);
        alert("Your nation has been successfully deleted. All associated data has been cleared.");

      } catch (e) {
        console.error("Failed to delete nation:", e);
        setError("An error occurred while deleting your nation. Please refresh and try again, or contact support if the issue persists.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-16 h-16 animate-spin text-amber-400" />
      </div>
    );
  }

  if (isBanned) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md text-center bg-slate-800 p-8 rounded-lg shadow-lg border border-red-500/50">
          <ShieldX className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-slate-300 mb-2">Your account has been banned from participating in the game due to rule violations.</p>
          <p className="text-slate-400 text-sm">If you believe this is a mistake, please contact a game administrator.</p>
        </div>
      </div>
    );
  }

  // If no nation exists or a nation was deleted, show the create nation modal
  if (!nation || showCreateNationModal) {
    return <CreateNationModal onNationCreated={loadData} />;
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Welcome, Commander {nation.leader_name}
          </h1>
          <p className="text-lg text-slate-400">
            Your nation, {nation.name}, awaits your command.
          </p>
        </div>
        {/* The TurnTimer component has been moved to the main layout sidebar's Intelligence section */}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <NationOverview nation={nation} onDeleteNation={handleDeleteNation} isDeleting={isDeleting} />
          <QuickActions nation={nation} cities={cities} onUpdate={loadData} gameConfig={gameConfig} />
          <MilitaryStatus military={military} />
        </div>
        <div className="space-y-8">
          <ResourceStatus resources={resources} />
          <MarketplacePreview />
        </div>
      </div>
      
      <NationProfileEditor nation={nation} onUpdate={loadData} />
    </div>
  );
}


import React, { useState, useEffect } from "react";
import { 
  Alliance, 
  Nation, 
  User 
} from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Crown, 
  Shield, 
  Globe,
  Star,
  UserCog,
  Handshake,
  Mail,
  Search, // New import for tab icon
  Plus // New import for tab icon
} from "lucide-react";

import AllianceDirectory from "../components/diplomacy/AllianceDirectory";
import CreateAlliance from "../components/diplomacy/CreateAlliance";
import MyAlliance from "../components/diplomacy/MyAlliance";
import AllianceInvitations from "../components/diplomacy/AllianceInvitations";
import RoleManagement from "../components/diplomacy/RoleManagement";
import TreatyManagement from "../components/diplomacy/TreatyManagement";
import AllianceMembers from "../components/diplomacy/AllianceMembers";
import MergeProposals from '../components/diplomacy/MergeProposals'; // New component import

export default function DiplomacyPage() {
  const [nation, setNation] = useState(null);
  const [alliances, setAlliances] = useState([]);
  const [myAlliance, setMyAlliance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Stagger initial load to prevent API rate limiting
    const randomDelay = Math.random() * 350 + 125; // Random delay between 125-475ms
    const timer = setTimeout(() => {
      loadDiplomacyData();
    }, randomDelay);

    return () => clearTimeout(timer);
  }, []);

  const loadDiplomacyData = async () => {
    try {
      // Always re-fetch user and nation data to get the latest state
      const user = await User.me();
      const nations = await Nation.filter({ created_by: user.email });
      
      if (nations.length > 0) {
        const initialNation = nations[0];
        
        // Cache-busting: Re-fetch the nation by ID to ensure we have the absolute latest data
        const freshNation = await Nation.get(initialNation.id);
        setNation(freshNation);

        // Fetch only active alliances for the directory list
        const activeAlliancesData = await Alliance.filter({ active: true }, "-created_date");
        setAlliances(activeAlliancesData);
        
        // Determine 'myAlliance' based on the fresh nation's alliance_id
        let myCurrentAlliance = null;
        if (freshNation.alliance_id) {
          try {
            const fetchedAlliance = await Alliance.get(freshNation.alliance_id);
            // Only set if the fetched alliance exists and is active
            if (fetchedAlliance && fetchedAlliance.active) {
              myCurrentAlliance = fetchedAlliance;
            }
          } catch (error) {
            console.log("Alliance referenced by nation.alliance_id not found or inactive, clearing reference");
            // If the alliance doesn't exist or is inactive, the nation's alliance_id should be cleared
            // This handles edge cases where the alliance was deleted/merged but nation wasn't updated
          }
        }
        setMyAlliance(myCurrentAlliance);

      } else {
        // If no nation, clear all related state
        setNation(null);
        setAlliances([]);
        setMyAlliance(null);
      }
    } catch (error) {
      console.error("Error loading diplomacy data:", error);
      // Reset to safe state on error
      setNation(null);
      setAlliances([]);
      setMyAlliance(null);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-64 bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!nation) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <Users className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">No Nation Found</h1>
          <p className="text-slate-400">Please create a nation first to access diplomatic features.</p>
        </div>
      </div>
    );
  }

  const activeAlliances = alliances.filter(a => a.active);

  // Define tabs configuration
  const tabsConfig = [
    {
      id: 'directory',
      label: 'Alliance Directory',
      icon: Search,
      component: AllianceDirectory,
      props: { alliances: activeAlliances, nation, myAlliance, onUpdate: loadDiplomacyData }
    },
    {
      id: 'create',
      label: 'Create Alliance',
      icon: Plus,
      component: CreateAlliance,
      props: { nation, hasAlliance: !!myAlliance, onUpdate: loadDiplomacyData },
      show: !myAlliance // Only show if user has no alliance
    },
    {
      id: 'my-alliance',
      label: 'My Alliance',
      icon: Shield,
      component: MyAlliance,
      props: { alliance: myAlliance, nation, onUpdate: loadDiplomacyData },
      show: !!myAlliance // Only show if user has an alliance
    },
    {
      id: 'members',
      label: 'Members',
      icon: Users,
      component: AllianceMembers,
      props: { alliance: myAlliance, currentUserNation: nation, onUpdate: loadDiplomacyData },
      show: !!myAlliance
    },
    {
      id: 'roles',
      label: 'Roles',
      icon: UserCog,
      component: RoleManagement,
      props: { alliance: myAlliance, nation, onUpdate: loadDiplomacyData },
      show: !!myAlliance
    },
    {
      id: 'invitations',
      label: 'Invitations',
      icon: Mail,
      component: AllianceInvitations,
      props: { nation, onUpdate: loadDiplomacyData },
      show: !!myAlliance // Existing code puts this under myAlliance condition
    },
    {
      id: 'treaties',
      label: 'Treaties',
      icon: Handshake,
      component: TreatyManagement,
      props: { myAlliance, nation, onUpdate: loadDiplomacyData },
      show: !!myAlliance
    },
    {
      id: 'merge-proposals',
      label: 'Merger Proposals',
      icon: Users,
      component: MergeProposals,
      props: { alliance: myAlliance, nation, onUpdate: loadDiplomacyData },
      show: !!myAlliance
    },
  ];

  // Filter tabs based on the 'show' property
  const visibleTabs = tabsConfig.filter(tab => tab.show === undefined || tab.show);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Diplomacy Center
            </h1>
            <p className="text-slate-400 text-lg">
              Forge alliances, manage international relations, and build diplomatic power
            </p>
          </div>
          <div className="flex gap-3">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <Globe className="w-4 h-4 mr-1" />
              {activeAlliances.length} Active Alliances
            </Badge>
            {myAlliance && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                <Crown className="w-4 h-4 mr-1" />
                Alliance Member
              </Badge>
            )}
          </div>
        </div>

        {/* Diplomacy Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-300 text-sm font-medium">Total Alliances</CardTitle>
                <Users className="w-5 h-5 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {activeAlliances.length}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Active diplomatic groups
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-300 text-sm font-medium">My Status</CardTitle>
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {myAlliance ? (
                  myAlliance.founder_nation_id === nation.id ? "Leader" : "Member"
                ) : "Independent"}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Current diplomatic position
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-300 text-sm font-medium">Alliance Power</CardTitle>
                <Shield className="w-5 h-5 text-red-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {myAlliance ? myAlliance.total_military_strength.toLocaleString() : "0"}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Combined military strength
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-300 text-sm font-medium">Largest Alliance</CardTitle>
                <Star className="w-5 h-5 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {activeAlliances.length > 0 ? Math.max(...activeAlliances.map(a => a.member_nations.length + 1)) : "0"}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Most members
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Diplomacy Tabs */}
        <Tabs defaultValue={myAlliance ? "my-alliance" : "directory"} className="w-full">
          <TabsList className={`grid w-full grid-cols-${visibleTabs.length} bg-slate-800/50`}>
            {visibleTabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:bg-slate-700">
                {tab.icon && React.createElement(tab.icon, { className: "w-4 h-4 mr-1" })}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {visibleTabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="mt-6">
              {React.createElement(tab.component, tab.props)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

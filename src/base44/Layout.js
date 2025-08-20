
import React, { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { User, Nation, Message, GameState, GameConfig, Alliance, War } from "@/entities/all"; // Added War entity
import {
  Globe,
  Shield,
  Users,
  Swords,
  Settings,
  Command,
  TrendingUp,
  Building2,
  Store,
  Handshake,
  Network,
  Mail,
  LogOut,
  History, // Added History icon
  Banknote // Banknote is now used for Economic Dashboard
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TurnTimer from "@/components/dashboard/TurnTimer";

const navigationItems = [
  {
    title: "Command Center",
    url: createPageUrl("Dashboard"),
    icon: Command,
    description: "Nation overview"
  },
  {
    title: "Cities",
    url: createPageUrl("Cities"),
    icon: Building2,
    description: "City management"
  },
  {
    title: "Military",
    url: createPageUrl("Military"),
    icon: Shield,
    description: "Armed forces"
  },
  {
    title: "Economic Dashboard", // Changed from "Economy"
    url: createPageUrl("EconomicDashboard"), // Changed URL
    icon: Banknote, // Changed icon from Coins to Banknote
    description: "Finances & Resources" // Changed description
  },
  // The "Banking" navigation item has been removed as "Economic Dashboard" now covers its functionality.
  {
    title: "Marketplace",
    url: createPageUrl("Marketplace"),
    icon: Store,
    description: "Global trade"
  },
  {
    title: "Communications",
    url: createPageUrl("Communications"),
    icon: Mail,
    description: "Messages & alerts"
  },
  {
    title: "Diplomacy",
    url: createPageUrl("Diplomacy"),
    icon: Users,
    description: "Alliances & relations"
  },
  {
    title: "Alliance Transfers",
    url: createPageUrl("AllianceTransfers"),
    icon: Handshake,
    description: "Inter-alliance banking"
  },
  {
    title: "Diplomatic Web",
    url: createPageUrl("DiplomaticWeb"),
    icon: Network,
    description: "Treaty visualization"
  },
  {
    title: "World Nations",
    url: createPageUrl("WorldNations"),
    icon: Globe,
    description: "Survey all nations"
  },
  {
    title: "War Room",
    url: createPageUrl("WarRoom"),
    icon: Swords,
    description: "Active conflicts"
  },
  {
    title: "War History",
    url: createPageUrl("WarHistory"),
    icon: History,
    description: "Review past conflicts"
  },
  {
    title: "Game Admin",
    url: createPageUrl("Admin"),
    icon: Settings,
    description: "Configuration"
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [gameState, setGameState] = useState(null);
  const [gameConfig, setGameConfig] = useState(null);
  const [alliances, setAlliances] = useState([]);
  const [wars, setWars] = useState([]);

  const loadData = async () => {
    try {
      // Load user first - most critical
      let currentUser;
      try {
        currentUser = await User.me();
        setUser(currentUser);
      } catch (userError) {
        console.log("User not logged in:", userError);
        setUser(null);
        setUnreadMessages(0);
        setGameState(null);
        setGameConfig({}); // Set to empty object for safety
        setAlliances([]);
        setWars([]);
        return; // Exit early if no user
      }

      // Load user-specific data
      if (currentUser && currentUser.email) {
        try {
          const nations = await Nation.filter({ created_by: currentUser.email, active: true });
          if (nations && nations.length > 0) {
            const myNation = nations[0];
            const unread = await Message.filter({ recipient_nation_id: myNation.id, is_read: false });
            setUnreadMessages(unread ? unread.length : 0);
          } else {
            setUnreadMessages(0);
          }
        } catch (messageError) {
          console.warn("Could not load messages:", messageError);
          setUnreadMessages(0);
        }
      } else {
        setUnreadMessages(0); // If no user or no email, ensure unread is 0
      }

      // Load global game data with individual error handling
      try {
        const gameStateData = await GameState.list();
        setGameState(gameStateData && gameStateData.length > 0 ? gameStateData[0] : null);
      } catch (gameStateError) {
        console.warn("Could not load game state:", gameStateError);
        setGameState(null);
      }

      try {
        const gameConfigData = await GameConfig.list();
        let parsedConfig = {};
        if (gameConfigData && gameConfigData.length > 0 && gameConfigData[0].config_data_json) {
          try {
            parsedConfig = JSON.parse(gameConfigData[0].config_data_json);
          } catch (parseError) {
            console.warn("Failed to parse game config JSON:", parseError);
          }
        }
        setGameConfig(parsedConfig);
      } catch (configError) {
        console.warn("Could not load game config:", configError);
        setGameConfig({}); // Set to empty object for safety
      }

      try {
        const alliancesData = await Alliance.filter({ active: true });
        setAlliances(alliancesData || []);
      } catch (allianceError) {
        console.warn("Could not load alliances:", allianceError);
        setAlliances([]);
      }

      try {
        const warsData = await War.filter({ status: 'active' }); // FIX: Changed 'Active' to 'active'
        setWars(warsData || []);
      } catch (warError) {
        console.warn("Could not load wars:", warError);
        setWars([]);
      }

    } catch (error) {
      console.error("Critical error loading layout data:", error);
      // Don't throw - set safe defaults
      setUser(null);
      setUnreadMessages(0);
      setGameState(null);
      setGameConfig({});
      setAlliances([]);
      setWars([]);
    }
  };

  useEffect(() => {
    // Stagger layout data loading to prevent API bombardment on navigation
    const randomDelay = Math.random() * 200 + 50; // Random delay between 50-250ms
    const timer = setTimeout(() => {
      loadData();
    }, randomDelay);

    // SIGNIFICANTLY reduce refresh frequency to prevent rate limiting
    const intervalId = setInterval(loadData, 120000); // Changed from 60s to 120s (2 minutes)
    return () => {
      clearTimeout(timer);
      clearInterval(intervalId);
    };
  }, []);

  const handleLogout = async () => {
    await User.logout();
    window.location.href = '/'; // Redirect to home/login to clear state
  };

  const filteredNavigationItems = navigationItems.filter((item) => {
    if (item.title === "Game Admin" && user?.role !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary: #1e293b;
          --primary-foreground: #f8fafc;
          --secondary: #f59e0b;
          --secondary-foreground: #1e293b;
          --accent: #64748b;
          --accent-foreground: #f8fafc;
          --background: #0f172a;
          --foreground: #e2e8f0;
          --card: #1e293b;
          --card-foreground: #e2e8f0;
          --border: #334155;
          --ring: #f59e0b;
          --sidebar-background: #0f172a;
          --sidebar-foreground: #e2e8f0;
          --sidebar-primary: #f59e0b;
          --sidebar-primary-foreground: #1e293b;
          --sidebar-accent: #1e293b;
          --sidebar-accent-foreground: #e2e8f0;
          --sidebar-border: #334155;
        }

        body {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #e2e8f0;
        }

        .tactical-grid {
          background-image:
            linear-gradient(rgba(245, 158, 11, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245, 158, 11, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        .glow-effect {
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
        }

        [data-sidebar] {
          background-color: #0f172a !important;
          border-color: #334155 !important;
        }
        
        [data-sidebar-header] {
          background-color: #0f172a !important;
          border-color: #334155 !important;
        }
        
        [data-sidebar-content] {
          background-color: #0f172a !important;
        }
        
        [data-sidebar-footer] {
          background-color: #0f172a !important;
          border-color: #334155 !important;
        }
        
        [data-sidebar-menu-button] {
          background-color: transparent !important;
        }
        
        [data-sidebar-menu-button]:hover {
          background-color: #1e293b !important;
        }
      `}</style>

      <div className="min-h-screen flex w-full bg-slate-900">
        <Sidebar className="border-r border-slate-700 bg-slate-900" style={{ backgroundColor: '#0f172a' }}>
          <SidebarHeader className="border-b border-slate-700 p-6" style={{ backgroundColor: '#0f172a' }}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center glow-effect">
                  <Globe className="w-6 h-6 text-slate-900" />
                </div>
                <div>
                  <h2 className="font-bold text-xl text-amber-400">Stratagem</h2>
                  <p className="text-xs text-slate-400">Command Center</p>
                </div>
              </div>
              {unreadMessages > 0 && (
                <Link to={createPageUrl("Communications")}>
                    <Badge variant="destructive" className="h-6 animate-pulse cursor-pointer flex items-center gap-1.5 px-2">
                        <Mail className="w-4 h-4"/>
                        {unreadMessages}
                    </Badge>
                </Link>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="p-4" style={{ backgroundColor: '#0f172a' }}>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-amber-400 uppercase tracking-wider px-3 py-3">
                Command Modules
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {filteredNavigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                      asChild
                      className={`group relative hover:bg-slate-800 hover:text-amber-400 transition-all duration-300 rounded-lg p-3 ${
                      location.pathname === item.url ? 'bg-amber-500/20 text-amber-400 border-l-4 border-amber-500' : 'text-slate-400'}`
                      }>

                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className="w-5 h-5" />
                          <div className="flex-1">
                            <div className="font-medium">{item.title}</div>
                            <div className="text-xs opacity-70">{item.description}</div>
                          </div>
                          {item.title === "Communications" && unreadMessages > 0 && (
                            <Badge variant="destructive" className="h-6">{unreadMessages}</Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3 py-3">
                Intelligence
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2">
                  <TurnTimer 
                    gameState={gameState}
                    gameConfig={gameConfig}
                    alliances={alliances}
                    wars={wars}
                  />
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-700 p-4" style={{ backgroundColor: '#0f172a' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
                  <span className="text-slate-200 font-medium text-sm">{user?.full_name?.charAt(0) || 'C'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 text-sm truncate">{user?.full_name || 'Commander'}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email || 'Strategic Operations'}</p>
                </div>
              </div>
              <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-amber-400 hover:bg-slate-700"
                  aria-label="Log out"
                >
                  <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-700 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-semibold text-amber-400">NationSim</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto tactical-grid">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

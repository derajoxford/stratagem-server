import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Military from "./Military";

import Diplomacy from "./Diplomacy";

import WarRoom from "./WarRoom";

import Admin from "./Admin";

import Marketplace from "./Marketplace";

import WorldNations from "./WorldNations";

import Cities from "./Cities";

import AllianceTransfers from "./AllianceTransfers";

import DiplomaticWeb from "./DiplomaticWeb";

import Communications from "./Communications";

import WarHistory from "./WarHistory";

import EconomicDashboard from "./EconomicDashboard";

import PublicNationProfile from "./PublicNationProfile";

import PublicAllianceProfile from "./PublicAllianceProfile";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Military: Military,
    
    Diplomacy: Diplomacy,
    
    WarRoom: WarRoom,
    
    Admin: Admin,
    
    Marketplace: Marketplace,
    
    WorldNations: WorldNations,
    
    Cities: Cities,
    
    AllianceTransfers: AllianceTransfers,
    
    DiplomaticWeb: DiplomaticWeb,
    
    Communications: Communications,
    
    WarHistory: WarHistory,
    
    EconomicDashboard: EconomicDashboard,
    
    PublicNationProfile: PublicNationProfile,
    
    PublicAllianceProfile: PublicAllianceProfile,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Military" element={<Military />} />
                
                <Route path="/Diplomacy" element={<Diplomacy />} />
                
                <Route path="/WarRoom" element={<WarRoom />} />
                
                <Route path="/Admin" element={<Admin />} />
                
                <Route path="/Marketplace" element={<Marketplace />} />
                
                <Route path="/WorldNations" element={<WorldNations />} />
                
                <Route path="/Cities" element={<Cities />} />
                
                <Route path="/AllianceTransfers" element={<AllianceTransfers />} />
                
                <Route path="/DiplomaticWeb" element={<DiplomaticWeb />} />
                
                <Route path="/Communications" element={<Communications />} />
                
                <Route path="/WarHistory" element={<WarHistory />} />
                
                <Route path="/EconomicDashboard" element={<EconomicDashboard />} />
                
                <Route path="/PublicNationProfile" element={<PublicNationProfile />} />
                
                <Route path="/PublicAllianceProfile" element={<PublicAllianceProfile />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
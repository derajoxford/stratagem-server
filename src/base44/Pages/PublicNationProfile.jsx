import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Globe, 
  Users, 
  Building, 
  Shield, 
  Crown, 
  Calendar,
  MapPin,
  Coins,
  TrendingUp,
  Mail,
  Swords,
  ArrowLeft,
  ShieldBan,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { getPublicNationData } from "@/functions/getPublicNationData";
import { createPageUrl } from "@/utils";

export default function PublicNationProfilePage() {
  const navigate = useNavigate();
  const [nationData, setNationData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nationId, setNationId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('nationId');
    if (idFromUrl) {
      setNationId(idFromUrl);
    } else {
      setError('No nation ID provided in URL.');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (nationId) {
      loadNationData();
    }
  }, [nationId]);

  const loadNationData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getPublicNationData({ nationId });
      if (response.error || !response.data) {
        throw new Error(response.error || 'No nation data in response');
      }
      setNationData(response.data);
    } catch (err) {
      console.error('Error loading public nation data:', err);
      setError(err.message || 'Failed to load nation profile. This nation may not exist or is inactive.');
    }
    setIsLoading(false);
  };

  const getGovernmentColor = (govType) => {
    if (!govType) return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    switch (govType.toLowerCase()) {
      case 'democracy': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'republic': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'monarchy': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'dictatorship': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'federation': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const formatNumber = (num) => {
    if (!num || isNaN(num)) return '0';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Loading nation profile...</p>
        </div>
      </div>
    );
  }

  if (error || !nationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center px-4">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Nation Not Found</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Button asChild>
            <Link to={createPageUrl("WorldNations")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to World Nations
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 relative">
      {/* Header with banner image */}
      <div className="relative h-64 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 overflow-hidden">
        {nationData.banner_image_url && (
          <img 
            src={nationData.banner_image_url} 
            alt={`${nationData.name} banner`}
            className="w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        
        {/* Back button */}
        <div className="absolute top-6 left-6">
          <Button variant="secondary" asChild className="bg-black/50 hover:bg-black/70 border-slate-600">
            <Link to={createPageUrl("WorldNations")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to World Nations
            </Link>
          </Button>
        </div>
      </div>

      {/* Main content with adjusted max-width */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24">
        {/* Profile header with nation info */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end gap-6 mb-8">
          {/* Profile image */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-slate-700 bg-slate-800 overflow-hidden shadow-xl">
              {nationData.profile_image_url ? (
                <img 
                  src={nationData.profile_image_url} 
                  alt={`${nationData.name} flag`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Globe className="w-12 h-12 text-slate-400" />
                </div>
              )}
            </div>
            {nationData.is_blockaded && (
              <div className="absolute -top-2 -right-2">
                <Badge variant="destructive" className="animate-pulse">
                  <ShieldBan className="w-4 h-4 mr-1" />
                  Blockaded
                </Badge>
              </div>
            )}
          </div>

          {/* Nation name and basic info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl font-bold text-white mb-2">{nationData.name}</h1>
            <p className="text-xl text-slate-300 mb-4">Led by {nationData.leader_name}</p>
            
            <div className="flex flex-wrap gap-3">
              <Badge className={getGovernmentColor(nationData.government_type)}>
                <Crown className="w-4 h-4 mr-1" />
                {nationData.government_type}
              </Badge>
              
              {nationData.alliance && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  <Users className="w-4 h-4 mr-1" />
                  Alliance: {nationData.alliance.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="border-slate-600 hover:bg-slate-700">
              <Mail className="w-4 h-4 mr-2" />
              Send Message
            </Button>
            <Button variant="destructive" className="bg-red-800/80 hover:bg-red-700/90">
              <Swords className="w-4 h-4 mr-2" />
              Declare War
            </Button>
          </div>
        </div>

        {/* Statistics grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-300 text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Total Population
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(nationData.total_population)}</div>
              <div className="text-xs text-slate-400 mt-1">Across {nationData.total_cities} cities</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-300 text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" />
                Military Strength
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(nationData.military_overview?.total_strength || 0)}</div>
              <div className="text-xs text-slate-400 mt-1">Overall Power Rating</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-300 text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Estimated GDP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${formatNumber(nationData.estimated_gdp)}</div>
              <div className="text-xs text-slate-400 mt-1">Annual Economic Output</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-300 text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Founding Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatDate(nationData.created_date)}</div>
              <div className="text-xs text-slate-400 mt-1">In-game establishment</div>
            </CardContent>
          </Card>
        </div>

        {/* Main content sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Public Description */}
          <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                Public Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nationData.public_description ? (
                <div 
                  className="text-slate-300 prose prose-slate prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: nationData.public_description }}
                />
              ) : (
                <p className="text-slate-400 italic">This nation has not provided a public description.</p>
              )}
            </CardContent>
          </Card>

          {/* Military Overview */}
          <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Swords className="w-5 h-5 text-red-400" />
                Military Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Training Level:</span>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Level {nationData.military_overview?.training_level || 0}
                </Badge>
              </div>

              <Separator className="bg-slate-700" />

              <div className="space-y-3">
                <div className="text-slate-300 font-medium">Force Composition:</div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ground Forces:</span>
                    <span className="text-white font-medium">{formatNumber(nationData.military_overview?.force_composition?.ground_forces || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Air Forces:</span>
                    <span className="text-white font-medium">{formatNumber(nationData.military_overview?.force_composition?.air_forces || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Naval Forces:</span>
                    <span className="text-white font-medium">{formatNumber(nationData.military_overview?.force_composition?.naval_forces || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Strategic Weapons:</span>
                    <span className="text-white font-medium">{formatNumber(nationData.military_overview?.force_composition?.strategic_weapons || 0)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional info section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-400" />
                Territory Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Cities:</span>
                <span className="text-white">{nationData.total_cities}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Territory:</span>
                <span className="text-white">{formatNumber(nationData.territory || 0)} acres</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                Economic Indicators
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Resource Diversity:</span>
                <span className="text-white">{nationData.resource_diversity || 0} types</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Economic Rank:</span>
                <span className="text-green-400">Developing</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                Diplomatic Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {nationData.alliance ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Alliance:</span>
                    <span className="text-purple-400">{nationData.alliance.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Members:</span>
                    <span className="text-white">{nationData.alliance.member_count || 0}</span>
                  </div>
                </>
              ) : (
                <div className="text-slate-400 italic">Independent Nation</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

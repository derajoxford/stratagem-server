import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Users, 
  Crown, 
  Calendar,
  Swords,
  Building,
  MessageSquare,
  ArrowLeft,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { getPublicAllianceData } from "@/functions/getPublicAllianceData";
import { createPageUrl } from "@/utils";

export default function PublicAllianceProfilePage() {
  const navigate = useNavigate();
  const [allianceData, setAllianceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allianceId, setAllianceId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('allianceId');
    if (idFromUrl) {
      setAllianceId(idFromUrl);
    } else {
      setError('No alliance ID provided in URL.');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allianceId) {
      loadAllianceData();
    }
  }, [allianceId]);

  const loadAllianceData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: response, error: responseError } = await getPublicAllianceData({ allianceId });
      if (responseError || !response.data) {
        throw new Error(responseError?.error || 'No alliance data in response');
      }
      setAllianceData(response.data);
    } catch (err) {
      console.error('Error loading public alliance data:', err);
      setError(err.message || 'Failed to load alliance profile. This alliance may not exist or is inactive.');
    }
    setIsLoading(false);
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
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Loading alliance profile...</p>
        </div>
      </div>
    );
  }

  if (error || !allianceData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Alliance Not Found</h2>
            <p className="text-slate-400 mb-6">{error || 'Unknown error occurred'}</p>
            <Button onClick={() => navigate(createPageUrl('Diplomacy'))} className="bg-amber-600 hover:bg-amber-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Diplomacy
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const alliance = { ...allianceData };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative w-48 h-48 rounded-lg border-4 border-purple-400 bg-slate-800 overflow-hidden shadow-lg flex-shrink-0">
            {alliance.profile_image_url ? (
              <img src={alliance.profile_image_url} alt={`${alliance.name} Logo`} className="w-full h-full object-cover" />
            ) : (
              <Shield className="w-full h-full p-8 text-purple-400 opacity-60" />
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-5xl font-extrabold text-purple-400 drop-shadow-lg">{alliance.name}</h1>
            <p className="text-xl text-slate-300 font-semibold mt-2">{alliance.description || 'A coalition of nations united for a common cause.'}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
              <Badge variant="outline" className="bg-slate-700 border-slate-600">
                <Crown className="w-4 h-4 mr-2 text-amber-400" />
                Founded by {alliance.founder?.name || 'Unknown'}
              </Badge>
              <Badge variant="outline" className="bg-slate-700 border-slate-600">
                <Calendar className="w-4 h-4 mr-2 text-blue-400" />
                Established {formatDate(alliance.created_date)}
              </Badge>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-slate-700" />

        {alliance.public_description && (
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm mb-8">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-purple-400" />
                        Public Dispatch
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div
                        className="prose prose-slate prose-invert max-w-none text-slate-300"
                        dangerouslySetInnerHTML={{ __html: alliance.public_description }}
                    />
                </CardContent>
            </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader className="pb-2"><CardTitle className="text-md font-medium text-slate-400">Total Members</CardTitle></CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">{formatNumber(alliance.statistics?.total_members)}</div>
                    <p className="text-xs text-slate-500 mt-1">Nations in Alliance</p>
                </CardContent>
            </Card>
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader className="pb-2"><CardTitle className="text-md font-medium text-slate-400">Combined Strength</CardTitle></CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">{formatNumber(alliance.statistics?.total_military_strength)}</div>
                    <p className="text-xs text-slate-500 mt-1">Total Military Power</p>
                </CardContent>
            </Card>
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader className="pb-2"><CardTitle className="text-md font-medium text-slate-400">Total Cities</CardTitle></CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">{formatNumber(alliance.statistics?.total_cities)}</div>
                    <p className="text-xs text-slate-500 mt-1">Across all members</p>
                </CardContent>
            </Card>
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader className="pb-2"><CardTitle className="text-md font-medium text-slate-400">Average Strength</CardTitle></CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-white">{formatNumber(alliance.statistics?.average_nation_strength)}</div>
                    <p className="text-xs text-slate-500 mt-1">Per member nation</p>
                </CardContent>
            </Card>
        </div>
        
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Users className="w-5 h-5 text-purple-400" />Member Nations</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {alliance.members && alliance.members.length > 0 ? (
                        alliance.members
                            .sort((a, b) => b.military_strength - a.military_strength)
                            .map(member => (
                                <Link to={createPageUrl(`PublicNationProfile?nationId=${member.id}`)} key={member.id} className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                        <div className="flex items-center gap-4">
                                            {member.is_founder && <Crown className="w-5 h-5 text-amber-400 flex-shrink-0" title="Founder" />}
                                            <div className="w-10 h-10 rounded-full bg-slate-600 overflow-hidden flex-shrink-0">
                                                {member.profile_image_url ? <img src={member.profile_image_url} alt={member.name} className="w-full h-full object-cover"/> : <Users className="w-full h-full p-2 text-slate-400"/>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg text-white">{member.name}</p>
                                                <p className="text-sm text-slate-400">Led by {member.leader_name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 mt-2 sm:mt-0 text-sm text-right">
                                            <div className="flex items-center gap-2" title="Military Strength">
                                                <Swords className="w-4 h-4 text-red-400"/>
                                                <span className="font-medium text-slate-300">{formatNumber(member.military_strength)}</span>
                                            </div>
                                            <div className="flex items-center gap-2" title="Cities">
                                                <Building className="w-4 h-4 text-blue-400"/>
                                                <span className="font-medium text-slate-300">{formatNumber(member.cities)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                    ) : <p className="text-slate-400 text-center py-4">This alliance has no members.</p>}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Shield, Globe, Search, Crown, Check, Hourglass, Info, UserPlus } from 'lucide-react';
import { Alliance, AllianceApplication, AllianceInvitation } from '@/entities/all';
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from '@/utils';

export default function AllianceDirectory({ alliances, nation, myAlliance, onUpdate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [applications, setApplications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const { toast } = useToast();

  const handleApply = async (allianceId) => {
    // Prevent applying to own alliance or if already a member
    if (myAlliance) {
      toast({
        variant: "destructive",
        title: "Action Not Allowed",
        description: "You are already a member of an alliance.",
      });
      return;
    }

    const applicationMessage = prompt("Why do you want to join this alliance?");
    if (applicationMessage) {
      try {
        await AllianceApplication.create({
          alliance_id: allianceId,
          applicant_nation_id: nation.id,
          application_message: applicationMessage,
        });
        toast({
          title: "Application Sent",
          description: "Your application has been sent to the alliance leadership.",
        });
        onUpdate();
      } catch (error) {
        console.error("Failed to send application:", error);
        toast({
          variant: "destructive",
          title: "Application Failed",
          description: "There was an error sending your application.",
        });
      }
    }
  };

  const filteredAlliances = alliances.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          type="text"
          placeholder="Search for an alliance..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-700/50 border-slate-600 pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAlliances.map(alliance => (
          <Card key={alliance.id} className="bg-slate-800/80 border-slate-700 flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-slate-700 flex-shrink-0">
                    {alliance.logo_url ? (
                      <img src={alliance.logo_url} alt={`${alliance.name} logo`} className="w-full h-full object-cover rounded-md" />
                    ) : (
                      <Shield className="w-full h-full p-2 text-purple-400 opacity-60" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white hover:text-purple-400 transition-colors">
                      <Link to={createPageUrl(`PublicAllianceProfile?allianceId=${alliance.id}`)}>{alliance.name}</Link>
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Founded by {alliances.find(a => a.id === alliance.id)?.founder_nation_id && nation.name}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-slate-300 text-sm mb-4 line-clamp-2">{alliance.description || "No description provided."}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                  <Users className="w-3 h-3 mr-1" /> {alliance.member_nations.length + 1} members
                </Badge>
                <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                  <Globe className="w-3 h-3 mr-1" /> {alliance.total_cities} cities
                </Badge>
                <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                  <Shield className="w-3 h-3 mr-1" /> {alliance.total_military_strength.toLocaleString()} strength
                </Badge>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button asChild variant="outline" className="w-full border-slate-600 hover:bg-slate-700">
                <Link to={createPageUrl(`PublicAllianceProfile?allianceId=${alliance.id}`)}>
                  <Info className="w-4 h-4 mr-2" />
                  View Profile
                </Link>
              </Button>
              {!myAlliance && (
                <Button onClick={() => handleApply(alliance.id)} className="w-full bg-purple-600 hover:bg-purple-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Apply
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

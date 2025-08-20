
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Users, Coins, Cloud, ArrowRight } from "lucide-react";

export default function CityEconomicReport({ cities }) {
    const handleCityClick = (cityId, cityName) => {
        localStorage.setItem('selectedCityId', cityId);
        localStorage.setItem('selectedCityName', cityName);
        console.log(`Storing city ID ${cityId} in localStorage for ${cityName}`);
    };

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-blue-400" />
                    City-Level Economic Report
                </CardTitle>
                <CardDescription>
                    A breakdown of economic activity in each of your cities.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-700">
                            <TableHead className="text-white">City</TableHead>
                            <TableHead className="text-white text-right">Population</TableHead>
                            <TableHead className="text-white text-right">Income/Turn</TableHead>
                            <TableHead className="text-white text-right">Pollution</TableHead>
                            <TableHead className="text-white text-right">Manage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cities && cities.length > 0 ? cities.map((city) => (
                            <TableRow key={city.id} className="border-slate-700 hover:bg-slate-700/50">
                                <TableCell className="font-medium text-white">{city.name}</TableCell>
                                <TableCell className="text-right text-slate-300">
                                    <div className="flex items-center justify-end gap-2">
                                        <Users className="w-4 h-4 text-slate-500" />
                                        {city.population?.toLocaleString() || 0}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-slate-300">
                                    <div className="flex items-center justify-end gap-2">
                                        <Coins className="w-4 h-4 text-green-500" />
                                        ${city.income_per_turn?.toLocaleString() || 0}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-slate-300">
                                    <div className="flex items-center justify-end gap-2">
                                        <Cloud className="w-4 h-4 text-slate-500" />
                                        {city.pollution_level}%
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link 
                                        to={createPageUrl("CityDetails")}
                                        onClick={() => handleCityClick(city.id, city.name)}
                                    >
                                        <ArrowRight className="w-5 h-5 text-amber-400 hover:text-amber-300" />
                                    </Link>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan="5" className="text-center text-slate-400">No cities to report.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

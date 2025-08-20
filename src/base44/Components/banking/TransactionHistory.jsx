import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/daterangepicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 15;

const financialCategories = ['Taxes', 'Trade', 'Infrastructure', 'Alliance', 'Upkeep', 'Military', 'Market Purchase', 'Market Sale', 'Warfare'];
const resourceCategories = ['Production', 'Market Trade', 'Upkeep', 'Building', 'Warfare', 'Alliance'];

export default function TransactionHistory({ financialTransactions, resourceTransactions, filters, onFilterChange }) {
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState('financial');
    
    const handleFilterUpdate = (filterName, value) => {
        setPage(1); // Reset page on filter change
        onFilterChange(prev => ({ ...prev, [filterName]: value }));
    };

    const onTabChange = (newTab) => {
        setActiveTab(newTab);
        setPage(1);
        handleFilterUpdate('category', 'all'); // Reset category filter on tab change
    };

    const { paginatedData, totalPages, totalItems } = useMemo(() => {
        const sourceData = activeTab === 'financial' ? financialTransactions : resourceTransactions;
        const total = sourceData.length;
        const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const startIndex = (page - 1) * PAGE_SIZE;
        const paginated = sourceData.slice(startIndex, startIndex + PAGE_SIZE);
        return { paginatedData: paginated, totalPages: pages, totalItems: total };
    }, [activeTab, financialTransactions, resourceTransactions, page]);

    const allResourceTypes = useMemo(() => {
        return [...new Set(resourceTransactions.map(t => t.resource_type))].sort();
    }, [resourceTransactions]);

    return (
        <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
                <CardTitle className="text-white">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
                        <TabsTrigger value="financial">Financial History</TabsTrigger>
                        <TabsTrigger value="resource">Resource History</TabsTrigger>
                    </TabsList>

                    <div className="flex flex-wrap gap-4 my-4 p-4 bg-slate-800/50 rounded-lg">
                        <DateRangePicker 
                            onUpdate={({ range }) => handleFilterUpdate('dateRange', range)}
                            initialDateFrom={filters.dateRange.from}
                            initialDateTo={filters.dateRange.to}
                        />
                        <Select value={filters.type} onValueChange={(v) => handleFilterUpdate('type', v)}>
                            <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="inflow">Inflow</SelectItem><SelectItem value="outflow">Outflow</SelectItem></SelectContent>
                        </Select>
                        <Select value={filters.category} onValueChange={(v) => handleFilterUpdate('category', v)}>
                            <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {(activeTab === 'financial' ? financialCategories : resourceCategories).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {activeTab === 'resource' && (
                            <Select value={filters.resourceType} onValueChange={(v) => handleFilterUpdate('resourceType', v)}>
                                <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Resources</SelectItem>
                                    {allResourceTypes.map(res => <SelectItem key={res} value={res} className="capitalize">{res}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    
                    <TabsContent value="financial">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-slate-800/80">
                                        <TableHead className="text-slate-300">Date</TableHead>
                                        <TableHead className="text-slate-300">Category</TableHead>
                                        <TableHead className="text-slate-300">Details</TableHead>
                                        <TableHead className="text-right text-slate-300">Amount</TableHead>
                                        <TableHead className="text-right text-slate-300">Running Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedData.length === 0 ? (
                                        <TableRow><TableCell colSpan="5" className="text-center text-slate-400 py-10">No transactions found.</TableCell></TableRow>
                                    ) : (
                                        paginatedData.map(tx => (
                                            <TableRow key={tx.id} className="border-slate-700/50 hover:bg-slate-800/50">
                                                <TableCell className="text-slate-400 text-xs">{new Date(tx.created_date).toLocaleString()}</TableCell>
                                                <TableCell><Badge variant="secondary" className="bg-slate-700 text-slate-300">{tx.category}</Badge></TableCell>
                                                <TableCell className="text-slate-300">{tx.sub_category}</TableCell>
                                                <TableCell className={`text-right font-medium ${tx.transaction_type === 'inflow' ? 'text-green-400' : 'text-red-400'}`}>
                                                    {tx.transaction_type === 'inflow' ? '+' : '-'} ${(tx.amount || 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right text-amber-400">${(tx.new_balance || 0).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                    <TabsContent value="resource">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-slate-800/80">
                                        <TableHead className="text-slate-300">Date</TableHead>
                                        <TableHead className="text-slate-300">Resource</TableHead>
                                        <TableHead className="text-slate-300">Category</TableHead>
                                        <TableHead className="text-slate-300">Details</TableHead>
                                        <TableHead className="text-right text-slate-300">Amount</TableHead>
                                        <TableHead className="text-right text-slate-300">New Stockpile</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedData.length === 0 ? (
                                        <TableRow><TableCell colSpan="6" className="text-center text-slate-400 py-10">No transactions found.</TableCell></TableRow>
                                    ) : (
                                        paginatedData.map(tx => (
                                            <TableRow key={tx.id} className="border-slate-700/50 hover:bg-slate-800/50">
                                                <TableCell className="text-slate-400 text-xs">{new Date(tx.created_date).toLocaleString()}</TableCell>
                                                <TableCell className="font-medium text-white capitalize">{tx.resource_type || 'Unknown'}</TableCell>
                                                <TableCell><Badge variant="secondary" className="bg-slate-700 text-slate-300">{tx.category || 'Uncategorized'}</Badge></TableCell>
                                                <TableCell className="text-slate-300">{tx.sub_category || 'No details'}</TableCell>
                                                <TableCell className={`text-right font-medium ${tx.transaction_type === 'inflow' ? 'text-green-400' : 'text-red-400'}`}>
                                                    {tx.transaction_type === 'inflow' ? '+' : '-'} {(tx.amount || 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right text-amber-400">{(tx.new_stockpile || 0).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-slate-400">
                        Page {page} of {totalPages} ({totalItems} total transactions)
                    </span>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                            <ArrowLeft className="w-4 h-4 mr-1" /> Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                            Next <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

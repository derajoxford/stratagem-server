
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, Banknote, TrendingUp, TrendingDown, Loader2, Package } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/daterangepicker';

const StatCard = ({ title, value, icon, description, valueClassName }) => (
    <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${valueClassName}`}>{value}</div>
            {description && <p className="text-xs text-slate-500">{description}</p>}
        </CardContent>
    </Card>
);

export default function FinancialSummary({ nation, financialTransactions, resourceTransactions, dateRange, onDateRangeChange, isLoading }) {
    const stats = useMemo(() => {
        // Financial Stats
        const inflows = financialTransactions.filter(t => t.transaction_type === 'inflow');
        const outflows = financialTransactions.filter(t => t.transaction_type === 'outflow');

        const totalInflow = inflows.reduce((acc, t) => acc + t.amount, 0);
        const totalOutflow = outflows.reduce((acc, t) => acc + t.amount, 0);

        const incomeSources = inflows.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});
        const topIncomeSource = Object.entries(incomeSources).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        const expenseSources = outflows.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});
        const topExpenseSource = Object.entries(expenseSources).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        
        // Resource Stats
        const resourceChanges = {};
        if (resourceTransactions) {
            resourceTransactions.forEach(t => {
                if (!resourceChanges[t.resource_type]) {
                    resourceChanges[t.resource_type] = { inflow: 0, outflow: 0, volume: 0 };
                }
                if (t.transaction_type === 'inflow') {
                    resourceChanges[t.resource_type].inflow += t.amount;
                } else {
                    resourceChanges[t.resource_type].outflow += t.amount;
                }
                resourceChanges[t.resource_type].volume += t.amount;
            });
        }
        
        const topResources = Object.entries(resourceChanges)
            .sort(([, a], [, b]) => b.volume - a.volume)
            .slice(0, 4)
            .map(([name, data]) => ({ name, ...data, net: data.inflow - data.outflow }));

        return { totalInflow, totalOutflow, topIncomeSource, topExpenseSource, topResources };
    }, [financialTransactions, resourceTransactions]);

    const dateRangeLabel = dateRange.to ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}` : `from ${dateRange.from.toLocaleDateString()}`;

    return (
        <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between">
                 <CardTitle className="text-white">Financial & Resource Summary</CardTitle>
                 <DateRangePicker 
                    onUpdate={({ range }) => onDateRangeChange(range)} 
                    initialDateFrom={dateRange.from}
                    initialDateTo={dateRange.to}
                 />
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                    </div>
                 ) : (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                            <StatCard 
                                title="Current Treasury"
                                value={`$${(nation.treasury || 0).toLocaleString()}`}
                                icon={<Banknote className="h-4 w-4 text-slate-500" />}
                                valueClassName="text-amber-400"
                            />
                            <StatCard 
                                title="Total Inflows"
                                value={`$${stats.totalInflow.toLocaleString()}`}
                                icon={<ArrowUpCircle className="h-4 w-4 text-slate-500" />}
                                description={dateRangeLabel}
                                valueClassName="text-green-400"
                            />
                            <StatCard 
                                title="Total Outflows"
                                value={`$${stats.totalOutflow.toLocaleString()}`}
                                icon={<ArrowDownCircle className="h-4 w-4 text-slate-500" />}
                                description={dateRangeLabel}
                                valueClassName="text-red-400"
                            />
                            <StatCard 
                                title="Top Income Source"
                                value={stats.topIncomeSource}
                                icon={<TrendingUp className="h-4 w-4 text-slate-500" />}
                                description={dateRangeLabel}
                                valueClassName="text-slate-200"
                            />
                            <StatCard 
                                title="Top Expense Source"
                                value={stats.topExpenseSource}
                                icon={<TrendingDown className="w-4 h-4 text-slate-500" />}
                                description={dateRangeLabel}
                                valueClassName="text-slate-200"
                            />
                        </div>

                        {stats.topResources && stats.topResources.length > 0 && (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-6 border-t border-slate-700/50">
                                {stats.topResources.map(res => (
                                    <StatCard 
                                        key={res.name}
                                        title={`Net ${res.name.charAt(0).toUpperCase() + res.name.slice(1)}`}
                                        value={res.net.toLocaleString()}
                                        icon={<Package className="h-4 w-4 text-slate-500" />}
                                        description={`In: ${res.inflow.toLocaleString()} | Out: ${res.outflow.toLocaleString()}`}
                                        valueClassName={res.net >= 0 ? 'text-green-400' : 'text-red-400'}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

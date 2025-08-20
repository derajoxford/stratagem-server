import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Store, ArrowRight } from 'lucide-react';

export default function MarketplacePreview() {
    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Store className="w-5 h-5 text-purple-400" />
                    Global Marketplace
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-slate-400 text-sm">
                    Trade resources with other nations. Buy what you need, sell your surplus.
                </p>
                <Link to={createPageUrl("Marketplace")}>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Go to Marketplace
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
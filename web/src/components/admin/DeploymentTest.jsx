import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function DeploymentTest() {
  const timestamp = new Date().toLocaleString();
  return (
    <Card className="bg-green-900/50 border-green-500/50 mt-6 mb-8">
      <CardHeader>
        <CardTitle className="text-green-300 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Deployment Test Successful
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-green-200">This component was successfully deployed to your environment.</p>
        <p className="text-xs text-green-400 mt-2">Timestamp: {timestamp}</p>
      </CardContent>
    </Card>
  );
}
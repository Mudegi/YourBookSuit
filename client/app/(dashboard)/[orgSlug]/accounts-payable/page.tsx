'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';

export default function AccountsPayableIndex() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-blue-600">
        <Link href={`/${orgSlug}`} className="inline-flex items-center hover:text-blue-700">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Accounts Payable</h1>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/accounts-payable/bills/new`}>
            <Button>Create Bill</Button>
          </Link>
          <Link href={`/${orgSlug}/accounts-payable/vendors`}>
            <Button variant="outline">Vendors</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:border-blue-200 hover:shadow-sm transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-blue-600" /> Bills
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700 text-sm">
            <p>View, create, and manage vendor bills.</p>
            <div className="flex gap-3">
              <Link href={`/${orgSlug}/accounts-payable/bills`}>
                <Button size="sm">Go to Bills</Button>
              </Link>
              <Link href={`/${orgSlug}/accounts-payable/bills/new`}>
                <Button size="sm" variant="outline">New Bill</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-blue-200 hover:shadow-sm transition">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-blue-600" /> Vendors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700 text-sm">
            <p>Manage vendor records and payment terms.</p>
            <div className="flex gap-3">
              <Link href={`/${orgSlug}/accounts-payable/vendors`}>
                <Button size="sm">View Vendors</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

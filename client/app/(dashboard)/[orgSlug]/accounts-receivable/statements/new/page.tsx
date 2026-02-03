'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Download, Mail, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/hooks/useOrganization';

interface Customer {
  id: string;
  customerNumber: string;
  companyName: string | null;
  firstName: string;
  lastName: string;
}

export default function NewStatementPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { organization } = useOrganization();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    customerId: '',
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    statementType: 'OUTSTANDING', // OUTSTANDING or FULL_ACTIVITY
    includePaid: false,
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/customers`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const name = c.companyName || `${c.firstName} ${c.lastName}`;
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleGenerate = () => {
    if (!formData.customerId) {
      alert('Please select a customer');
      return;
    }

    const queryParams = new URLSearchParams({
      customerId: formData.customerId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      statementType: formData.statementType,
      includePaid: formData.includePaid.toString(),
    });

    router.push(`/${orgSlug}/accounts-receivable/statements/preview?${queryParams}`);
  };

  const selectedCustomer = customers.find((c) => c.id === formData.customerId);

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Link
        href={`/${orgSlug}/accounts-receivable`}
        className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Accounts Receivable
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Generate Customer Statement</h1>
        <p className="text-gray-600 mt-1">
          Create a detailed account statement showing all transactions and running balance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Statement Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Selection */}
          <div>
            <Label htmlFor="customer" className="text-sm font-semibold">
              Customer *
            </Label>
            <div className="mt-1">
              <Input
                type="text"
                placeholder="Search customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
              />
              <select
                id="customer"
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select customer</option>
                {filteredCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.companyName || `${customer.firstName} ${customer.lastName}`} ({customer.customerNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-semibold">
                Start Date *
              </Label>
              <Input
                type="date"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-semibold">
                End Date *
              </Label>
              <Input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Statement Type */}
          <div>
            <Label htmlFor="statementType" className="text-sm font-semibold">
              Statement Type
            </Label>
            <select
              id="statementType"
              value={formData.statementType}
              onChange={(e) => setFormData({ ...formData, statementType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
            >
              <option value="OUTSTANDING">Outstanding Transactions Only</option>
              <option value="FULL_ACTIVITY">Full Activity (All Transactions)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.statementType === 'OUTSTANDING'
                ? 'Shows only unpaid invoices and unapplied payments'
                : 'Shows all invoices, payments, and credits in the period'}
            </p>
          </div>

          {/* Include Paid Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includePaid"
              checked={formData.includePaid}
              onChange={(e) => setFormData({ ...formData, includePaid: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <Label htmlFor="includePaid" className="ml-2 text-sm text-gray-700">
              Include fully paid invoices
            </Label>
          </div>

          {/* Quick Date Presets */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  setFormData({
                    ...formData,
                    startDate: firstDay.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0],
                  });
                }}
              >
                This Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                  setFormData({
                    ...formData,
                    startDate: firstDay.toISOString().split('T')[0],
                    endDate: lastDay.toISOString().split('T')[0],
                  });
                }}
              >
                Last Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const threeMonthsAgo = new Date(today.setMonth(today.getMonth() - 3));
                  setFormData({
                    ...formData,
                    startDate: threeMonthsAgo.toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                  });
                }}
              >
                Last 3 Months
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const yearStart = new Date(today.getFullYear(), 0, 1);
                  setFormData({
                    ...formData,
                    startDate: yearStart.toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                  });
                }}
              >
                Year to Date
              </Button>
            </div>
          </div>

          {/* Selected Customer Summary */}
          {selectedCustomer && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="font-semibold text-gray-900 mb-1">Selected Customer</h3>
              <p className="text-sm text-gray-700">
                {selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
              </p>
              <p className="text-xs text-gray-600">Account: {selectedCustomer.customerNumber}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href={`/${orgSlug}/accounts-receivable`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!formData.customerId || loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Statement
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

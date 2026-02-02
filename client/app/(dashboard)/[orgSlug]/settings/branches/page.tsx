'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, MapPin, Phone, Mail, Users, FileText, CreditCard, Package } from 'lucide-react';
import Link from 'next/link';

interface Branch {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  isHeadquarters: boolean;
  isActive: boolean;
  currency: string;
  timezone: string;
  openingDate: string;
  _count: {
    transactions: number;
    invoices: number;
    bills: number;
    customers: number;
    vendors: number;
  };
}

const branchTypeLabels: Record<string, string> = {
  HEADQUARTERS: 'Headquarters',
  OFFICE: 'Office',
  WAREHOUSE: 'Warehouse',
  RETAIL_STORE: 'Retail Store',
  MANUFACTURING: 'Manufacturing',
  DISTRIBUTION_CENTER: 'Distribution Center',
  SERVICE_CENTER: 'Service Center',
  REMOTE: 'Remote',
};

const branchTypeColors: Record<string, string> = {
  HEADQUARTERS: 'bg-purple-100 text-purple-800',
  OFFICE: 'bg-blue-100 text-blue-800',
  WAREHOUSE: 'bg-orange-100 text-orange-800',
  RETAIL_STORE: 'bg-green-100 text-green-800',
  MANUFACTURING: 'bg-red-100 text-red-800',
  DISTRIBUTION_CENTER: 'bg-yellow-100 text-yellow-800',
  SERVICE_CENTER: 'bg-teal-100 text-teal-800',
  REMOTE: 'bg-gray-100 text-gray-800',
};

export default function BranchesPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchBranches();
  }, [filter]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('isActive', filter === 'active' ? 'true' : 'false');
      }
      
      const response = await fetch(`/api/${orgSlug}/branches?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBranches(data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (branch: Branch) => {
    const parts = [
      branch.address,
      branch.city,
      branch.state,
      branch.postalCode,
      branch.country,
    ].filter(Boolean);
    return parts.join(', ') || 'No address';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Branch Management</h1>
          <p className="text-gray-600 mt-1">
            Manage multiple locations for your business
          </p>
        </div>
        <Link href={`/${orgSlug}/settings/branches/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Branch
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Branches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{branches.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Branches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {branches.filter((b) => b.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Headquarters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {branches.filter((b) => b.isHeadquarters).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {branches.reduce((sum, b) => sum + b._count.transactions, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All Branches
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active Only
        </Button>
        <Button
          variant={filter === 'inactive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('inactive')}
        >
          Inactive Only
        </Button>
      </div>

      {/* Branches List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading branches...</p>
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No branches found</h3>
            <p className="text-gray-600 mb-4">
              Get started by adding your first branch location
            </p>
            <Link href={`/${orgSlug}/settings/branches/new`}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add First Branch
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {branches.map((branch) => (
            <Card key={branch.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{branch.name}</CardTitle>
                      {branch.isHeadquarters && (
                        <Badge className="bg-purple-100 text-purple-800">
                          HQ
                        </Badge>
                      )}
                      <Badge
                        className={
                          branch.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <CardDescription>
                      <div className="flex items-center gap-2">
                        <Badge className={branchTypeColors[branch.type] || ''}>
                          {branchTypeLabels[branch.type] || branch.type}
                        </Badge>
                        <span className="text-sm">
                          Code: <strong>{branch.code}</strong>
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                  <Link href={`/${orgSlug}/settings/branches/${branch.id}`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Contact Information */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-500" />
                    <span className="text-gray-700">{formatAddress(branch)}</span>
                  </div>
                  {branch.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{branch.email}</span>
                    </div>
                  )}
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <FileText className="w-5 h-5 mx-auto text-gray-500 mb-1" />
                    <div className="text-lg font-semibold">
                      {branch._count.transactions}
                    </div>
                    <div className="text-xs text-gray-600">Transactions</div>
                  </div>
                  <div className="text-center">
                    <Users className="w-5 h-5 mx-auto text-gray-500 mb-1" />
                    <div className="text-lg font-semibold">
                      {branch._count.customers + branch._count.vendors}
                    </div>
                    <div className="text-xs text-gray-600">Contacts</div>
                  </div>
                  <div className="text-center">
                    <CreditCard className="w-5 h-5 mx-auto text-gray-500 mb-1" />
                    <div className="text-lg font-semibold">
                      {branch._count.invoices + branch._count.bills}
                    </div>
                    <div className="text-xs text-gray-600">Documents</div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="flex items-center justify-between pt-2 text-xs text-gray-500 border-t">
                  <span>{branch.currency}</span>
                  <span>{branch.timezone}</span>
                  <span>Since {new Date(branch.openingDate).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

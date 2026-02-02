"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, MapPin, Phone, Mail, DollarSign, Clock } from "lucide-react";
import Link from "next/link";

interface Branch {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  managerId: string | null;
  isHeadquarters: boolean;
  isActive: boolean;
  taxIdNumber: string | null;
  currency: string;
  timezone: string;
  openingDate: string;
  settings?: {
    baseCurrency: string;
    fiscalYearStart: number;
    homeCountry: string;
    effectiveCurrency: string;
    effectiveTaxIdNumber?: string;
    effectiveAddress?: string;
    effectivePhone?: string;
    effectiveEmail?: string;
  };
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: string;
}

export default function EditBranchPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const branchId = params.id as string;

  const [branch, setBranch] = useState<Branch | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchBranch();
    fetchWarehouses();
  }, []);

  const fetchBranch = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/branches/${branchId}`);
      if (response.ok) {
        const data = await response.json();
        setBranch(data);
      } else {
        setError("Failed to load branch");
      }
    } catch (err) {
      setError("Failed to load branch");
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(`/api/${orgSlug}/warehouse`);
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      }
    } catch (err) {
      // Silently fail for warehouses
    }
  };

  const handleSave = async () => {
    if (!branch) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/${orgSlug}/branches/${branchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(branch),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update branch');
      }

      setSuccess('Branch updated successfully!');
      setTimeout(() => {
        router.push(`/${orgSlug}/settings/branches`);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update branch');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/${orgSlug}/branches/${branchId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete branch');
      }

      router.push(`/${orgSlug}/settings/branches`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete branch');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="p-6">
        <Alert variant="error">Branch not found</Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${orgSlug}/settings/branches`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Branches
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit Branch</h1>
            <p className="text-gray-600 mt-1">Update branch details and settings</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={branch.isHeadquarters}
          >
            Delete Branch
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Branch Information</CardTitle>
              <CardDescription>Basic branch details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={branch.code}
                    onChange={(e) => setBranch({ ...branch, code: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={branch.name}
                    onChange={(e) => setBranch({ ...branch, name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={branch.type}
                  onChange={(e) => setBranch({ ...branch, type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="OFFICE">Office</option>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="RETAIL_STORE">Retail Store</option>
                  <option value="MANUFACTURING">Manufacturing</option>
                  <option value="DISTRIBUTION_CENTER">Distribution Center</option>
                  <option value="SERVICE_CENTER">Service Center</option>
                  <option value="REMOTE">Remote</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={branch.isActive}
                  onChange={(e) => setBranch({ ...branch, isActive: e.target.checked })}
                />
                <label htmlFor="active" className="text-sm text-gray-700">Active</label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hq"
                  checked={branch.isHeadquarters}
                  onChange={(e) => setBranch({ ...branch, isHeadquarters: e.target.checked })}
                  disabled={branch.isHeadquarters} // Prevent unchecking HQ
                />
                <label htmlFor="hq" className="text-sm text-gray-700">Headquarters</label>
                {branch.isHeadquarters && (
                  <Badge className="bg-purple-100 text-purple-800">Required</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Address and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={branch.address || ''}
                  onChange={(e) => setBranch({ ...branch, address: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={branch.city || ''}
                    onChange={(e) => setBranch({ ...branch, city: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={branch.state || ''}
                    onChange={(e) => setBranch({ ...branch, state: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={branch.postalCode || ''}
                    onChange={(e) => setBranch({ ...branch, postalCode: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={branch.phone || ''}
                    onChange={(e) => setBranch({ ...branch, phone: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={branch.email || ''}
                    onChange={(e) => setBranch({ ...branch, email: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Settings</CardTitle>
              <CardDescription>Tax and financial settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID Number</label>
                <input
                  type="text"
                  value={branch.taxIdNumber || ''}
                  onChange={(e) => setBranch({ ...branch, taxIdNumber: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Branch-specific tax ID (leave empty to inherit from organization)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <input
                    type="text"
                    value={branch.currency}
                    onChange={(e) => setBranch({ ...branch, currency: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={branch.timezone}
                    onChange={(e) => setBranch({ ...branch, timezone: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Warehouse Mapping</CardTitle>
              <CardDescription>Map this branch to a default warehouse for inventory operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Warehouse</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select a warehouse...</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} - {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Effective Settings</CardTitle>
              <CardDescription>Settings after inheritance from organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {branch.settings && (
                <>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      <strong>Currency:</strong> {branch.settings.effectiveCurrency}
                      {branch.currency !== branch.settings.baseCurrency && (
                        <span className="text-green-600 ml-1">(override)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      <strong>Tax ID:</strong> {branch.settings.effectiveTaxIdNumber || 'Not set'}
                      {branch.taxIdNumber && (
                        <span className="text-green-600 ml-1">(override)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                    <span className="text-sm">
                      <strong>Address:</strong> {branch.settings.effectiveAddress || 'Not set'}
                      {branch.address && (
                        <span className="text-green-600 ml-1">(override)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      <strong>Phone:</strong> {branch.settings.effectivePhone || 'Not set'}
                      {branch.phone && (
                        <span className="text-green-600 ml-1">(override)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      <strong>Email:</strong> {branch.settings.effectiveEmail || 'Not set'}
                      {branch.email && (
                        <span className="text-green-600 ml-1">(override)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      <strong>Fiscal Year:</strong> Starts in {branch.settings.fiscalYearStart}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
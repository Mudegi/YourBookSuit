"use client";

import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface BranchPayload {
  code: string;
  name: string;
  type: string;
  prefix: string;
  city: string;
  country: string;
  isHeadquarters: boolean;
}

export default function NewBranchPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const [form, setForm] = useState<BranchPayload>({
    code: "",
    name: "",
    type: "OFFICE",
    prefix: "",
    city: "",
    country: "",
    isHeadquarters: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/${orgSlug}/branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create branch');
      }

      const newBranch = await response.json();
      setSuccess('Branch created successfully!');
      setTimeout(() => router.push(`/${orgSlug}/settings/branches`), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Branch</h1>
        <p className="text-gray-600 mt-1">Add a new branch scoped to this organization.</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Branch Details</CardTitle>
          <CardDescription>Branch access and data remain isolated to {orgSlug}.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Code</label>
              <input className="w-full border rounded px-3 py-2" value={form.code} onChange={(e)=>setForm(f=>({...f, code: e.target.value}))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input className="w-full border rounded px-3 py-2" value={form.name} onChange={(e)=>setForm(f=>({...f, name: e.target.value}))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Document Prefix</label>
              <input
                className="w-full border rounded px-3 py-2 uppercase"
                value={form.prefix}
                onChange={(e) => setForm(f => ({ ...f, prefix: e.target.value.toUpperCase() }))}
                placeholder="e.g. KLA"
                maxLength={6}
              />
              <p className="text-xs text-gray-400">Used in document numbers, e.g. KLA-INV-0001</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select className="w-full border rounded px-3 py-2" value={form.type} onChange={(e)=>setForm(f=>({...f, type: e.target.value}))}>
                <option value="OFFICE">Office</option>
                <option value="HEADQUARTERS">Headquarters</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="RETAIL_STORE">Retail Store</option>
                <option value="MANUFACTURING">Manufacturing</option>
                <option value="DISTRIBUTION_CENTER">Distribution Center</option>
                <option value="SERVICE_CENTER">Service Center</option>
                <option value="REMOTE">Remote</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">City</label>
                <input className="w-full border rounded px-3 py-2" value={form.city} onChange={(e)=>setForm(f=>({...f, city: e.target.value}))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Country</label>
                <input className="w-full border rounded px-3 py-2" value={form.country} onChange={(e)=>setForm(f=>({...f, country: e.target.value}))} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="hq" checked={form.isHeadquarters} onChange={(e)=>setForm(f=>({...f, isHeadquarters: e.target.checked}))} />
              <label htmlFor="hq" className="text-sm text-gray-700">Mark as Headquarters</label>
            </div>
            <div className="flex items-center space-x-2">
              <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
              <Button type="button" variant="ghost" onClick={()=>router.push(`/${orgSlug}/settings/branches`)}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

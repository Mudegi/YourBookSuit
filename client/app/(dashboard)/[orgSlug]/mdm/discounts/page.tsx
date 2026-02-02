"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import Loading from "@/components/ui/loading";

interface Discount {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  minPurchase?: number | null;
  maxDiscount?: number | null;
  validFrom: string;
  validTo: string;
  usageLimit?: number | null;
  usageCount: number;
  isActive: boolean;
}

export default function DiscountsPage({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT",
    value: 0,
    minPurchase: "",
    maxDiscount: "",
    validFrom: "",
    validTo: "",
    usageLimit: "",
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/mdm/discounts`);
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Failed to load discounts");
      setDiscounts(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load discounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug) load();
  }, [orgSlug]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);
    try {
      const payload: any = {
        ...form,
        value: Number(form.value),
        minPurchase: form.minPurchase ? Number(form.minPurchase) : null,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      };
      const res = await fetch(`/api/orgs/${orgSlug}/mdm/discounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Failed to create discount");
      setForm({ code: "", name: "", description: "", discountType: "PERCENTAGE", value: 0, minPurchase: "", maxDiscount: "", validFrom: "", validTo: "", usageLimit: "", isActive: true });
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create discount");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this discount?")) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/mdm/discounts/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || "Failed to delete");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete discount");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discounts</h1>
          <p className="text-gray-600 mt-1">Manage discount master data for {orgSlug}.</p>
        </div>
        <Link href={`/${orgSlug}/mdm`}><Button variant="ghost">Back to MDM</Button></Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {actionError && <Alert variant="error">{actionError}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>New Discount</CardTitle>
          <CardDescription>Create a discount scoped to this organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Code</label>
              <input className="w-full border rounded px-3 py-2" value={form.code} onChange={(e)=>setForm(f=>({...f, code: e.target.value}))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input className="w-full border rounded px-3 py-2" value={form.name} onChange={(e)=>setForm(f=>({...f, name: e.target.value}))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select className="w-full border rounded px-3 py-2" value={form.discountType} onChange={(e)=>setForm(f=>({...f, discountType: e.target.value as any}))}>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_AMOUNT">Fixed Amount</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Value</label>
              <input type="number" step="0.01" className="w-full border rounded px-3 py-2" value={form.value} onChange={(e)=>setForm(f=>({...f, value: Number(e.target.value)}))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Min Purchase</label>
              <input type="number" step="0.01" className="w-full border rounded px-3 py-2" value={form.minPurchase} onChange={(e)=>setForm(f=>({...f, minPurchase: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Max Discount</label>
              <input type="number" step="0.01" className="w-full border rounded px-3 py-2" value={form.maxDiscount} onChange={(e)=>setForm(f=>({...f, maxDiscount: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Valid From</label>
              <input type="date" className="w-full border rounded px-3 py-2" value={form.validFrom} onChange={(e)=>setForm(f=>({...f, validFrom: e.target.value}))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Valid To</label>
              <input type="date" className="w-full border rounded px-3 py-2" value={form.validTo} onChange={(e)=>setForm(f=>({...f, validTo: e.target.value}))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Usage Limit</label>
              <input type="number" className="w-full border rounded px-3 py-2" value={form.usageLimit} onChange={(e)=>setForm(f=>({...f, usageLimit: e.target.value}))} />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="active" checked={form.isActive} onChange={(e)=>setForm(f=>({...f, isActive: e.target.checked}))} />
              <label htmlFor="active" className="text-sm text-gray-700">Active</label>
            </div>
            <div className="md:col-span-2 flex items-center space-x-2">
              <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
              <Button type="button" variant="ghost" onClick={()=>setForm({ code: "", name: "", description: "", discountType: "PERCENTAGE", value: 0, minPurchase: "", maxDiscount: "", validFrom: "", validTo: "", usageLimit: "", isActive: true })}>Reset</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discount Library</CardTitle>
          <CardDescription>All discounts scoped to this organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-3 py-2">Code</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Value</th>
                  <th className="text-left px-3 py-2">Valid</th>
                  <th className="text-left px-3 py-2">Active</th>
                  <th className="text-left px-3 py-2">Usage</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {discounts.map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 font-semibold">{d.code}</td>
                    <td className="px-3 py-2">{d.name}</td>
                    <td className="px-3 py-2">{d.discountType}</td>
                    <td className="px-3 py-2">{d.discountType === "PERCENTAGE" ? `${d.value}%` : d.value}</td>
                    <td className="px-3 py-2">{new Date(d.validFrom).toLocaleDateString()} – {new Date(d.validTo).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{d.isActive ? "Yes" : "No"}</td>
                    <td className="px-3 py-2">{d.usageCount}{d.usageLimit ? ` / ${d.usageLimit}` : ""}</td>
                    <td className="px-3 py-2 space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleDelete(d.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
                {discounts.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-gray-500" colSpan={8}>No discounts yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

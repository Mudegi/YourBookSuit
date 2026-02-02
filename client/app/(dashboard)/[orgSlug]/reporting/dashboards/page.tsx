"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import Loading from "@/components/ui/loading";
import { BarChart3, LayoutGrid, PlusCircle, Shield, Users, ExternalLink } from "lucide-react";

interface DashboardWidget {
  id: string;
  title: string;
  widgetType: string;
  position: Record<string, any>;
  config: Record<string, any>;
  report?: {
    name: string;
    reportType: string;
  } | null;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: string;
  createdBy?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  widgets: DashboardWidget[];
}

export default function DashboardsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    isDefault: false,
    isPublic: false,
  });

  const sanitizeError = (raw: unknown) => {
    const msg = raw instanceof Error ? raw.message : String(raw || "Unexpected error");
    if (msg.startsWith("<!DOCTYPE")) return "Authentication required or session expired. Please sign in and retry.";
    return msg;
  };

    const parseJson = async (res: Response) => {
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (err) {
        throw new Error(text.slice(0, 200) || "Unexpected non-JSON response");
      }
    };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
        const res = await fetch(`/api/${orgSlug}/reporting/dashboards`);
        const data = await parseJson(res);
      if (!res.ok || data.success === false) throw new Error(data.error || "Failed to load dashboards");
      setDashboards(data.data || []);
    } catch (err) {
      setError(sanitizeError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug) load();
  }, [orgSlug]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        layout: { version: 1, widgets: [] },
        isDefault: form.isDefault,
        isPublic: form.isPublic,
      };
      const res = await fetch(`/api/${orgSlug}/reporting/dashboards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJson(res);
      if (!res.ok || data.success === false) throw new Error(data.error || "Failed to create dashboard");
      setForm({ name: "", description: "", isDefault: false, isPublic: false });
      await load();
    } catch (err) {
      setError(sanitizeError(err));
    } finally {
      setCreating(false);
    }
  };

  const defaultCount = dashboards.filter((d) => d.isDefault).length;
  const publicCount = dashboards.filter((d) => d.isPublic).length;

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
          <p className="text-gray-600 mt-1">Track KPIs and financial health across your organization.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/reports`}><Button variant="outline">Reports</Button></Link>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total dashboards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboards.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Default</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{defaultCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Public</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{publicCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="w-4 h-4" />Create dashboard</CardTitle>
          <CardDescription>Saved dashboards are persisted via the reporting API.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input className="w-full border rounded px-3 py-2" value={form.name} onChange={(e)=>setForm(f=>({...f, name: e.target.value}))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <input className="w-full border rounded px-3 py-2" value={form.description} onChange={(e)=>setForm(f=>({...f, description: e.target.value}))} />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={(e)=>setForm(f=>({...f, isDefault: e.target.checked}))} />
              <label htmlFor="isDefault" className="text-sm text-gray-700">Mark as default</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="isPublic" checked={form.isPublic} onChange={(e)=>setForm(f=>({...f, isPublic: e.target.checked}))} />
              <label htmlFor="isPublic" className="text-sm text-gray-700">Make public</label>
            </div>
            <div className="md:col-span-2 flex items-center space-x-2">
              <Button type="submit" disabled={creating}>{creating ? "Saving..." : "Save dashboard"}</Button>
              <Button type="button" variant="ghost" onClick={()=>setForm({ name: "", description: "", isDefault: false, isPublic: false })}>Reset</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" />Dashboard library</CardTitle>
          <CardDescription>Live data from /api/{orgSlug}/reporting/dashboards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dashboards.length === 0 ? (
            <div className="text-sm text-gray-600">No dashboards yet. Create one above.</div>
          ) : (
            <div className="space-y-4">
              {dashboards.map((d) => (
                <div key={d.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{d.name}</span>
                        {d.isDefault && <Badge variant="secondary">Default</Badge>}
                        {d.isPublic && <Badge variant="outline" className="text-emerald-700 border-emerald-200">Public</Badge>}
                      </div>
                      {d.description && <p className="text-sm text-gray-600">{d.description}</p>}
                      <p className="text-xs text-gray-500">Created {new Date(d.createdAt).toLocaleDateString()} {d.createdBy?.email ? `by ${d.createdBy.email}` : ""}</p>
                    </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                      <BarChart3 className="w-4 h-4" />
                      <span>{d.widgets.length} widgets</span>
                      <Shield className="w-4 h-4 ml-2" />
                      <span>{d.isPublic ? "Org + public" : "Org only"}</span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/${orgSlug}/reporting/dashboards/${d.id}`}><Button size="sm" variant="outline"><ExternalLink className="w-3 h-3 mr-1" />Manage</Button></Link>
                    </div>
                  </div>

                  {d.widgets.length > 0 ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {d.widgets.map((w) => (
                        <div key={w.id} className="border border-gray-100 rounded-md p-3 text-sm bg-gray-50">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900">{w.title}</span>
                            <Badge variant="outline" className="text-xs">{w.widgetType}</Badge>
                          </div>
                          {w.report?.name && <p className="text-xs text-gray-600 mt-1">Report: {w.report.name} ({w.report.reportType})</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 mt-3">No widgets defined yet.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import Loading from "@/components/ui/loading";
import { BarChart3, ChevronLeft, PlusCircle, Shield, Users } from "lucide-react";

interface DashboardWidget {
  id: string;
  title: string;
  widgetType: string;
  refreshInterval?: number | null;
  report?: { name: string; reportType: string } | null;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: string;
  createdBy?: { email?: string | null } | null;
  widgets: DashboardWidget[];
}

export default function DashboardDetailPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const dashboardId = params?.dashboardId as string;

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    widgetType: "KPI",
    reportId: "",
    refreshInterval: "",
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
    } catch {
      throw new Error(text.slice(0, 200) || "Unexpected non-JSON response");
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/${orgSlug}/reporting/dashboards/${dashboardId}`);
      const data = await parseJson(res);
      if (!res.ok || data.success === false) throw new Error(data.error || "Failed to load dashboard");
      setDashboard(data.data);
    } catch (err) {
      setError(sanitizeError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug && dashboardId) load();
  }, [orgSlug, dashboardId]);

  const handleAddWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        widgetType: form.widgetType,
        reportId: form.reportId.trim() || undefined,
        refreshInterval: form.refreshInterval ? Number(form.refreshInterval) : undefined,
        position: { x: 0, y: 0, w: 4, h: 2 },
        config: {},
      };
      const res = await fetch(`/api/${orgSlug}/reporting/dashboards/${dashboardId}/widgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJson(res);
      if (!res.ok || data.success === false) throw new Error(data.error || "Failed to add widget");
      setForm({ title: "", widgetType: "KPI", reportId: "", refreshInterval: "" });
      await load();
    } catch (err) {
      setError(sanitizeError(err));
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Loading />;
  if (!dashboard) return <div className="text-sm text-red-600">Dashboard not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/${orgSlug}/reporting/dashboards`}><Button variant="ghost" size="sm"><ChevronLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          <h1 className="text-2xl font-bold text-gray-900">{dashboard.name}</h1>
          {dashboard.isDefault && <Badge variant="secondary">Default</Badge>}
          {dashboard.isPublic && <Badge variant="outline" className="text-emerald-700 border-emerald-200">Public</Badge>}
        </div>
        <div className="text-xs text-gray-600">Created {new Date(dashboard.createdAt).toLocaleDateString()} {dashboard.createdBy?.email ? `by ${dashboard.createdBy.email}` : ""}</div>
      </div>

      {dashboard.description && <p className="text-gray-700">{dashboard.description}</p>}
      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="w-4 h-4" />Add widget</CardTitle>
          <CardDescription>Create a widget on this dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAddWidget}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Title</label>
              <input className="w-full border rounded px-3 py-2" value={form.title} onChange={(e)=>setForm(f=>({...f, title: e.target.value}))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select className="w-full border rounded px-3 py-2" value={form.widgetType} onChange={(e)=>setForm(f=>({...f, widgetType: e.target.value}))}>
                <option value="KPI">KPI</option>
                <option value="TABLE">Table</option>
                <option value="CHART">Chart</option>
                <option value="TEXT">Text</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Report ID (optional)</label>
              <input className="w-full border rounded px-3 py-2" value={form.reportId} onChange={(e)=>setForm(f=>({...f, reportId: e.target.value}))} placeholder="link to a Report.id" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Refresh interval (seconds, optional)</label>
              <input type="number" className="w-full border rounded px-3 py-2" value={form.refreshInterval} onChange={(e)=>setForm(f=>({...f, refreshInterval: e.target.value}))} />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <Button type="submit" disabled={creating}>{creating ? "Saving..." : "Save widget"}</Button>
              <Button type="button" variant="ghost" onClick={()=>setForm({ title: "", widgetType: "KPI", reportId: "", refreshInterval: "" })}>Reset</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />Widgets</CardTitle>
          <CardDescription>Existing widgets on this dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dashboard.widgets.length === 0 ? (
            <p className="text-sm text-gray-600">No widgets yet.</p>
          ) : (
            dashboard.widgets.map((w) => (
              <div key={w.id} className="border border-gray-200 rounded-lg p-3 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold text-gray-900">{w.title}</span>
                    <Badge variant="outline" className="text-xs">{w.widgetType}</Badge>
                  </div>
                  {w.report?.name && <p className="text-xs text-gray-600">Report: {w.report.name} ({w.report.reportType})</p>}
                  {w.refreshInterval && <p className="text-xs text-gray-600">Refresh: {w.refreshInterval}s</p>}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

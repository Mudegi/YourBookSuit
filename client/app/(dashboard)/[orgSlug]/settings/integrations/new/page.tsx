"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

interface IntegrationPayload {
  name: string;
  provider: string;
  apiKey: string;
  webhookUrl: string;
  description?: string;
}

export default function NewIntegrationPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const [form, setForm] = useState<IntegrationPayload>({ name: "", provider: "", apiKey: "", webhookUrl: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      // Placeholder endpoint until backend is wired; store intent locally
      console.info("Integration submission", { orgSlug, form });
      setSuccess("Integration saved locally. Wire backend API to persist.");
      setTimeout(() => router.push(`/${orgSlug}/settings/integrations`), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save integration");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Integration</h1>
        <p className="text-gray-600 mt-1">Connect external providers securely within this organization.</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Provider Details</CardTitle>
          <CardDescription>Choose the provider and supply credentials. Permissions remain scoped to this org.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="e.g. Stripe Sandbox"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Provider</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.provider}
                onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                required
              >
                <option value="">Select a provider</option>
                <option value="stripe">Stripe</option>
                <option value="quickbooks">QuickBooks Online</option>
                <option value="xero">Xero"</option>
                <option value="bank">Bank Feed (Plaid/Yodlee)</option>
                <option value="custom">Custom Webhook</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">API Key</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Paste API key"
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Webhook URL</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="https://"
                value={form.webhookUrl}
                onChange={(e) => setForm((f) => ({ ...f, webhookUrl: e.target.value }))}
              />
              <p className="text-xs text-gray-500">Optional for providers that push events.</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                placeholder="Usage notes, environment, scopes"
                value={form.description || ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
              <Button type="button" variant="ghost" onClick={() => router.push(`/${orgSlug}/settings/integrations`)}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supported Categories</CardTitle>
          <CardDescription>These examples help pick the right provider; actual connectivity depends on credentials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Payments</Badge>
            <Badge variant="warning">Bank Feeds</Badge>
            <Badge variant="default">Accounting</Badge>
            <Badge variant="outline">Custom Webhooks</Badge>
          </div>
          <p className="text-sm text-gray-600">All integrations remain scoped to {orgSlug}; no data crosses organizations.</p>
        </CardContent>
      </Card>
    </div>
  );
}

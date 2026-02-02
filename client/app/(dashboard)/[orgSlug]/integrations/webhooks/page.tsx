"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plug, Shield } from "lucide-react";

export default function WebhooksPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-gray-600 mt-1">Publish outbound events to your systems or third-party services.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/integrations`}><Button variant="outline">Integrations</Button></Link>
          <Link href={`/${orgSlug}/settings/integrations/new`}><Button>Add Webhook Integration</Button></Link>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Plug className="w-4 h-4" />Available via Integrations</CardTitle>
            <CardDescription>Manage webhook endpoints inside each integration. This page is a shortcut entry point.</CardDescription>
          </div>
          <Link href={`/${orgSlug}/settings/integrations`}><Button variant="secondary" size="sm">Open Integrations</Button></Link>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>Choose an integration, then use its Manage view to configure webhook URLs, secrets, and retry settings.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Create a Custom Webhook integration to register arbitrary endpoints.</li>
            <li>Use provider-specific integrations (e.g., payment gateways) to receive signed events.</li>
            <li>Each webhook inherits the org context; keep secrets rotated via the integration settings.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4" />Security & Delivery</CardTitle>
          <CardDescription>Recommendations to keep deliveries reliable and verifiable.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-gray-500" />
            <p>Verify HMAC signatures on each request using the shared webhook secret configured per integration.</p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-gray-500" />
            <p>Return 2xx responses quickly; defer slow work to background jobs to avoid retries.</p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-gray-500" />
            <p>Monitor delivery health from the integration detail view (errors and retry counts).</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

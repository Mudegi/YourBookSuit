"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, PlusCircle, Workflow } from "lucide-react";

export default function WorkflowDesignerPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Designer</h1>
          <p className="text-gray-600 mt-1">Model and automate approval paths, notifications, and tasks.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${orgSlug}/workflows/approvals`}><Button variant="outline">Approval Inbox</Button></Link>
          <Button disabled><PlusCircle className="w-4 h-4 mr-2" />New Workflow</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GitBranch className="w-4 h-4" />Canvas coming soon</CardTitle>
          <CardDescription>Blueprint for drag-and-drop workflow authoring.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>This placeholder confirms the route exists. Future implementation will include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Stage-based designer with approvals, notifications, and conditional branches.</li>
            <li>Trigger library (document events, data changes, schedules) with per-org RBAC enforcement.</li>
            <li>Publish/draft versioning and audit history for workflow edits.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Workflow className="w-4 h-4" />Existing workflows</CardTitle>
          <CardDescription>Once available, saved workflows will list here.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-700">
          <p>No workflows yet. Use "New Workflow" to start when the designer is enabled.</p>
        </CardContent>
      </Card>
    </div>
  );
}

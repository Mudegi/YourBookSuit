import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsIndexPage({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;
  const sections = [
    { title: "Branches", description: "Manage organizational branches and headquarters.", href: `/${orgSlug}/settings/branches` },
    { title: "Taxes", description: "Configure tax agencies, rates, and groups for compliance.", href: `/${orgSlug}/settings/taxes` },
    { title: "Integrations", description: "Connect external providers (payments, bank feeds, accounting).", href: `/${orgSlug}/settings/integrations` },
    { title: "Users & Roles", description: "Invite members and manage RBAC roles and permissions.", href: `/${orgSlug}/settings/users` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Organization-scoped settings for {orgSlug}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.href}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={section.href}>
                <Button variant="outline">Open</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

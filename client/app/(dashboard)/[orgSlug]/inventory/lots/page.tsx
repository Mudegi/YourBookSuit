import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InventoryLotsPage({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Lots</h1>
          <p className="text-gray-600 mt-1">Track lot/serial details for {orgSlug}.</p>
        </div>
        <Link href={`/${orgSlug}/inventory`}><Button variant="ghost">Back to Inventory</Button></Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lots</CardTitle>
          <CardDescription>Placeholder — connect to /api/orgs/{orgSlug}/inventory/lots to list lots/serials.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">No lots loaded. Add API wiring to surface real data.</p>
        </CardContent>
      </Card>
    </div>
  );
}

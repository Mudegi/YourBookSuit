import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InventoryValuationsPage({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Valuations</h1>
          <p className="text-gray-600 mt-1">Track valuation snapshots for {orgSlug}.</p>
        </div>
        <Link href={`/${orgSlug}/inventory`}><Button variant="ghost">Back to Inventory</Button></Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Valuation Snapshots</CardTitle>
          <CardDescription>Placeholder view — wire to backend valuations API to list snapshots.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">No valuations yet. Implement /api/orgs/{orgSlug}/inventory/valuations to populate.</p>
        </CardContent>
      </Card>
    </div>
  );
}

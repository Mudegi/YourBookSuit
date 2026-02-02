import { NextRequest, NextResponse } from "next/server";

// Roles system has been removed - returning empty response for backward compatibility
export async function GET(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  return NextResponse.json({ success: true, data: [] });
}

export async function POST(request: NextRequest, { params }: { params: { orgSlug: string } }) {
  return NextResponse.json({ error: "Roles system has been removed" }, { status: 410 });
}

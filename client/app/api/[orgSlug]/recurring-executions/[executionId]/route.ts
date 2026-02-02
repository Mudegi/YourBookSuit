import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { orgSlug: string; executionId: string } }) {
  try {
    const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    const exec = await prisma.recurringExecution.findUnique({ where: { id: params.executionId } });
    if (!exec || exec.organizationId !== org.id) return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    const tpl = await prisma.recurringTemplate.findUnique({ where: { id: exec.templateId } });
    return NextResponse.json({ execution: exec, template: tpl });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

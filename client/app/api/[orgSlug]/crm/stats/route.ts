import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

// GET /api/[orgSlug]/crm/stats — CRM dashboard stats
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { org } = await requireOrgMembership(user.id, params.orgSlug);

    const [
      totalCompanies,
      byStage,
      recentActivities,
      openTasks,
      pipelineValue,
    ] = await Promise.all([
      prisma.company.count({ where: { organizationId: org.id } }),
      prisma.company.groupBy({
        by: ['lifecycleStage'],
        where: { organizationId: org.id },
        _count: true,
      }),
      prisma.activity.findMany({
        where: { organizationId: org.id },
        include: {
          company: { select: { id: true, name: true } },
          createdByUser: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.crmTask.count({
        where: { organizationId: org.id, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      prisma.opportunity.aggregate({
        where: { organizationId: org.id, stage: { notIn: ['WON', 'LOST'] } },
        _sum: { value: true },
        _count: true,
      }),
    ]);

    const stageMap = byStage.reduce(
      (acc, s) => {
        acc[s.lifecycleStage] = s._count;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        totalCompanies,
        leads: stageMap['LEAD'] || 0,
        prospects: stageMap['PROSPECT'] || 0,
        customers: stageMap['CUSTOMER'] || 0,
        dormant: stageMap['DORMANT'] || 0,
        openTasks,
        pipelineValue: Number(pipelineValue._sum.value || 0),
        pipelineDeals: pipelineValue._count,
        recentActivities,
      },
    });
  } catch (error) {
    console.error('CRM stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch CRM stats' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userOrg = await prisma.organizationUser.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    });

    if (!userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const { billingCycle, paymentMethod, mobileProvider, mobileNumber } = body;

    if (!billingCycle || !paymentMethod) {
      return NextResponse.json(
        { error: 'Billing cycle and payment method are required' },
        { status: 400 }
      );
    }

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 7); // 7-day trial

    // Calculate subscription end based on billing cycle
    const subscriptionEnd = new Date(now);
    if (billingCycle === 'annual') {
      subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
    } else {
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
    }

    // Both methods start with a 7-day free trial (status = TRIAL).
    // - Flutterwave: payment details are recorded; after the trial (or upon
    //   webhook/admin confirmation) the status can be flipped to ACTIVE.
    // - Mobile Money: admin manually approves once payment is confirmed,
    //   setting status to ACTIVE.
    //
    // When the trial ends without activation the dashboard blocks access.

    const updatedOrg = await prisma.organization.update({
      where: { id: userOrg.organizationId },
      data: {
        onboardingCompleted: true,
        subscriptionStatus: 'TRIAL',
        trialStartDate: now,
        trialEndDate: trialEnd,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
      },
    });

    // Log payment attempt for admin visibility
    console.log('[Payment]', {
      orgId: userOrg.organizationId,
      orgName: userOrg.organization.name,
      billingCycle,
      paymentMethod,
      status: 'TRIAL',
      ...(paymentMethod === 'mobile_money' && { mobileProvider, mobileNumber }),
    });

    return NextResponse.json({
      success: true,
      message: 'Your 7-day free trial has started! Enjoy full access to YourBooks.',
      data: {
        subscriptionStatus: updatedOrg.subscriptionStatus,
        trialEndDate: updatedOrg.trialEndDate,
        subscriptionEndDate: updatedOrg.subscriptionEndDate,
      },
    });
  } catch (error: any) {
    console.error('Payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment processing failed' },
      { status: 500 }
    );
  }
}

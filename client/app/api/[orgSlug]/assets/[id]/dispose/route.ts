/**
 * API: Asset Disposal
 * POST /api/[orgSlug]/assets/[id]/dispose - Record asset disposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateDisposalGainLoss } from '@/lib/depreciation-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const payload = await verifyAuth(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      disposalDate,
      disposalMethod,
      disposalPrice = 0,
      buyer,
      buyerTIN,
      disposalInvoiceNo,
      reason,
      notes,
      autoPost = false,
    } = body;

    // Validation
    if (!disposalDate || !disposalMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: disposalDate, disposalMethod' },
        { status: 400 }
      );
    }

    const asset = await prisma.asset.findFirst({
      where: {
        id: params.id,
        organizationId: organization.id,
      },
      include: {
        category: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    if (asset.status === 'DISPOSED') {
      return NextResponse.json({ error: 'Asset already disposed' }, { status: 400 });
    }

    // Calculate gain/loss
    const { gainLoss, gainLossType } = calculateDisposalGainLoss(
      disposalPrice,
      asset.currentBookValue
    );

    // Create disposal record
    const disposal = await prisma.assetDisposal.create({
      data: {
        assetId: asset.id,
        organizationId: organization.id,
        disposalDate: new Date(disposalDate),
        disposalMethod,
        disposalPrice,
        costAtDisposal: asset.purchasePrice,
        accDepAtDisposal: asset.accumulatedDepreciation,
        bookValueAtDisposal: asset.currentBookValue,
        gainLoss,
        gainLossType,
        buyer,
        buyerTIN,
        disposalInvoiceNo,
        reason,
        notes,
        posted: false,
        createdBy: payload.userId,
      },
    });

    // Update asset status
    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        status: 'DISPOSED',
        disposalDate: new Date(disposalDate),
        disposalMethod,
        disposalPrice,
      },
    });

    // Auto-post to GL if requested
    let transaction = null;
    if (autoPost) {
      try {
        // Create disposal journal entry
        // Dr. Cash/Receivable (disposal price)
        // Dr. Accumulated Depreciation (accumulated)
        // Dr/Cr. Gain/Loss on Disposal (difference)
        // Cr. Asset (original cost)

        transaction = await prisma.transaction.create({
          data: {
            organizationId: organization.id,
            transactionNumber: `DSP-${new Date().getFullYear()}-${Date.now()}`,
            transactionDate: new Date(disposalDate),
            description: `Disposal of ${asset.name} (${asset.assetNumber})`,
            reference: `DISPOSAL-${asset.assetNumber}`,
            transactionType: 'JOURNAL',
            fiscalYear: new Date(disposalDate).getFullYear(),
            fiscalPeriod: new Date(disposalDate).getMonth() + 1,
            posted: true,
            postedBy: payload.userId,
            postedDate: new Date(),
            createdBy: payload.userId,
            entries: {
              create: [
                // Dr. Cash (if sold)
                ...(disposalPrice > 0
                  ? [
                      {
                        accountId: asset.category.assetAccountId, // Temporary - should be Cash account
                        debit: disposalPrice,
                        credit: 0,
                        description: `Cash from disposal of ${asset.name}`,
                      },
                    ]
                  : []),
                // Dr. Accumulated Depreciation
                {
                  accountId: asset.category.depreciationAccountId,
                  debit: asset.accumulatedDepreciation,
                  credit: 0,
                  description: `Clear accumulated depreciation - ${asset.name}`,
                },
                // Dr/Cr. Gain/Loss
                ...(gainLoss !== 0
                  ? [
                      {
                        accountId: asset.category.expenseAccountId, // Should be Gain/Loss account
                        debit: gainLossType === 'LOSS' ? Math.abs(gainLoss) : 0,
                        credit: gainLossType === 'GAIN' ? gainLoss : 0,
                        description: `${gainLossType} on disposal of ${asset.name}`,
                      },
                    ]
                  : []),
                // Cr. Asset
                {
                  accountId: asset.category.assetAccountId,
                  debit: 0,
                  credit: asset.purchasePrice,
                  description: `Remove ${asset.name} from assets`,
                },
              ],
            },
          },
          include: {
            entries: {
              include: {
                account: true,
              },
            },
          },
        });

        // Update disposal record
        await prisma.assetDisposal.update({
          where: { id: disposal.id },
          data: {
            posted: true,
            transactionId: transaction.id,
            postedDate: new Date(),
            postedBy: payload.userId,
          },
        });
      } catch (error: any) {
        console.error('Error posting disposal to GL:', error);
        // Continue - disposal recorded but not posted
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        disposal,
        transaction,
        summary: {
          originalCost: asset.purchasePrice,
          accumulatedDepreciation: asset.accumulatedDepreciation,
          bookValue: asset.currentBookValue,
          disposalPrice,
          gainLoss,
          gainLossType,
          posted: autoPost && transaction !== null,
        },
      },
    });
  } catch (error: any) {
    console.error('Error recording disposal:', error);
    return NextResponse.json(
      { error: 'Failed to record disposal', details: error.message },
      { status: 500 }
    );
  }
}

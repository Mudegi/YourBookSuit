import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// Levenshtein distance for fuzzy string matching
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = Array.from({ length: len1 + 1 }, () =>
    Array(len2 + 1).fill(0)
  );

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

// Calculate similarity score (0-100)
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLen = Math.max(str1.length, str2.length);
  return Math.max(0, ((maxLen - distance) / maxLen) * 100);
}

// Auto-match bank transactions to payments
async function matchBankTransactions(orgId: string) {
  const matches: Array<{
    bankTransactionId: string;
    paymentId: string;
    confidenceScore: number;
  }> = [];

  // Get unmatched bank transactions
  const unmatched = await prisma.bankTransaction.findMany({
    where: {
      organizationId: orgId,
      status: 'PENDING',
      matchedPaymentId: null,
    },
  });

  // Get all payments for potential matching
  const payments = await prisma.payment.findMany({
    where: { organizationId: orgId },
    include: { customer: true, vendor: true },
  });

  // Attempt to match each bank transaction
  for (const txn of unmatched) {
    let bestMatch = {
      paymentId: '',
      score: 0,
    };

    for (const payment of payments) {
      let score = 0;

      // Amount matching (exact or within 1% tolerance)
      const amountDiff = Math.abs(
        Number(txn.amount) - Number(payment.amount)
      );
      const percentDiff = (amountDiff / Number(payment.amount)) * 100;
      if (percentDiff <= 1) {
        score += 50;
      } else if (percentDiff <= 5) {
        score += 25;
      }

      // Date matching (within 3 days)
      const daysDiff = Math.abs(
        (txn.transactionDate.getTime() - payment.paymentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 1) {
        score += 30;
      } else if (daysDiff <= 3) {
        score += 15;
      }

      // Reference number matching
      if (txn.referenceNo && payment.referenceNumber) {
        if (txn.referenceNo === payment.referenceNumber) {
          score += 100; // Perfect match
        } else {
          const refSimilarity = calculateSimilarity(
            txn.referenceNo,
            payment.referenceNumber
          );
          score += (refSimilarity / 100) * 20;
        }
      }

      // Description/payee matching
      if (txn.payee) {
        const payeeCandidate = payment.customer?.firstName ||
          payment.vendor?.firstName ||
          '';
        const descSimilarity = calculateSimilarity(txn.payee, payeeCandidate);
        score += (descSimilarity / 100) * 20;
      }

      if (score > bestMatch.score) {
        bestMatch = { paymentId: payment.id, score };
      }
    }

    // Only match if confidence > 60%
    if (bestMatch.score >= 60) {
      matches.push({
        bankTransactionId: txn.id,
        paymentId: bestMatch.paymentId,
        confidenceScore: bestMatch.score,
      });
    }
  }

  return matches;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireOrgMembership(user.id, params.orgSlug);

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await req.json();
    const { bankFeedId } = body;

    if (!bankFeedId) {
      return NextResponse.json(
        { error: 'bankFeedId required' },
        { status: 400 }
      );
    }

    // Verify bank feed belongs to org
    const bankFeed = await prisma.bankFeed.findUnique({
      where: { id: bankFeedId },
    });
    if (!bankFeed || bankFeed.organizationId !== org.id) {
      return NextResponse.json(
        { error: 'Bank feed not found' },
        { status: 404 }
      );
    }

    // Perform auto-matching
    const matches = await matchBankTransactions(org.id);

    // Apply matches
    let matchedCount = 0;
    for (const match of matches) {
      if (match.bankTransactionId) {
        await prisma.bankTransaction.update({
          where: { id: match.bankTransactionId },
          data: {
            matchedPaymentId: match.paymentId,
            confidenceScore: new Decimal(match.confidenceScore),
            status: 'MATCHED',
          },
        });
        matchedCount++;
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'BANK_FEED_MATCHING',
        entityId: bankFeedId,
        changes: {
          matchedTransactions: matchedCount,
          totalMatches: matches.length,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      matchedCount,
      totalMatches: matches.length,
      matches,
    });
  } catch (error) {
    console.error('Bank transaction matching error:', error);
    return NextResponse.json(
      { error: 'Matching failed' },
      { status: 500 }
    );
  }
}

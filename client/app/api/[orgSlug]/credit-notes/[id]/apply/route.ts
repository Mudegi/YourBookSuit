import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST /api/[orgSlug]/credit-notes/[id]/apply - Apply credit note to invoices
export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string; id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { applications } = body; // Array of { invoiceId, amount }

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    // Get credit note
    const creditNote = await prisma.creditNote.findFirst({
      where: {
        id: params.id,
        organizationId: org.id,
      },
    });

    if (!creditNote) {
      return NextResponse.json({ success: false, error: 'Credit note not found' }, { status: 404 });
    }

    if (creditNote.status !== 'APPROVED' && creditNote.status !== 'PARTIALLY_APPLIED') {
      return NextResponse.json(
        { success: false, error: 'Credit note must be approved before applying' },
        { status: 400 }
      );
    }

    // Calculate total application amount
    const totalApplicationAmount = applications.reduce(
      (sum: number, app: any) => sum + parseFloat(app.amount),
      0
    );

    if (totalApplicationAmount > creditNote.remainingAmount) {
      return NextResponse.json(
        { success: false, error: 'Application amount exceeds remaining credit balance' },
        { status: 400 }
      );
    }

    // Create applications and update invoices
    const createdApplications = [];

    for (const app of applications) {
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: app.invoiceId,
          organizationId: org.id,
        },
      });

      if (!invoice) {
        return NextResponse.json(
          { success: false, error: `Invoice ${app.invoiceId} not found` },
          { status: 404 }
        );
      }

      if (parseFloat(app.amount.toString()) > invoice.amountDue) {
        return NextResponse.json(
          { success: false, error: `Application amount exceeds invoice balance for ${invoice.invoiceNumber}` },
          { status: 400 }
        );
      }

      // Create credit note application
      const application = await prisma.creditNoteApplication.create({
        data: {
          creditNoteId: params.id,
          invoiceId: app.invoiceId,
          amount: parseFloat(app.amount),
          appliedBy: user.id,
          notes: app.notes || undefined,
        },
      });

      createdApplications.push(application);

      // Update invoice amounts
      const newAmountDue = invoice.amountDue - parseFloat(app.amount);
      const newAmountPaid = invoice.amountPaid + parseFloat(app.amount);

      let newStatus = invoice.status;
      if (newAmountDue === 0) {
        newStatus = 'PAID';
      } else if (newAmountPaid > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      await prisma.invoice.update({
        where: { id: app.invoiceId },
        data: {
          amountDue: newAmountDue,
          amountPaid: newAmountPaid,
          status: newStatus,
        },
      });
    }

    // Update credit note
    const newAppliedAmount = creditNote.appliedAmount + totalApplicationAmount;
    const newRemainingAmount = creditNote.remainingAmount - totalApplicationAmount;

    let newStatus: any = 'PARTIALLY_APPLIED';
    if (newRemainingAmount === 0) {
      newStatus = 'APPLIED';
    }

    const updatedNote = await prisma.creditNote.update({
      where: { id: params.id },
      data: {
        appliedAmount: newAppliedAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus,
      },
      include: {
        applications: {
          include: {
            invoice: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        creditNote: updatedNote,
        applications: createdApplications,
      },
      message: 'Credit note applied successfully',
    });
  } catch (error: any) {
    console.error('Error applying credit note:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to apply credit note' },
      { status: 500 }
    );
  }
}

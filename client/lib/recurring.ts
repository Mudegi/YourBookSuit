import { prisma } from '@/lib/prisma';
import { addDays, addMonths, addQuarters, addYears } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { enqueueNotification } from '@/lib/notifications';

// Compute nextRunAt based on template frequency and parameters
export function computeNextRunAt(template: any): Date | null {
  const now = new Date();
  const tz = template.timezone || 'UTC';
  const start = template.startDate ? new Date(template.startDate) : now;
  const end = template.endDate ? new Date(template.endDate) : undefined;

  const base = start > now ? start : now;
  let next: Date | null = null;

  switch (template.frequency) {
    case 'DAILY':
      next = addDays(base, 1);
      break;
    case 'WEEKLY': {
      const weekday = Number(template.weekday ?? 0);
      const b = toZonedTime(base, tz);
      const diff = (7 + weekday - b.getDay()) % 7;
      next = addDays(base, diff === 0 ? 7 : diff);
      break;
    }
    case 'MONTHLY': {
      const dom = Number(template.dayOfMonth ?? 1);
      const candidate = new Date(base);
      candidate.setDate(dom);
      if (candidate <= base) {
        next = addMonths(candidate, 1);
      } else {
        next = candidate;
      }
      break;
    }
    case 'QUARTERLY':
      next = addQuarters(base, 1);
      break;
    case 'YEARLY':
      next = addYears(base, 1);
      break;
    case 'CUSTOM_CRON':
      // Cron support can be added later; leave null for manual scheduler
      next = null;
      break;
    default:
      next = null;
  }

  if (end && next && next > end) return null;
  return next;
}

// Execute a template and create corresponding domain entity
export async function executeTemplate(opts: {
  orgId: string;
  templateId: string;
  userId?: string;
}): Promise<any> {
  const { orgId, templateId, userId } = opts;

  const template = await prisma.recurringTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error('Template not found');
  if (template.organizationId !== orgId) throw new Error('Template not in organization');

  // Fetch organization base currency
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { baseCurrency: true },
  });
  const baseCurrency = org?.baseCurrency || 'USD';

  const runAt = new Date();
  const payload = template.payload as any;

  // Create execution record first (PENDING)
  let execution = await prisma.recurringExecution.create({
    data: {
      organizationId: orgId,
      templateId: template.id,
      runAt,
      status: 'PENDING',
      attempt: 1,
      payloadSnapshot: template.payload,
      createdById: userId,
    },
  });

  try {
    let resultRef: { transactionId?: string; invoiceId?: string; billId?: string; paymentId?: string } = {};

    switch (template.templateType) {
      case 'JOURNAL_ENTRY': {
        // Expect payload to include transaction fields and ledgerEntries
        const txData = payload?.transaction;
        const entries = payload?.ledgerEntries || [];
        if (!txData || !entries?.length) throw new Error('Invalid journal payload');

        const transaction = await prisma.transaction.create({
          data: {
            organizationId: orgId,
            branchId: template.branchId ?? null,
            transactionNumber: txData.transactionNumber ?? `TXN-${new Date().getFullYear()}-${Date.now()}`,
            transactionDate: txData.transactionDate ? new Date(txData.transactionDate) : runAt,
            transactionType: 'JOURNAL_ENTRY',
            description: txData.description ?? `Recurring Journal (${template.name})`,
            notes: txData.notes ?? null,
            status: 'POSTED',
            createdById: userId ?? template.createdById,
            ledgerEntries: {
              create: entries.map((e: any) => ({
                accountId: e.accountId,
                entryType: e.entryType,
                amount: e.amount,
                currency: e.currency ?? baseCurrency,
                exchangeRate: e.exchangeRate ?? 1,
                amountInBase: e.amountInBase ?? e.amount,
                description: e.description ?? null,
              })),
            },
          },
        });
        resultRef.transactionId = transaction.id;
        break;
      }
      case 'INVOICE': {
        const inv = payload?.invoice;
        const items = payload?.items || [];
        if (!inv || !items?.length) throw new Error('Invalid invoice payload');

        const subtotal = items.reduce((sum: number, it: any) => sum + Number(it.quantity) * Number(it.unitPrice), 0);
        const taxAmount = items.reduce((sum: number, it: any) => sum + ((Number(it.taxRate ?? 0) / 100) * Number(it.quantity) * Number(it.unitPrice)), 0);
        const total = subtotal + taxAmount;

        const invoice = await prisma.invoice.create({
          data: {
            organizationId: orgId,
            customerId: inv.customerId,
            invoiceNumber: inv.invoiceNumber ?? `INV-${new Date().getFullYear()}-${Date.now()}`,
            invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate) : runAt,
            dueDate: inv.dueDate ? new Date(inv.dueDate) : addDays(runAt, 30),
            currency: inv.currency ?? baseCurrency,
            exchangeRate: inv.exchangeRate ?? 1,
            subtotal,
            taxAmount,
            discountAmount: inv.discountAmount ?? 0,
            total,
            amountPaid: 0,
            amountDue: total,
            status: 'DRAFT',
            notes: inv.notes ?? null,
            attachments: inv.attachments ?? [],
            Branch: inv.branchId ? { connect: { id: inv.branchId } } : undefined,
            items: {
              create: items.map((it: any) => ({
                productId: it.productId ?? null,
                description: it.description,
                quantity: Number(it.quantity),
                unitPrice: Number(it.unitPrice),
                discount: Number(it.discount ?? 0),
                taxRate: Number(it.taxRate ?? 0),
                taxAmount: Number(((Number(it.taxRate ?? 0) / 100) * Number(it.quantity) * Number(it.unitPrice)).toFixed(2)),
                total: Number((Number(it.quantity) * Number(it.unitPrice)).toFixed(2)),
                sortOrder: Number(it.sortOrder ?? 0),
                taxRateId: it.taxRateId ?? null,
                taxCategory: it.taxCategory ?? null,
              })),
            },
          },
        });
        resultRef.invoiceId = invoice.id;
        break;
      }
      case 'BILL': {
        const bill = payload?.bill;
        const items = payload?.items || [];
        if (!bill || !items?.length) throw new Error('Invalid bill payload');
        const subtotal = items.reduce((sum: number, it: any) => sum + Number(it.quantity) * Number(it.unitPrice), 0);
        const taxAmount = items.reduce((sum: number, it: any) => sum + ((Number(it.taxRate ?? 0) / 100) * Number(it.quantity) * Number(it.unitPrice)), 0);
        const total = subtotal + taxAmount;
        const created = await prisma.bill.create({
          data: {
            organizationId: orgId,
            vendorId: bill.vendorId,
            billNumber: bill.billNumber ?? `BILL-${new Date().getFullYear()}-${Date.now()}`,
            billDate: bill.billDate ? new Date(bill.billDate) : runAt,
            dueDate: bill.dueDate ? new Date(bill.dueDate) : addDays(runAt, 30),
            currency: bill.currency ?? baseCurrency,
            exchangeRate: bill.exchangeRate ?? 1,
            subtotal,
            taxAmount,
            total,
            amountPaid: 0,
            amountDue: total,
            status: 'DRAFT',
            notes: bill.notes ?? null,
            attachments: bill.attachments ?? [],
            Branch: bill.branchId ? { connect: { id: bill.branchId } } : undefined,
            items: {
              create: items.map((it: any) => ({
                productId: it.productId ?? null,
                description: it.description,
                quantity: Number(it.quantity),
                unitPrice: Number(it.unitPrice),
                taxRate: Number(it.taxRate ?? 0),
                taxAmount: Number(((Number(it.taxRate ?? 0) / 100) * Number(it.quantity) * Number(it.unitPrice)).toFixed(2)),
                total: Number((Number(it.quantity) * Number(it.unitPrice)).toFixed(2)),
                sortOrder: Number(it.sortOrder ?? 0),
                taxRateId: it.taxRateId ?? null,
                taxCategory: it.taxCategory ?? null,
                claimInputTax: Boolean(it.claimInputTax ?? true),
              })),
            },
          },
        });
        resultRef.billId = created.id;
        break;
      }
      case 'PAYMENT': {
        const pay = payload?.payment;
        if (!pay) throw new Error('Invalid payment payload');
        const created = await prisma.payment.create({
          data: {
            organizationId: orgId,
            paymentNumber: pay.paymentNumber ?? `PAY-${new Date().getFullYear()}-${Date.now()}`,
            paymentDate: pay.paymentDate ? new Date(pay.paymentDate) : runAt,
            paymentType: pay.paymentType,
            amount: Number(pay.amount),
            currency: pay.currency ?? baseCurrency,
            exchangeRate: Number(pay.exchangeRate ?? 1),
            paymentMethod: pay.paymentMethod ?? 'OTHER',
            referenceNumber: pay.referenceNumber ?? null,
            bankAccountId: pay.bankAccountId ?? null,
            customerId: pay.customerId ?? null,
            vendorId: pay.vendorId ?? null,
            notes: pay.notes ?? null,
            attachments: pay.attachments ?? [],
          },
        });
        resultRef.paymentId = created.id;
        break;
      }
      default:
        throw new Error('Unsupported template type');
    }

    // Update execution with references and mark SUCCESS
    execution = await prisma.recurringExecution.update({
      where: { id: execution.id },
      data: {
        status: 'SUCCESS',
        transactionId: resultRef.transactionId ?? null,
        invoiceId: resultRef.invoiceId ?? null,
        billId: resultRef.billId ?? null,
        paymentId: resultRef.paymentId ?? null,
        message: 'Execution completed successfully',
      },
    });

    // Notify creator on success
    if (template.createdById) {
      const creator = await prisma.user.findUnique({ where: { id: template.createdById }, select: { email: true } });
      if (creator?.email) {
        await enqueueNotification({
          type: 'email',
          to: creator.email,
          subject: `Recurring execution succeeded (${template.name})`,
          body: `Execution ${execution.id} completed successfully.`,
        });
      }
    }

    // Update template counters and nextRunAt
    const nextRunAt = computeNextRunAt(template);
    await prisma.recurringTemplate.update({
      where: { id: template.id },
      data: {
        executedCount: { increment: 1 },
        lastRunAt: runAt,
        nextRunAt,
      },
    });

    return execution;
  } catch (err: any) {
    execution = await prisma.recurringExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        message: 'Execution failed',
        errorStack: String(err?.stack || err?.message || err),
      },
    });

    if (template.createdById) {
      const creator = await prisma.user.findUnique({ where: { id: template.createdById }, select: { email: true } });
      if (creator?.email) {
        await enqueueNotification({
          type: 'email',
          to: creator.email,
          subject: `Recurring execution failed (${template.name})`,
          body: `Execution ${execution.id} failed: ${err?.message || err}`,
        });
      }
    }
    throw err;
  }
}

// Execute an existing pending execution after approval
export async function executePendingExecution(opts: {
  executionId: string;
  approverUserId?: string;
}): Promise<any> {
  const { executionId, approverUserId } = opts;

  const execution = await prisma.recurringExecution.findUnique({ where: { id: executionId } });
  if (!execution) throw new Error('Execution not found');
  if (execution.status !== 'PENDING') throw new Error('Execution is not pending');

  const template = await prisma.recurringTemplate.findUnique({ where: { id: execution.templateId } });
  if (!template) throw new Error('Template not found');

  const orgId = template.organizationId;

  // Fetch organization base currency
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { baseCurrency: true },
  });
  const baseCurrency = org?.baseCurrency || 'USD';

  const runAt = new Date();
  const payload = (execution.payloadSnapshot as any) ?? (template.payload as any);

  try {
    let resultRef: { transactionId?: string; invoiceId?: string; billId?: string; paymentId?: string } = {};

    switch (template.templateType) {
      case 'JOURNAL_ENTRY': {
        const txData = payload?.transaction;
        const entries = payload?.ledgerEntries || [];
        if (!txData || !entries?.length) throw new Error('Invalid journal payload');

        const transaction = await prisma.transaction.create({
          data: {
            organizationId: orgId,
            branchId: template.branchId ?? null,
            transactionNumber: txData.transactionNumber ?? `TXN-${new Date().getFullYear()}-${Date.now()}`,
            transactionDate: txData.transactionDate ? new Date(txData.transactionDate) : runAt,
            transactionType: 'JOURNAL_ENTRY',
            description: txData.description ?? `Recurring Journal (${template.name})`,
            notes: txData.notes ?? null,
            status: 'POSTED',
            createdById: approverUserId ?? template.createdById,
            ledgerEntries: {
              create: entries.map((e: any) => ({
                accountId: e.accountId,
                entryType: e.entryType,
                amount: e.amount,
                currency: e.currency ?? baseCurrency,
                exchangeRate: e.exchangeRate ?? 1,
                amountInBase: e.amountInBase ?? e.amount,
                description: e.description ?? null,
              })),
            },
          },
        });
        resultRef.transactionId = transaction.id;
        break;
      }
      case 'INVOICE': {
        const inv = payload?.invoice;
        const items = payload?.items || [];
        if (!inv || !items?.length) throw new Error('Invalid invoice payload');

        const subtotal = items.reduce((sum: number, it: any) => sum + Number(it.quantity) * Number(it.unitPrice), 0);
        const taxAmount = items.reduce((sum: number, it: any) => sum + ((Number(it.taxRate ?? 0) / 100) * Number(it.quantity) * Number(it.unitPrice)), 0);
        const total = subtotal + taxAmount;

        const invoice = await prisma.invoice.create({
          data: {
            organizationId: orgId,
            customerId: inv.customerId,
            invoiceNumber: inv.invoiceNumber ?? `INV-${new Date().getFullYear()}-${Date.now()}`,
            invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate) : runAt,
            dueDate: inv.dueDate ? new Date(inv.dueDate) : addDays(runAt, 30),
            currency: inv.currency ?? baseCurrency,
            exchangeRate: inv.exchangeRate ?? 1,
            subtotal,
            taxAmount,
            discountAmount: inv.discountAmount ?? 0,
            total,
            amountPaid: 0,
            amountDue: total,
            status: 'DRAFT',
            notes: inv.notes ?? null,
            attachments: inv.attachments ?? [],
            Branch: inv.branchId ? { connect: { id: inv.branchId } } : undefined,
            items: {
              create: items.map((it: any) => ({
                productId: it.productId ?? null,
                description: it.description,
                quantity: Number(it.quantity),
                unitPrice: Number(it.unitPrice),
                discount: Number(it.discount ?? 0),
                taxRate: Number(it.taxRate ?? 0),
                taxAmount: Number(((Number(it.taxRate ?? 0) / 100) * Number(it.quantity) * Number(it.unitPrice)).toFixed(2)),
                total: Number((Number(it.quantity) * Number(it.unitPrice)).toFixed(2)),
                sortOrder: Number(it.sortOrder ?? 0),
                taxRateId: it.taxRateId ?? null,
                taxCategory: it.taxCategory ?? null,
              })),
            },
          },
        });
        resultRef.invoiceId = invoice.id;
        break;
      }
      case 'BILL': {
        const bill = payload?.bill;
        const items = payload?.items || [];
        if (!bill || !items?.length) throw new Error('Invalid bill payload');
        const subtotal = items.reduce((sum: number, it: any) => sum + Number(it.quantity) * Number(it.unitPrice), 0);
        const taxAmount = items.reduce((sum: number, it: any) => sum + ((Number(it.taxRate ?? 0) / 100) * Number(it.quantity) * Number(it.unitPrice)), 0);
        const total = subtotal + taxAmount;
        const created = await prisma.bill.create({
          data: {
            organizationId: orgId,
            vendorId: bill.vendorId,
            billNumber: bill.billNumber ?? `BILL-${new Date().getFullYear()}-${Date.now()}`,
            billDate: bill.billDate ? new Date(bill.billDate) : runAt,
            dueDate: bill.dueDate ? new Date(bill.dueDate) : addDays(runAt, 30),
            currency: bill.currency ?? baseCurrency,
            exchangeRate: bill.exchangeRate ?? 1,
            subtotal,
            taxAmount,
            total,
            amountPaid: 0,
            amountDue: total,
            status: 'DRAFT',
            notes: bill.notes ?? null,
            attachments: bill.attachments ?? [],
            Branch: bill.branchId ? { connect: { id: bill.branchId } } : undefined,
            items: {
              create: items.map((it: any) => ({
                productId: it.productId ?? null,
                description: it.description,
                quantity: Number(it.quantity),
                unitPrice: Number(it.unitPrice),
                taxRate: Number(it.taxRate ?? 0),
                taxAmount: Number(((Number(it.taxRate ?? 0) / 100) * Number(it.quantity) * Number(it.unitPrice)).toFixed(2)),
                total: Number((Number(it.quantity) * Number(it.unitPrice)).toFixed(2)),
                sortOrder: Number(it.sortOrder ?? 0),
                taxRateId: it.taxRateId ?? null,
                taxCategory: it.taxCategory ?? null,
                claimInputTax: Boolean(it.claimInputTax ?? true),
              })),
            },
          },
        });
        resultRef.billId = created.id;
        break;
      }
      case 'PAYMENT': {
        const pay = payload?.payment;
        if (!pay) throw new Error('Invalid payment payload');
        const created = await prisma.payment.create({
          data: {
            organizationId: orgId,
            paymentNumber: pay.paymentNumber ?? `PAY-${new Date().getFullYear()}-${Date.now()}`,
            paymentDate: pay.paymentDate ? new Date(pay.paymentDate) : runAt,
            paymentType: pay.paymentType,
            amount: Number(pay.amount),
            currency: pay.currency ?? baseCurrency,
            exchangeRate: Number(pay.exchangeRate ?? 1),
            paymentMethod: pay.paymentMethod ?? 'OTHER',
            referenceNumber: pay.referenceNumber ?? null,
            bankAccountId: pay.bankAccountId ?? null,
            customerId: pay.customerId ?? null,
            vendorId: pay.vendorId ?? null,
            notes: pay.notes ?? null,
            attachments: pay.attachments ?? [],
          },
        });
        resultRef.paymentId = created.id;
        break;
      }
      default:
        throw new Error('Unsupported template type');
    }

    // Update execution with references and mark SUCCESS
    const updated = await prisma.recurringExecution.update({
      where: { id: execution.id },
      data: {
        status: 'SUCCESS',
        transactionId: resultRef.transactionId ?? null,
        invoiceId: resultRef.invoiceId ?? null,
        billId: resultRef.billId ?? null,
        paymentId: resultRef.paymentId ?? null,
        message: 'Approved and posted successfully',
        createdById: approverUserId ?? execution.createdById ?? null,
      },
    });

    if (template.createdById) {
      const creator = await prisma.user.findUnique({ where: { id: template.createdById }, select: { email: true } });
      if (creator?.email) {
        await enqueueNotification({
          type: 'email',
          to: creator.email,
          subject: `Recurring execution approved (${template.name})`,
          body: `Execution ${execution.id} was approved and posted by ${approverUserId ?? 'approver'}.`,
        });
      }
    }

    // Update template counters and nextRunAt (lastRunAt only on success)
    const nextRunAt = computeNextRunAt(template);
    await prisma.recurringTemplate.update({
      where: { id: template.id },
      data: {
        executedCount: { increment: 1 },
        lastRunAt: runAt,
        nextRunAt,
      },
    });

    return updated;
  } catch (err: any) {
    await prisma.recurringExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        message: 'Approval execution failed',
        errorStack: String(err?.stack || err?.message || err),
      },
    });

    if (template.createdById) {
      const creator = await prisma.user.findUnique({ where: { id: template.createdById }, select: { email: true } });
      if (creator?.email) {
        await enqueueNotification({
          type: 'email',
          to: creator.email,
          subject: `Recurring execution approval failed (${template.name})`,
          body: `Execution ${execution.id} failed during approval: ${err?.message || err}`,
        });
      }
    }
    throw err;
  }
}

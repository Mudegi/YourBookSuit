const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('decimal.js');

const prisma = new PrismaClient();

// Journal Entries Routes
router.get('/', async (req, res) => {
  try {
    const { organizationId, status, startDate, endDate, page = 1, limit = 50 } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId, transactionType: 'JOURNAL_ENTRY' };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          ledgerEntries: {
            include: {
              account: true
            }
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({
      success: true,
      data: entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get journal entries error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { organizationId, branchId, transactionDate, description, notes, entries, createdById } = req.body;

    if (!organizationId || !transactionDate || !description || !entries || !Array.isArray(entries)) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    // Validate double entry (debits = credits)
    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    for (const entry of entries) {
      if (entry.entryType === 'DEBIT') {
        totalDebits = totalDebits.plus(entry.amount);
      } else if (entry.entryType === 'CREDIT') {
        totalCredits = totalCredits.plus(entry.amount);
      }
    }

    if (!totalDebits.equals(totalCredits)) {
      return res.status(400).json({
        success: false,
        error: `Debits (${totalDebits}) must equal Credits (${totalCredits})`
      });
    }

    // Get next transaction number
    const lastTransaction = await prisma.transaction.findFirst({
      where: { organizationId, transactionType: 'JOURNAL_ENTRY' },
      orderBy: { transactionNumber: 'desc' }
    });

    const lastNumber = lastTransaction ? parseInt(lastTransaction.transactionNumber.replace(/\D/g, '')) || 0 : 0;
    const transactionNumber = `JE${String(lastNumber + 1).padStart(6, '0')}`;

    // Create transaction with ledger entries
    const transaction = await prisma.transaction.create({
      data: {
        organizationId,
        branchId,
        transactionNumber,
        transactionDate: new Date(transactionDate),
        transactionType: 'JOURNAL_ENTRY',
        description,
        notes,
        status: 'DRAFT',
        createdById: createdById || req.user?.id,
        ledgerEntries: {
          create: entries.map(entry => ({
            accountId: entry.accountId,
            entryType: entry.entryType,
            amount: entry.amount,
            currency: entry.currency || 'USD',
            exchangeRate: entry.exchangeRate || 1,
            amountInBase: new Decimal(entry.amount).mul(entry.exchangeRate || 1).toNumber(),
            description: entry.description || description
          }))
        }
      },
      include: {
        ledgerEntries: {
          include: {
            account: true
          }
        }
      }
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Create journal entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id: entryId },
      include: {
        ledgerEntries: {
          include: {
            account: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Get journal entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;
    const { description, notes, status } = req.body;

    // Check if entry is already posted
    const existing = await prisma.transaction.findUnique({ where: { id: entryId } });
    if (existing?.status === 'POSTED') {
      return res.status(400).json({ success: false, error: 'Cannot modify posted journal entry' });
    }

    const transaction = await prisma.transaction.update({
      where: { id: entryId },
      data: {
        description,
        notes,
        status
      },
      include: {
        ledgerEntries: {
          include: {
            account: true
          }
        }
      }
    });

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Update journal entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;

    // Check if entry is posted
    const existing = await prisma.transaction.findUnique({ where: { id: entryId } });
    if (existing?.status === 'POSTED') {
      return res.status(400).json({ success: false, error: 'Cannot delete posted journal entry' });
    }

    await prisma.transaction.delete({
      where: { id: entryId }
    });

    res.json({ success: true, message: 'Journal entry deleted successfully' });
  } catch (error) {
    console.error('Delete journal entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:entryId/post', async (req, res) => {
  try {
    const { entryId } = req.params;

    // Update transaction status and account balances
    await prisma.$transaction(async (tx) => {
      // Update transaction status
      const transaction = await tx.transaction.update({
        where: { id: entryId },
        data: {
          status: 'POSTED',
          approvedById: req.user?.id,
          approvedAt: new Date()
        },
        include: {
          ledgerEntries: true
        }
      });

      // Update account balances
      for (const entry of transaction.ledgerEntries) {
        const account = await tx.chartOfAccount.findUnique({ where: { id: entry.accountId } });
        const change = entry.entryType === 'DEBIT'
          ? new Decimal(entry.amountInBase)
          : new Decimal(entry.amountInBase).negated();

        await tx.chartOfAccount.update({
          where: { id: entry.accountId },
          data: {
            balance: {
              increment: change.toNumber()
            }
          }
        });
      }
    });

    const posted = await prisma.transaction.findUnique({
      where: { id: entryId },
      include: {
        ledgerEntries: {
          include: {
            account: true
          }
        }
      }
    });

    res.json({ success: true, data: posted, message: 'Journal entry posted successfully' });
  } catch (error) {
    console.error('Post journal entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Bank Accounts Routes
router.get('/', async (req, res) => {
  try {
    const { organizationId, isActive } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const accounts = await prisma.bankAccount.findMany({
      where,
      orderBy: { accountName: 'asc' },
      include: {
        glAccount: true
      }
    });

    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Get bank accounts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { organizationId, accountName, accountNumber, bankName, currency, openingBalance, glAccountId } = req.body;

    if (!organizationId || !accountName || !bankName) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    const account = await prisma.bankAccount.create({
      data: {
        organizationId,
        accountName,
        accountNumber,
        bankName,
        currency: currency || 'USD',
        currentBalance: openingBalance || 0,
        glAccountId
      }
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    console.error('Create bank account error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
      include: {
        glAccount: true,
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 50
        }
      }
    });

    if (!account) {
      return res.status(404).json({ success: false, error: 'Bank account not found' });
    }

    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Get bank account error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const updateData = req.body;

    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.currentBalance;
    delete updateData.createdAt;

    const account = await prisma.bankAccount.update({
      where: { id: accountId },
      data: updateData
    });

    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Update bank account error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    const transactionCount = await prisma.bankTransaction.count({
      where: { bankAccountId: accountId }
    });

    if (transactionCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete bank account with transactions'
      });
    }

    await prisma.bankAccount.delete({ where: { id: accountId } });

    res.json({ success: true, message: 'Bank account deleted successfully' });
  } catch (error) {
    console.error('Delete bank account error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bank reconciliation
router.get('/:accountId/reconcile', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;

    const where = { bankAccountId: accountId, isReconciled: false };
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    const transactions = await prisma.bankTransaction.findMany({
      where,
      orderBy: { transactionDate: 'asc' }
    });

    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Get reconciliation data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:accountId/reconcile', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { transactionIds, statementBalance, reconciledDate } = req.body;

    if (!Array.isArray(transactionIds)) {
      return res.status(400).json({ success: false, error: 'Transaction IDs required' });
    }

    await prisma.bankTransaction.updateMany({
      where: {
        id: { in: transactionIds },
        bankAccountId: accountId
      },
      data: {
        isReconciled: true,
        reconciledDate: reconciledDate ? new Date(reconciledDate) : new Date()
      }
    });

    res.json({
      success: true,
      message: `${transactionIds.length} transactions reconciled successfully`
    });
  } catch (error) {
    console.error('Reconcile bank account error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

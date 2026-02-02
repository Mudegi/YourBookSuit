const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Chart of Accounts Routes
router.get('/chart-of-accounts', async (req, res) => {
  try {
    const { organizationId, accountType, isActive } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (accountType) where.accountType = accountType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const accounts = await prisma.chartOfAccount.findMany({
      where,
      orderBy: [{ code: 'asc' }],
      include: {
        parent: true,
        children: true
      }
    });

    res.json({ success: true, accounts, data: accounts });
  } catch (error) {
    console.error('Get chart of accounts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/chart-of-accounts', async (req, res) => {
  try {
    const { organizationId, code, name, accountType, accountSubType, parentId, currency, description, isActive } = req.body;

    if (!organizationId || !code || !name || !accountType) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    // Check if code already exists
    const existing = await prisma.chartOfAccount.findFirst({
      where: { organizationId, code }
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Account code already exists' });
    }

    const account = await prisma.chartOfAccount.create({
      data: {
        organizationId,
        code,
        name,
        accountType,
        accountSubType,
        parentId,
        currency: currency || 'USD',
        description,
        isActive: isActive !== false
      }
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/chart-of-accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.code; // Code shouldn't change
    delete updateData.balance; // Balance updated through transactions
    delete updateData.createdAt;

    const account = await prisma.chartOfAccount.update({
      where: { id: accountId },
      data: updateData
    });

    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/chart-of-accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    // Check if account has transactions
    const ledgerCount = await prisma.ledgerEntry.count({
      where: { accountId }
    });

    if (ledgerCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete account with transactions. Mark as inactive instead.'
      });
    }

    // Check if account has children
    const childCount = await prisma.chartOfAccount.count({
      where: { parentId: accountId }
    });

    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete account with sub-accounts'
      });
    }

    await prisma.chartOfAccount.delete({
      where: { id: accountId }
    });

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

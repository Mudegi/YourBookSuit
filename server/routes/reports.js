const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('decimal.js');

const prisma = new PrismaClient();

// Reports Routes
router.get('/profit-loss', async (req, res) => {
  try {
    const { organizationId, startDate, endDate } = req.query;

    if (!organizationId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Required parameters missing' });
    }

    // Get revenue and expense accounts with balances
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        organizationId,
        accountType: { in: ['REVENUE', 'EXPENSE'] },
        isActive: true
      }
    });

    const revenue = accounts
      .filter(a => a.accountType === 'REVENUE')
      .reduce((sum, a) => sum.plus(new Decimal(a.balance || 0)), new Decimal(0));

    const expenses = accounts
      .filter(a => a.accountType === 'EXPENSE')
      .reduce((sum, a) => sum.plus(new Decimal(a.balance || 0)), new Decimal(0));

    const netIncome = revenue.minus(expenses);

    res.json({
      success: true,
      data: {
        revenue: revenue.toNumber(),
        expenses: expenses.toNumber(),
        netIncome: netIncome.toNumber(),
        accounts
      }
    });
  } catch (error) {
    console.error('Get profit & loss report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/balance-sheet', async (req, res) => {
  try {
    const { organizationId, asOfDate } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        organizationId,
        accountType: { in: ['ASSET', 'LIABILITY', 'EQUITY'] },
        isActive: true
      }
    });

    const assets = accounts
      .filter(a => a.accountType === 'ASSET')
      .reduce((sum, a) => sum.plus(new Decimal(a.balance || 0)), new Decimal(0));

    const liabilities = accounts
      .filter(a => a.accountType === 'LIABILITY')
      .reduce((sum, a) => sum.plus(new Decimal(a.balance || 0)), new Decimal(0));

    const equity = accounts
      .filter(a => a.accountType === 'EQUITY')
      .reduce((sum, a) => sum.plus(new Decimal(a.balance || 0)), new Decimal(0));

    res.json({
      success: true,
      data: {
        assets: assets.toNumber(),
        liabilities: liabilities.toNumber(),
        equity: equity.toNumber(),
        accounts
      }
    });
  } catch (error) {
    console.error('Get balance sheet report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/cash-flow', async (req, res) => {
  try {
    const { organizationId, startDate, endDate } = req.query;

    if (!organizationId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Required parameters missing' });
    }

    res.json({
      success: true,
      message: 'Cash flow report - Implementation pending',
      data: {
        operatingActivities: 0,
        investingActivities: 0,
        financingActivities: 0,
        netCashFlow: 0
      }
    });
  } catch (error) {
    console.error('Get cash flow report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/trial-balance', async (req, res) => {
  try {
    const { organizationId, asOfDate } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        organizationId,
        isActive: true
      },
      orderBy: { code: 'asc' }
    });

    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    accounts.forEach(account => {
      const balance = new Decimal(account.balance || 0);
      if (balance.greaterThan(0)) {
        totalDebits = totalDebits.plus(balance);
      } else {
        totalCredits = totalCredits.plus(balance.abs());
      }
    });

    res.json({
      success: true,
      data: {
        accounts,
        totalDebits: totalDebits.toNumber(),
        totalCredits: totalCredits.toNumber(),
        difference: totalDebits.minus(totalCredits).toNumber()
      }
    });
  } catch (error) {
    console.error('Get trial balance report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/aged-receivables', async (req, res) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ['POSTED', 'OVERDUE'] },
        amountDue: { gt: 0 }
      },
      include: {
        customer: true
      }
    });

    res.json({ success: true, data: invoices });
  } catch (error) {
    console.error('Get aged receivables report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/aged-payables', async (req, res) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const bills = await prisma.bill.findMany({
      where: {
        organizationId,
        status: { in: ['POSTED', 'OVERDUE'] },
        amountDue: { gt: 0 }
      },
      include: {
        vendor: true
      }
    });

    res.json({ success: true, data: bills });
  } catch (error) {
    console.error('Get aged payables report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/general-ledger', async (req, res) => {
  try {
    const { organizationId, accountId, startDate, endDate } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = {};
    if (accountId) where.accountId = accountId;

    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: {
        account: true,
        transaction: true
      },
      orderBy: {
        transaction: {
          transactionDate: 'asc'
        }
      }
    });

    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Get general ledger report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

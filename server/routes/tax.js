const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Tax Routes
router.get('/rates', async (req, res) => {
  try {
    const { organizationId, isActive } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const rates = await prisma.taxRate.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        agency: true,
        jurisdiction: true
      }
    });

    res.json({ success: true, data: rates });
  } catch (error) {
    console.error('Get tax rates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/rates', async (req, res) => {
  try {
    const { organizationId, name, rate, type, agencyId, jurisdictionId, isActive } = req.body;

    if (!organizationId || !name || rate === undefined) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    const taxRate = await prisma.taxRate.create({
      data: {
        organizationId,
        name,
        rate,
        type,
        agencyId,
        jurisdictionId,
        isActive: isActive !== false
      },
      include: {
        agency: true,
        jurisdiction: true
      }
    });

    res.status(201).json({ success: true, data: taxRate });
  } catch (error) {
    console.error('Create tax rate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/agencies', async (req, res) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const agencies = await prisma.taxAgency.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: agencies });
  } catch (error) {
    console.error('Get tax agencies error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/agencies', async (req, res) => {
  try {
    const { organizationId, name, code, country } = req.body;

    if (!organizationId || !name) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    const agency = await prisma.taxAgency.create({
      data: {
        organizationId,
        name,
        code,
        country
      }
    });

    res.status(201).json({ success: true, data: agency });
  } catch (error) {
    console.error('Create tax agency error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/jurisdictions', async (req, res) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const jurisdictions = await prisma.taxJurisdiction.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: jurisdictions });
  } catch (error) {
    console.error('Get tax jurisdictions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/calculate', async (req, res) => {
  try {
    const { amount, taxRateId } = req.body;

    if (!amount || !taxRateId) {
      return res.status(400).json({ success: false, error: 'Amount and tax rate ID required' });
    }

    const taxRate = await prisma.taxRate.findUnique({
      where: { id: taxRateId }
    });

    if (!taxRate) {
      return res.status(404).json({ success: false, error: 'Tax rate not found' });
    }

    const taxAmount = (amount * taxRate.rate) / 100;
    const total = amount + taxAmount;

    res.json({
      success: true,
      data: {
        baseAmount: amount,
        taxRate: taxRate.rate,
        taxAmount,
        total
      }
    });
  } catch (error) {
    console.error('Calculate tax error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

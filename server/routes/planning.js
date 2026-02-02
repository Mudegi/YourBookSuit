const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Planning Routes
router.get('/forecasts', async (req, res) => {
  try {
    const { organizationId, productId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (productId) where.productId = productId;

    const forecasts = await prisma.demandForecast.findMany({
      where,
      include: {
        product: true
      },
      orderBy: { forecastDate: 'desc' }
    });

    res.json({ success: true, data: forecasts });
  } catch (error) {
    console.error('Get forecasts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/forecasts', async (req, res) => {
  try {
    const { organizationId, productId, forecastDate, quantity, method } = req.body;

    if (!organizationId || !productId || !forecastDate || !quantity) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    const forecast = await prisma.demandForecast.create({
      data: {
        organizationId,
        productId,
        forecastDate: new Date(forecastDate),
        forecastedQuantity: quantity,
        method: method || 'MANUAL'
      },
      include: {
        product: true
      }
    });

    res.status(201).json({ success: true, data: forecast });
  } catch (error) {
    console.error('Create forecast error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reorder-policies', async (req, res) => {
  try {
    const { organizationId, productId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (productId) where.productId = productId;

    const policies = await prisma.reorderPolicy.findMany({
      where,
      include: {
        product: true
      }
    });

    res.json({ success: true, data: policies });
  } catch (error) {
    console.error('Get reorder policies error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/reorder-policies', async (req, res) => {
  try {
    const { organizationId, productId, reorderPoint, reorderQuantity, strategy } = req.body;

    if (!organizationId || !productId || reorderPoint === undefined || reorderQuantity === undefined) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    const policy = await prisma.reorderPolicy.create({
      data: {
        organizationId,
        productId,
        reorderPoint,
        reorderQuantity,
        strategy: strategy || 'FIXED_QUANTITY'
      },
      include: {
        product: true
      }
    });

    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    console.error('Create reorder policy error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/production-plans', async (req, res) => {
  try {
    const { organizationId, status } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (status) where.status = status;

    const plans = await prisma.productPlanning.findMany({
      where,
      include: {
        product: true,
        vendor: true
      },
      orderBy: { planDate: 'desc' }
    });

    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Get production plans error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/production-plans', async (req, res) => {
  try {
    const { organizationId, productId, planDate, plannedQuantity, vendorId } = req.body;

    if (!organizationId || !productId || !planDate || !plannedQuantity) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    const plan = await prisma.productPlanning.create({
      data: {
        organizationId,
        productId,
        planDate: new Date(planDate),
        plannedQuantity,
        vendorId,
        status: 'PLANNED'
      },
      include: {
        product: true,
        vendor: true
      }
    });

    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    console.error('Create production plan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

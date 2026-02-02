const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Manufacturing Routes
router.get('/work-orders', async (req, res) => {
  try {
    const { organizationId, status } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (status) where.status = status;

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        product: true,
        bom: true
      },
      orderBy: { startDate: 'desc' }
    });

    res.json({ success: true, data: workOrders });
  } catch (error) {
    console.error('Get work orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/work-orders', async (req, res) => {
  try {
    const { organizationId, productId, quantity, startDate, dueDate, bomId } = req.body;

    if (!organizationId || !productId || !quantity || !startDate) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    const lastWO = await prisma.workOrder.findFirst({
      where: { organizationId },
      orderBy: { workOrderNumber: 'desc' }
    });

    const lastNumber = lastWO ? parseInt(lastWO.workOrderNumber.replace(/\D/g, '')) || 0 : 0;
    const workOrderNumber = `WO${String(lastNumber + 1).padStart(6, '0')}`;

    const workOrder = await prisma.workOrder.create({
      data: {
        organizationId,
        workOrderNumber,
        productId,
        quantity,
        startDate: new Date(startDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'PLANNED',
        bomId
      },
      include: {
        product: true,
        bom: true
      }
    });

    res.status(201).json({ success: true, data: workOrder });
  } catch (error) {
    console.error('Create work order error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/bom', async (req, res) => {
  try {
    const { organizationId, productId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (productId) where.productId = productId;

    const boms = await prisma.billOfMaterial.findMany({
      where,
      include: {
        product: true,
        components: {
          include: {
            component: true
          }
        }
      },
      orderBy: { version: 'desc' }
    });

    res.json({ success: true, data: boms });
  } catch (error) {
    console.error('Get BOMs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/bom', async (req, res) => {
  try {
    const { organizationId, productId, version, components } = req.body;

    if (!organizationId || !productId || !components || !Array.isArray(components)) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    const bom = await prisma.billOfMaterial.create({
      data: {
        organizationId,
        productId,
        version: version || '1.0',
        isActive: true,
        components: {
          create: components.map(c => ({
            componentId: c.componentId,
            quantity: c.quantity,
            unit: c.unit || 'pcs'
          }))
        }
      },
      include: {
        product: true,
        components: {
          include: {
            component: true
          }
        }
      }
    });

    res.status(201).json({ success: true, data: bom });
  } catch (error) {
    console.error('Create BOM error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

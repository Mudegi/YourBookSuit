const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Services Routes
router.get('/', async (req, res) => {
  try {
    const { organizationId, category, isActive, search } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { serviceCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const services = await prisma.serviceCatalog.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: services });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { organizationId, name, serviceCode, description, category, rate, unitOfMeasure, taxable, isActive } = req.body;

    if (!organizationId || !name) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    const service = await prisma.serviceCatalog.create({
      data: {
        organizationId,
        name,
        serviceCode: serviceCode || `SVC-${Date.now()}`,
        description,
        category,
        rate: rate || 0,
        unitOfMeasure: unitOfMeasure || 'Hour',
        taxable: taxable !== false,
        isActive: isActive !== false
      }
    });

    res.status(201).json({ success: true, data: service });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceId },
      include: {
        invoiceItems: {
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                invoiceDate: true,
                customer: true
              }
            }
          },
          take: 20,
          orderBy: { invoice: { invoiceDate: 'desc' } }
        }
      }
    });

    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    res.json({ success: true, data: service });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const updateData = req.body;

    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.createdAt;

    const service = await prisma.serviceCatalog.update({
      where: { id: serviceId },
      data: updateData
    });

    res.json({ success: true, data: service });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;

    // Check if service is used in transactions
    const usageCount = await prisma.invoiceItem.count({
      where: { serviceId }
    });

    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete service used in transactions. Mark as inactive instead.'
      });
    }

    await prisma.serviceCatalog.delete({ where: { id: serviceId } });

    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

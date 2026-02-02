const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Products Routes
router.get('/', async (req, res) => {
  try {
    const { organizationId, isActive, category, search } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            invoiceItems: true,
            billItems: true
          }
        }
      }
    });

    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { organizationId, name, sku, description, category, unitPrice, unitCost, quantityOnHand, reorderPoint, taxable, isActive } = req.body;

    if (!organizationId || !name) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    // Check if SKU exists
    if (sku) {
      const existing = await prisma.product.findFirst({
        where: { organizationId, sku }
      });

      if (existing) {
        return res.status(400).json({ success: false, error: 'SKU already exists' });
      }
    }

    const product = await prisma.product.create({
      data: {
        organizationId,
        name,
        sku: sku || `PROD-${Date.now()}`,
        description,
        category,
        unitPrice: unitPrice || 0,
        unitCost: unitCost || 0,
        quantityOnHand: quantityOnHand || 0,
        reorderPoint: reorderPoint || 0,
        taxable: taxable !== false,
        isActive: isActive !== false
      }
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
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

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;

    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.createdAt;

    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData
    });

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product is used in transactions
    const usageCount = await prisma.invoiceItem.count({
      where: { productId }
    });

    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete product used in transactions. Mark as inactive instead.'
      });
    }

    await prisma.product.delete({ where: { id: productId } });

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inventory adjustments
router.post('/:productId/adjust', async (req, res) => {
  try {
    const { productId } = req.params;
    const { adjustment, reason } = req.body;

    if (adjustment === undefined) {
      return res.status(400).json({ success: false, error: 'Adjustment amount required' });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        quantityOnHand: {
          increment: parseFloat(adjustment)
        }
      }
    });

    res.json({
      success: true,
      data: product,
      message: `Inventory adjusted by ${adjustment}. Reason: ${reason || 'Not provided'}`
    });
  } catch (error) {
    console.error('Adjust inventory error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

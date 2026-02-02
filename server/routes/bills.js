const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('decimal.js');

const prisma = new PrismaClient();

// Bills Routes
router.get('/', async (req, res) => {
  try {
    const { organizationId, vendorId, status, startDate, endDate, page = 1, limit = 50 } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.billDate = {};
      if (startDate) where.billDate.gte = new Date(startDate);
      if (endDate) where.billDate.lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          vendor: true,
          items: {
            include: {
              product: true,
              service: true,
              account: true
            }
          }
        },
        orderBy: { billDate: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.bill.count({ where })
    ]);

    res.json({
      success: true,
      data: bills,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { organizationId, vendorId, billDate, dueDate, vendorInvoiceNo, items, notes, currency } = req.body;

    if (!organizationId || !vendorId || !billDate || !dueDate || !items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    // Get next bill number
    const lastBill = await prisma.bill.findFirst({
      where: { organizationId },
      orderBy: { billNumber: 'desc' }
    });

    const lastNumber = lastBill ? parseInt(lastBill.billNumber.replace(/\D/g, '')) || 0 : 0;
    const billNumber = `BILL${String(lastNumber + 1).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = new Decimal(0);
    let taxAmount = new Decimal(0);

    const billItems = items.map(item => {
      const itemTotal = new Decimal(item.quantity).mul(item.unitPrice);
      const itemTax = itemTotal.mul(item.taxRate || 0).div(100);
      const itemTotalWithTax = itemTotal.plus(itemTax);

      subtotal = subtotal.plus(itemTotal);
      taxAmount = taxAmount.plus(itemTax);

      return {
        productId: item.productId,
        serviceId: item.serviceId,
        accountId: item.accountId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        taxAmount: itemTax.toNumber(),
        total: itemTotalWithTax.toNumber(),
        sortOrder: item.sortOrder || 0
      };
    });

    const total = subtotal.plus(taxAmount);

    const bill = await prisma.bill.create({
      data: {
        organizationId,
        vendorId,
        billNumber,
        vendorInvoiceNo,
        billDate: new Date(billDate),
        dueDate: new Date(dueDate),
        currency: currency || 'USD',
        subtotal: subtotal.toNumber(),
        taxAmount: taxAmount.toNumber(),
        total: total.toNumber(),
        amountDue: total.toNumber(),
        status: 'DRAFT',
        notes,
        items: {
          create: billItems
        }
      },
      include: {
        vendor: true,
        items: true
      }
    });

    res.status(201).json({ success: true, data: bill });
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:billId', async (req, res) => {
  try {
    const { billId } = req.params;

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        vendor: true,
        items: {
          include: {
            product: true,
            service: true,
            account: true,
            taxRateConfig: true
          },
          orderBy: { sortOrder: 'asc' }
        },
        payments: {
          include: {
            payment: true
          }
        }
      }
    });

    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found' });
    }

    res.json({ success: true, data: bill });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    const { notes, status } = req.body;

    const existing = await prisma.bill.findUnique({ where: { id: billId } });
    if (existing?.status === 'POSTED' || existing?.status === 'PAID') {
      return res.status(400).json({ success: false, error: 'Cannot modify posted or paid bill' });
    }

    const bill = await prisma.bill.update({
      where: { id: billId },
      data: { notes, status },
      include: {
        vendor: true,
        items: true
      }
    });

    res.json({ success: true, data: bill });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:billId', async (req, res) => {
  try {
    const { billId } = req.params;

    const existing = await prisma.bill.findUnique({ where: { id: billId } });
    if (existing?.status === 'POSTED' || existing?.status === 'PAID') {
      return res.status(400).json({ success: false, error: 'Cannot delete posted or paid bill' });
    }

    await prisma.bill.delete({ where: { id: billId } });

    res.json({ success: true, message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:billId/post', async (req, res) => {
  try {
    const { billId } = req.params;

    const bill = await prisma.bill.update({
      where: { id: billId },
      data: { status: 'POSTED' },
      include: {
        vendor: true,
        items: true
      }
    });

    res.json({ success: true, data: bill, message: 'Bill posted successfully' });
  } catch (error) {
    console.error('Post bill error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('decimal.js');

const prisma = new PrismaClient();

// Invoices Routes
router.get('/', async (req, res) => {
  try {
    const { organizationId, customerId, status, startDate, endDate, page = 1, limit = 50 } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              service: true
            }
          }
        },
        orderBy: { invoiceDate: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.invoice.count({ where })
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { organizationId, customerId, invoiceDate, dueDate, items, notes, terms, currency } = req.body;

    if (!organizationId || !customerId || !invoiceDate || !dueDate || !items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    // Get next invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { organizationId },
      orderBy: { invoiceNumber: 'desc' }
    });

    const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) || 0 : 0;
    const invoiceNumber = `INV${String(lastNumber + 1).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = new Decimal(0);
    let taxAmount = new Decimal(0);

    const invoiceItems = items.map(item => {
      const itemSubtotal = new Decimal(item.quantity).mul(item.unitPrice);
      const itemDiscount = new Decimal(item.discount || 0);
      const itemTax = itemSubtotal.minus(itemDiscount).mul(item.taxRate || 0).div(100);
      const itemTotal = itemSubtotal.minus(itemDiscount).plus(itemTax);

      subtotal = subtotal.plus(itemSubtotal);
      taxAmount = taxAmount.plus(itemTax);

      return {
        productId: item.productId,
        serviceId: item.serviceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: itemDiscount.toNumber(),
        taxRate: item.taxRate || 0,
        taxAmount: itemTax.toNumber(),
        subtotal: itemSubtotal.toNumber(),
        total: itemTotal.toNumber(),
        sortOrder: item.sortOrder || 0
      };
    });

    const total = subtotal.plus(taxAmount);

    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        customerId,
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        currency: currency || 'USD',
        subtotal: subtotal.toNumber(),
        taxAmount: taxAmount.toNumber(),
        total: total.toNumber(),
        amountDue: total.toNumber(),
        status: 'DRAFT',
        notes,
        terms,
        items: {
          create: invoiceItems
        }
      },
      include: {
        customer: true,
        items: true
      }
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            service: true,
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

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { notes, terms, status } = req.body;

    // Check if invoice is already posted
    const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (existing?.status === 'POSTED' || existing?.status === 'PAID') {
      return res.status(400).json({ success: false, error: 'Cannot modify posted or paid invoice' });
    }

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { notes, terms, status },
      include: {
        customer: true,
        items: true
      }
    });

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (existing?.status === 'POSTED' || existing?.status === 'PAID') {
      return res.status(400).json({ success: false, error: 'Cannot delete posted or paid invoice' });
    }

    await prisma.invoice.delete({ where: { id: invoiceId } });

    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:invoiceId/post', async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'POSTED',
        approvedById: req.user?.id,
        approvedAt: new Date()
      },
      include: {
        customer: true,
        items: true
      }
    });

    res.json({ success: true, data: invoice, message: 'Invoice posted successfully' });
  } catch (error) {
    console.error('Post invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:invoiceId/void', async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'VOIDED' },
      include: {
        customer: true,
        items: true
      }
    });

    res.json({ success: true, data: invoice, message: 'Invoice voided successfully' });
  } catch (error) {
    console.error('Void invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Payments Routes
router.get('/', async (req, res) => {
  try {
    const { organizationId, paymentType, startDate, endDate } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (paymentType) where.paymentType = paymentType;
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        customer: true,
        vendor: true,
        bankAccount: true,
        allocations: {
          include: {
            invoice: true,
            bill: true
          }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/customer', async (req, res) => {
  try {
    const { organizationId, customerId, amount, paymentDate, paymentMethod, bankAccountId, referenceNumber, allocations } = req.body;

    if (!organizationId || !customerId || !amount || !paymentDate) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    const lastPayment = await prisma.payment.findFirst({
      where: { organizationId },
      orderBy: { paymentNumber: 'desc' }
    });

    const lastNumber = lastPayment ? parseInt(lastPayment.paymentNumber.replace(/\D/g, '')) || 0 : 0;
    const paymentNumber = `PAY${String(lastNumber + 1).padStart(6, '0')}`;

    const payment = await prisma.payment.create({
      data: {
        organizationId,
        paymentNumber,
        customerId,
        paymentType: 'CUSTOMER',
        paymentDate: new Date(paymentDate),
        amount,
        paymentMethod: paymentMethod || 'BANK_TRANSFER',
        bankAccountId,
        referenceNumber,
        allocations: allocations ? {
          create: allocations.map(a => ({
            invoiceId: a.invoiceId,
            amount: a.amount
          }))
        } : undefined
      },
      include: {
        customer: true,
        allocations: {
          include: {
            invoice: true
          }
        }
      }
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    console.error('Create customer payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/vendor', async (req, res) => {
  try {
    const { organizationId, vendorId, amount, paymentDate, paymentMethod, bankAccountId, referenceNumber, allocations } = req.body;

    if (!organizationId || !vendorId || !amount || !paymentDate) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    const lastPayment = await prisma.payment.findFirst({
      where: { organizationId },
      orderBy: { paymentNumber: 'desc' }
    });

    const lastNumber = lastPayment ? parseInt(lastPayment.paymentNumber.replace(/\D/g, '')) || 0 : 0;
    const paymentNumber = `PAY${String(lastNumber + 1).padStart(6, '0')}`;

    const payment = await prisma.payment.create({
      data: {
        organizationId,
        paymentNumber,
        vendorId,
        paymentType: 'VENDOR',
        paymentDate: new Date(paymentDate),
        amount,
        paymentMethod: paymentMethod || 'BANK_TRANSFER',
        bankAccountId,
        referenceNumber,
        allocations: allocations ? {
          create: allocations.map(a => ({
            billId: a.billId,
            amount: a.amount
          }))
        } : undefined
      },
      include: {
        vendor: true,
        allocations: {
          include: {
            bill: true
          }
        }
      }
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    console.error('Create vendor payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        customer: true,
        vendor: true,
        bankAccount: true,
        allocations: {
          include: {
            invoice: true,
            bill: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    await prisma.payment.delete({ where: { id: paymentId } });

    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

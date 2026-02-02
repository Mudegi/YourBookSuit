const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Customers Routes
router.get('/', async (req, res) => {
  try {
    const { organizationId, isActive, search } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: [{ companyName: 'asc' }, { lastName: 'asc' }],
      include: {
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            amountDue: true,
            status: true
          },
          where: { status: { in: ['POSTED', 'OVERDUE'] } }
        }
      }
    });

    res.json({ success: true, data: customers });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { organizationId, firstName, lastName, companyName, email, phone, paymentTerms, billingAddress, shippingAddress, notes } = req.body;

    if (!organizationId || !firstName || !lastName) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    // Get next customer number
    const lastCustomer = await prisma.customer.findFirst({
      where: { organizationId },
      orderBy: { customerNumber: 'desc' }
    });

    const lastNumber = lastCustomer ? parseInt(lastCustomer.customerNumber.replace(/\D/g, '')) || 0 : 0;
    const customerNumber = `CUST${String(lastNumber + 1).padStart(6, '0')}`;

    const customer = await prisma.customer.create({
      data: {
        organizationId,
        customerNumber,
        firstName,
        lastName,
        companyName,
        email,
        phone,
        paymentTerms: paymentTerms || 30,
        billingAddress,
        shippingAddress,
        notes
      }
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        invoices: {
          orderBy: { invoiceDate: 'desc' },
          take: 20
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 20
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const updateData = req.body;

    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.customerNumber;
    delete updateData.createdAt;

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData
    });

    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    // Check if customer has invoices
    const invoiceCount = await prisma.invoice.count({
      where: { customerId }
    });

    if (invoiceCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete customer with invoices. Mark as inactive instead.'
      });
    }

    await prisma.customer.delete({ where: { id: customerId } });

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

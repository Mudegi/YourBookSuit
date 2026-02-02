const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Vendors Routes
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
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { companyName: 'asc' },
      include: {
        bills: {
          select: {
            id: true,
            billNumber: true,
            total: true,
            amountDue: true,
            status: true
          },
          where: { status: { in: ['POSTED', 'OVERDUE'] } }
        }
      }
    });

    res.json({ success: true, data: vendors });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { organizationId, companyName, contactName, email, phone, paymentTerms, bankAccount, billingAddress, notes } = req.body;

    if (!organizationId || !companyName || !email) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    // Get next vendor number
    const lastVendor = await prisma.vendor.findFirst({
      where: { organizationId },
      orderBy: { vendorNumber: 'desc' }
    });

    const lastNumber = lastVendor ? parseInt(lastVendor.vendorNumber.replace(/\D/g, '')) || 0 : 0;
    const vendorNumber = `VEND${String(lastNumber + 1).padStart(6, '0')}`;

    const vendor = await prisma.vendor.create({
      data: {
        organizationId,
        vendorNumber,
        companyName,
        contactName,
        email,
        phone,
        paymentTerms: paymentTerms || 30,
        bankAccount,
        billingAddress,
        notes
      }
    });

    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        bills: {
          orderBy: { billDate: 'desc' },
          take: 20
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 20
        },
        purchaseOrders: {
          orderBy: { poDate: 'desc' },
          take: 20
        }
      }
    });

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    res.json({ success: true, data: vendor });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const updateData = req.body;

    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.vendorNumber;
    delete updateData.createdAt;

    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: updateData
    });

    res.json({ success: true, data: vendor });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Check if vendor has bills
    const billCount = await prisma.bill.count({
      where: { vendorId }
    });

    if (billCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete vendor with bills. Mark as inactive instead.'
      });
    }

    await prisma.vendor.delete({ where: { id: vendorId } });

    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Organization Routes
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const organizations = await prisma.organization.findMany({
      where: {
        users: {
          some: {
            userId,
            isActive: true
          }
        }
      },
      include: {
        users: {
          where: { userId },
          select: { role: true, isActive: true }
        }
      }
    });

    res.json({ success: true, data: organizations });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, legalName, taxIdNumber, baseCurrency, homeCountry, address, phone, email } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ success: false, error: 'Organization name required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        legalName,
        taxIdNumber,
        baseCurrency: baseCurrency || 'USD',
        homeCountry: homeCountry || 'US',
        address,
        phone,
        email,
        users: {
          create: {
            userId,
            role: 'OWNER'
          }
        }
      }
    });

    res.status(201).json({ success: true, data: organization });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const organization = await prisma.organization.findFirst({
      where: {
        id: orgId,
        users: {
          some: {
            userId,
            isActive: true
          }
        }
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    res.json({ success: true, data: organization });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Check user has permission
    const membership = await prisma.organizationUser.findFirst({
      where: {
        organizationId: orgId,
        userId,
        isActive: true
      }
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.slug;
    delete updateData.createdAt;

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: updateData
    });

    res.json({ success: true, data: organization });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Projects Routes
router.get('/', async (req, res) => {
  try {
    const { organizationId, status } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const where = { organizationId };
    if (status) where.status = status;

    const projects = await prisma.project.findMany({
      where,
      include: {
        customer: true,
        manager: true,
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { organizationId, name, description, customerId, startDate, endDate, budget, managerId } = req.body;

    if (!organizationId || !name || !startDate) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    const project = await prisma.project.create({
      data: {
        organizationId,
        name,
        description,
        customerId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        budget,
        status: 'PLANNING',
        managerId
      },
      include: {
        customer: true,
        manager: true
      }
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        customer: true,
        manager: true,
        tasks: {
          include: {
            assignedTo: true
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const updateData = req.body;

    delete updateData.id;
    delete updateData.organizationId;
    delete updateData.createdAt;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        customer: true,
        manager: true
      }
    });

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

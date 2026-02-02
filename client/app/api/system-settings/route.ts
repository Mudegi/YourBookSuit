import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Get the first (and should be only) system settings record
    let settings = await prisma.systemSettings.findFirst({
      include: {
        socialMediaLinks: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        pricingPlans: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        featureHighlights: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        testimonials: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          companyName: 'YourBooks ERP',
          companyTagline: 'Professional Accounting Made Simple',
          heroTitle: 'Complete ERP Solution for Modern Businesses',
          heroSubtitle:
            'Enterprise-grade accounting system with double-entry bookkeeping, multi-tenant architecture, and real-time financial reporting.',
          socialMediaLinks: {
            create: [
              {
                platform: 'github',
                url: 'https://github.com',
                displayOrder: 1,
              },
              {
                platform: 'twitter',
                url: 'https://twitter.com',
                displayOrder: 2,
              },
              {
                platform: 'linkedin',
                url: 'https://linkedin.com',
                displayOrder: 3,
              },
            ],
          },
          pricingPlans: {
            create: [
              {
                name: 'Starter',
                description: 'Perfect for small businesses',
                price: 29,
                currency: 'USD',
                billingPeriod: 'MONTHLY',
                features: [
                  'General Ledger',
                  'Accounts Receivable',
                  'Accounts Payable',
                  'Basic Reporting',
                  'Up to 5 users',
                  'Email support',
                ],
                isPopular: false,
                displayOrder: 1,
                ctaText: 'Get Started',
                ctaLink: '/register',
              },
              {
                name: 'Professional',
                description: 'For growing businesses',
                price: 79,
                currency: 'USD',
                billingPeriod: 'MONTHLY',
                features: [
                  'All Starter features',
                  'Inventory Management',
                  'Bank Reconciliation',
                  'Advanced Reporting',
                  'Up to 20 users',
                  'Priority support',
                ],
                isPopular: true,
                displayOrder: 2,
                ctaText: 'Get Started',
                ctaLink: '/register',
              },
              {
                name: 'Enterprise',
                description: 'For large organizations',
                price: 0,
                currency: 'USD',
                billingPeriod: 'CUSTOM',
                features: [
                  'All Professional features',
                  'Manufacturing Module',
                  'Fixed Assets',
                  'Custom integrations',
                  'Unlimited users',
                  'Dedicated support',
                ],
                isPopular: false,
                displayOrder: 3,
                ctaText: 'Contact Sales',
                ctaLink: '/contact',
              },
            ],
          },
          featureHighlights: {
            create: [
              {
                title: 'General Ledger',
                description:
                  'Complete chart of accounts with automated double-entry bookkeeping and journal entry management.',
                icon: 'calculator',
                color: 'blue',
                displayOrder: 1,
              },
              {
                title: 'Accounts Receivable',
                description:
                  'Professional invoicing, payment tracking, and automated customer aging reports with reminders.',
                icon: 'document',
                color: 'green',
                displayOrder: 2,
              },
              {
                title: 'Accounts Payable',
                description:
                  'Vendor bill management, payment scheduling, and 1099 tracking with approval workflows.',
                icon: 'wallet',
                color: 'purple',
                displayOrder: 3,
              },
              {
                title: 'Banking & Cash',
                description:
                  'Bank reconciliation, cash flow forecasting, and multi-currency support with real-time rates.',
                icon: 'credit-card',
                color: 'indigo',
                displayOrder: 4,
              },
              {
                title: 'Inventory Management',
                description:
                  'Perpetual inventory tracking with FIFO/LIFO costing, stock adjustments, and low stock alerts.',
                icon: 'cube',
                color: 'orange',
                displayOrder: 5,
              },
              {
                title: 'Financial Reports',
                description:
                  'Real-time Balance Sheet, P&L, Cash Flow, and custom reports with drill-down capabilities.',
                icon: 'chart-bar',
                color: 'red',
                displayOrder: 6,
              },
            ],
          },
        },
        include: {
          socialMediaLinks: true,
          pricingPlans: true,
          featureHighlights: true,
          testimonials: true,
        },
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch system settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    // Remove nested relations from update data
    const { socialMediaLinks, pricingPlans, featureHighlights, testimonials, ...settingsData } = updateData;

    const settings = await prisma.systemSettings.update({
      where: { id },
      data: settingsData,
      include: {
        socialMediaLinks: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        pricingPlans: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        featureHighlights: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        testimonials: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error updating system settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update system settings' },
      { status: 500 }
    );
  }
}

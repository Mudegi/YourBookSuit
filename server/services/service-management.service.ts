/**
 * Service Management Service
 * Handles service catalog, activities, and delivery management
 */

import { PrismaClient, Prisma, Decimal } from '@prisma/client';
import { 
  ServiceType, 
  ServicePricingModel, 
  ServiceSkillLevel,
  ServiceDeliveryStatus,
  ServiceBookingStatus,
  ActivityStatus,
  ServiceWorkType,
  ResourceAvailability
} from '@prisma/client';

export interface ServiceCatalogInput {
  serviceCode: string;
  name: string;
  description?: string;
  serviceType: ServiceType;
  category?: string;
  pricingModel: ServicePricingModel;
  unitOfMeasure?: string;
  standardRate?: number;
  standardDuration?: number; // in minutes
  skillLevel?: ServiceSkillLevel;
  department?: string;
  isBillable?: boolean;
  isInternal?: boolean;
  requiresApproval?: boolean;
  autoScheduling?: boolean;
  allowOnlineBooking?: boolean;
  minimumBookingHours?: number;
  maximumBookingHours?: number;
  advanceBookingHours?: number;
  cancellationHours?: number;
  serviceUrl?: string;
  serviceIcon?: string;
  tags?: string[];
  metadata?: any;
}

export interface ServiceActivityInput {
  activityCode: string;
  name: string;
  description?: string;
  sequence?: number;
  estimatedHours?: number;
  standardRate?: number;
  skillRequired?: ServiceSkillLevel;
  isOptional?: boolean;
  isMilestone?: boolean;
  dependencies?: string[];
  deliverables?: string[];
  qualityChecks?: string[];
}

export interface ServiceBookingInput {
  serviceCatalogId?: string;
  offeringId?: string;
  customerId: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  requestedDate: Date;
  location?: string;
  specialRequests?: string;
  estimatedHours?: number;
  quotedPrice?: number;
  paymentTerms?: string;
  notes?: string;
}

export interface ServiceDeliveryInput {
  serviceCatalogId: string;
  customerId?: string;
  projectId?: string;
  bookingId?: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  assignedTo: string[];
  location?: string;
  clientContactName?: string;
  clientContactEmail?: string;
  clientContactPhone?: string;
  estimatedHours: number;
  deliverables?: string[];
  completionCriteria?: string[];
  signOffRequired?: boolean;
  notes?: string;
}

export interface TimeEntryInput {
  deliveryId: string;
  entryDate: Date;
  startTime: Date;
  endTime?: Date;
  durationHours: number;
  description: string;
  workType?: ServiceWorkType;
  isBillable?: boolean;
  hourlyRate?: number;
}

export class ServiceManagementService {
  constructor(private prisma: PrismaClient) {}

  // ============================================================================
  // SERVICE CATALOG MANAGEMENT
  // ============================================================================

  /**
   * Create a new service in the catalog
   */
  async createService(organizationId: string, input: ServiceCatalogInput) {
    // Check for duplicate service code
    const existing = await this.prisma.serviceCatalog.findFirst({
      where: {
        organizationId,
        serviceCode: input.serviceCode,
      },
    });

    if (existing) {
      throw new Error(`Service code ${input.serviceCode} already exists`);
    }

    return this.prisma.serviceCatalog.create({
      data: {
        organizationId,
        ...input,
        standardRate: input.standardRate ? new Decimal(input.standardRate) : null,
        isActive: true,
      },
      include: {
        activities: true,
        offerings: true,
      },
    });
  }

  /**
   * Get service catalog with filtering and search
   */
  async getServiceCatalog(
    organizationId: string, 
    filters: {
      serviceType?: ServiceType;
      category?: string;
      department?: string;
      isActive?: boolean;
      isBillable?: boolean;
      search?: string;
    } = {}
  ) {
    const where: Prisma.ServiceCatalogWhereInput = {
      organizationId,
      ...(filters.serviceType && { serviceType: filters.serviceType }),
      ...(filters.category && { category: filters.category }),
      ...(filters.department && { department: filters.department }),
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.isBillable !== undefined && { isBillable: filters.isBillable }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { serviceCode: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.serviceCatalog.findMany({
      where,
      include: {
        activities: {
          where: { isActive: true },
          orderBy: { sequence: 'asc' },
        },
        offerings: {
          where: { isActive: true },
        },
        resources: {
          where: { isActive: true },
        },
        _count: {
          select: {
            deliveries: true,
            bookings: true,
          },
        },
      },
      orderBy: [
        { serviceType: 'asc' },
        { category: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Add activities to a service
   */
  async addServiceActivities(
    organizationId: string,
    serviceCatalogId: string,
    activities: ServiceActivityInput[]
  ) {
    const service = await this.prisma.serviceCatalog.findFirst({
      where: { id: serviceCatalogId, organizationId },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    const createData = activities.map(activity => ({
      organizationId,
      serviceCatalogId,
      ...activity,
      standardRate: activity.standardRate ? new Decimal(activity.standardRate) : null,
      estimatedHours: activity.estimatedHours ? new Decimal(activity.estimatedHours) : null,
      sequence: activity.sequence || 1,
      skillRequired: activity.skillRequired || 'STANDARD',
      dependencies: activity.dependencies || [],
      deliverables: activity.deliverables || [],
      qualityChecks: activity.qualityChecks || [],
    }));

    return this.prisma.serviceActivity.createMany({
      data: createData,
    });
  }

  // ============================================================================
  // SERVICE BOOKING MANAGEMENT
  // ============================================================================

  /**
   * Create a service booking
   */
  async createBooking(organizationId: string, input: ServiceBookingInput, userId: string) {
    const bookingNumber = await this.generateBookingNumber(organizationId);

    const booking = await this.prisma.serviceBooking.create({
      data: {
        organizationId,
        bookingNumber,
        ...input,
        quotedPrice: input.quotedPrice ? new Decimal(input.quotedPrice) : null,
        estimatedHours: input.estimatedHours ? new Decimal(input.estimatedHours) : null,
        status: 'REQUESTED',
        bookingDate: new Date(),
      },
      include: {
        serviceCatalog: {
          include: {
            activities: true,
          },
        },
        customer: true,
      },
    });

    // Auto-approve for internal services or if auto-approval is enabled
    const service = booking.serviceCatalog;
    if (service && (service.isInternal || !service.requiresApproval)) {
      await this.approveBooking(organizationId, booking.id, userId);
    }

    return booking;
  }

  /**
   * Approve a service booking
   */
  async approveBooking(organizationId: string, bookingId: string, userId: string) {
    const booking = await this.prisma.serviceBooking.findFirst({
      where: { id: bookingId, organizationId },
      include: { serviceCatalog: true },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== 'REQUESTED') {
      throw new Error('Booking is not in a state to be approved');
    }

    const updatedBooking = await this.prisma.serviceBooking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        approvedBy: userId,
        approvedDate: new Date(),
        approvedPrice: booking.quotedPrice,
      },
    });

    // Auto-create delivery if service supports it
    if (booking.serviceCatalog?.autoScheduling) {
      await this.createDeliveryFromBooking(organizationId, bookingId);
    }

    return updatedBooking;
  }

  // ============================================================================
  // SERVICE DELIVERY MANAGEMENT
  // ============================================================================

  /**
   * Create a service delivery
   */
  async createDelivery(organizationId: string, input: ServiceDeliveryInput) {
    const deliveryNumber = await this.generateDeliveryNumber(organizationId);

    return this.prisma.serviceDelivery.create({
      data: {
        organizationId,
        deliveryNumber,
        ...input,
        estimatedHours: new Decimal(input.estimatedHours),
        status: 'PLANNED',
        progress: 0,
        assignedTo: input.assignedTo || [],
        deliverables: input.deliverables || [],
        completionCriteria: input.completionCriteria || [],
      },
      include: {
        serviceCatalog: {
          include: {
            activities: {
              where: { isActive: true },
              orderBy: { sequence: 'asc' },
            },
          },
        },
        customer: true,
        booking: true,
      },
    });
  }

  /**
   * Create delivery from approved booking
   */
  private async createDeliveryFromBooking(organizationId: string, bookingId: string) {
    const booking = await this.prisma.serviceBooking.findFirst({
      where: { id: bookingId, organizationId },
      include: { serviceCatalog: true },
    });

    if (!booking || !booking.serviceCatalog) {
      throw new Error('Booking or service not found');
    }

    const deliveryInput: ServiceDeliveryInput = {
      serviceCatalogId: booking.serviceCatalogId!,
      customerId: booking.customerId,
      bookingId: booking.id,
      plannedStartDate: booking.requestedDate,
      plannedEndDate: new Date(booking.requestedDate.getTime() + (booking.estimatedHours?.toNumber() || 1) * 60 * 60 * 1000),
      assignedTo: [], // Will be assigned later
      location: booking.location || '',
      clientContactName: booking.contactName || '',
      clientContactEmail: booking.contactEmail || '',
      clientContactPhone: booking.contactPhone || '',
      estimatedHours: booking.estimatedHours?.toNumber() || 1,
      signOffRequired: booking.serviceCatalog.requiresApproval,
    };

    return this.createDelivery(organizationId, deliveryInput);
  }

  /**
   * Get service deliveries with filtering
   */
  async getDeliveries(
    organizationId: string,
    filters: {
      status?: ServiceDeliveryStatus;
      assignedTo?: string;
      customerId?: string;
      serviceCatalogId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ) {
    const where: Prisma.ServiceDeliveryWhereInput = {
      organizationId,
      ...(filters.status && { status: filters.status }),
      ...(filters.customerId && { customerId: filters.customerId }),
      ...(filters.serviceCatalogId && { serviceCatalogId: filters.serviceCatalogId }),
      ...(filters.assignedTo && {
        assignedTo: {
          has: filters.assignedTo,
        },
      }),
      ...(filters.dateFrom && {
        plannedStartDate: {
          gte: filters.dateFrom,
        },
      }),
      ...(filters.dateTo && {
        plannedEndDate: {
          lte: filters.dateTo,
        },
      }),
    };

    return this.prisma.serviceDelivery.findMany({
      where,
      include: {
        serviceCatalog: true,
        customer: true,
        booking: true,
        activityEntries: {
          include: {
            activity: true,
          },
          orderBy: { startTime: 'asc' },
        },
        timeEntries: {
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { plannedStartDate: 'asc' },
    });
  }

  /**
   * Start service delivery
   */
  async startDelivery(organizationId: string, deliveryId: string, userId: string) {
    const delivery = await this.prisma.serviceDelivery.findFirst({
      where: { id: deliveryId, organizationId },
    });

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    if (delivery.status !== 'PLANNED' && delivery.status !== 'SCHEDULED') {
      throw new Error('Delivery cannot be started');
    }

    return this.prisma.serviceDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'IN_PROGRESS',
        actualStartDate: new Date(),
      },
    });
  }

  // ============================================================================
  // TIME TRACKING
  // ============================================================================

  /**
   * Log time entry for service delivery
   */
  async logTimeEntry(organizationId: string, userId: string, input: TimeEntryInput) {
    const delivery = await this.prisma.serviceDelivery.findFirst({
      where: { id: input.deliveryId, organizationId },
    });

    if (!delivery) {
      throw new Error('Service delivery not found');
    }

    const totalAmount = input.hourlyRate && input.isBillable 
      ? new Decimal(input.hourlyRate).mul(new Decimal(input.durationHours))
      : null;

    return this.prisma.serviceTimeEntry.create({
      data: {
        organizationId,
        userId,
        ...input,
        durationHours: new Decimal(input.durationHours),
        hourlyRate: input.hourlyRate ? new Decimal(input.hourlyRate) : null,
        totalAmount,
        workType: input.workType || 'DELIVERY',
        isBillable: input.isBillable !== false,
      },
    });
  }

  /**
   * Get time entries for reporting
   */
  async getTimeEntries(
    organizationId: string,
    filters: {
      deliveryId?: string;
      userId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      isBillable?: boolean;
    } = {}
  ) {
    const where: Prisma.ServiceTimeEntryWhereInput = {
      organizationId,
      ...(filters.deliveryId && { deliveryId: filters.deliveryId }),
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.isBillable !== undefined && { isBillable: filters.isBillable }),
      ...(filters.dateFrom && {
        entryDate: {
          gte: filters.dateFrom,
        },
      }),
      ...(filters.dateTo && {
        entryDate: {
          lte: filters.dateTo,
        },
      }),
    };

    return this.prisma.serviceTimeEntry.findMany({
      where,
      include: {
        delivery: {
          include: {
            serviceCatalog: true,
            customer: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { entryDate: 'desc' },
    });
  }

  // ============================================================================
  // REPORTING AND ANALYTICS
  // ============================================================================

  /**
   * Get service performance metrics
   */
  async getServiceMetrics(organizationId: string, dateFrom?: Date, dateTo?: Date) {
    const dateFilter = {
      ...(dateFrom && { gte: dateFrom }),
      ...(dateTo && { lte: dateTo }),
    };

    const [
      totalServices,
      activeDeliveries,
      completedDeliveries,
      totalRevenue,
      utilizationData
    ] = await Promise.all([
      // Total services in catalog
      this.prisma.serviceCatalog.count({
        where: { organizationId, isActive: true },
      }),

      // Active deliveries
      this.prisma.serviceDelivery.count({
        where: {
          organizationId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          ...(Object.keys(dateFilter).length > 0 && {
            plannedStartDate: dateFilter,
          }),
        },
      }),

      // Completed deliveries
      this.prisma.serviceDelivery.count({
        where: {
          organizationId,
          status: 'COMPLETED',
          ...(Object.keys(dateFilter).length > 0 && {
            actualEndDate: dateFilter,
          }),
        },
      }),

      // Total revenue from billable time
      this.prisma.serviceTimeEntry.aggregate({
        where: {
          organizationId,
          isBillable: true,
          invoiced: true,
          ...(Object.keys(dateFilter).length > 0 && {
            entryDate: dateFilter,
          }),
        },
        _sum: {
          totalAmount: true,
        },
      }),

      // Utilization data
      this.prisma.serviceTimeEntry.groupBy({
        by: ['userId'],
        where: {
          organizationId,
          ...(Object.keys(dateFilter).length > 0 && {
            entryDate: dateFilter,
          }),
        },
        _sum: {
          durationHours: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    return {
      totalServices,
      activeDeliveries,
      completedDeliveries,
      totalRevenue: totalRevenue._sum.totalAmount || new Decimal(0),
      averageUtilization: utilizationData.length > 0 
        ? utilizationData.reduce((acc, u) => acc.add(u._sum.durationHours || 0), new Decimal(0)).div(utilizationData.length)
        : new Decimal(0),
      utilization: utilizationData,
    };
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  private async generateBookingNumber(organizationId: string): Promise<string> {
    const today = new Date();
    const prefix = `BK${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    const lastBooking = await this.prisma.serviceBooking.findFirst({
      where: {
        organizationId,
        bookingNumber: { startsWith: prefix },
      },
      orderBy: { bookingNumber: 'desc' },
    });

    const sequence = lastBooking 
      ? parseInt(lastBooking.bookingNumber.slice(-4)) + 1
      : 1;

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  private async generateDeliveryNumber(organizationId: string): Promise<string> {
    const today = new Date();
    const prefix = `SD${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    const lastDelivery = await this.prisma.serviceDelivery.findFirst({
      where: {
        organizationId,
        deliveryNumber: { startsWith: prefix },
      },
      orderBy: { deliveryNumber: 'desc' },
    });

    const sequence = lastDelivery 
      ? parseInt(lastDelivery.deliveryNumber.slice(-4)) + 1
      : 1;

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }
}
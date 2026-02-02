import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/access';
import prisma from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireOrgMembership(user.id, params.orgSlug);

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const linkedEntityType = formData.get('linkedEntityType') as string; // INVOICE, BILL, TRANSACTION
    const linkedEntityId = formData.get('linkedEntityId') as string;
    const tags = formData.get('tags') as string;
    const notes = formData.get('notes') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: PDF, PNG, JPEG, DOC, DOCX' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // For now, create a storage URL stub (in production, upload to S3/GCS/Azure Blob)
    const fileUrl = `/uploads/${org.slug}/${Date.now()}_${file.name}`;

    // Prepare document data
    const documentData: any = {
      organizationId: org.id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl,
      status: 'UPLOADED', // Will be updated to PROCESSING then EXTRACTED after OCR
      uploadedBy: user.id,
      uploadedAt: new Date(),
      tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
      notes,
    };

    // Link to entity if provided
    if (linkedEntityType && linkedEntityId) {
      const linkedEntities: any = {};
      
      if (linkedEntityType === 'INVOICE') {
        // Verify invoice exists and belongs to org
        const invoice = await prisma.invoice.findUnique({
          where: { id: linkedEntityId },
        });
        if (!invoice || invoice.organizationId !== org.id) {
          return NextResponse.json(
            { error: 'Invoice not found' },
            { status: 404 }
          );
        }
        documentData.invoiceId = linkedEntityId;
        linkedEntities.invoiceNumber = invoice.invoiceNumber;
      } else if (linkedEntityType === 'BILL') {
        const bill = await prisma.bill.findUnique({
          where: { id: linkedEntityId },
        });
        if (!bill || bill.organizationId !== org.id) {
          return NextResponse.json(
            { error: 'Bill not found' },
            { status: 404 }
          );
        }
        documentData.billId = linkedEntityId;
        linkedEntities.billNumber = bill.billNumber;
      } else if (linkedEntityType === 'TRANSACTION') {
        const transaction = await prisma.transaction.findUnique({
          where: { id: linkedEntityId },
        });
        if (!transaction || transaction.organizationId !== org.id) {
          return NextResponse.json(
            { error: 'Transaction not found' },
            { status: 404 }
          );
        }
        documentData.transactionId = linkedEntityId;
        linkedEntities.transactionId = linkedEntityId;
      }

      documentData.linkedEntities = linkedEntities;
    }

    // Create document record
    const document = await prisma.document.create({
      data: documentData,
    });

    // Queue OCR processing (stub - in production, enqueue to worker)
    // For now, just set as PROCESSING
    await prisma.document.update({
      where: { id: document.id },
      data: { status: 'PROCESSING' },
    });

    // In production: enqueue to notification/OCR worker
    console.log(`[OCR STUB] Processing document ${document.id}...`);

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'CREATE',
        entityType: 'DOCUMENT',
        entityId: document.id,
        changes: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          linkedEntity: linkedEntityType || null,
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        document,
        message: 'Document uploaded. OCR processing queued.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireOrgMembership(user.id, params.orgSlug);

    const org = await prisma.organization.findUnique({
      where: { slug: params.orgSlug },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    // Build filter
    const where: any = { organizationId: org.id };
    if (status) where.status = status;
    if (entityId) {
      where.OR = [
        { transactionId: entityId },
        { invoiceId: entityId },
        { billId: entityId },
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      include: { uploadedByUser: { select: { firstName: true, lastName: true } } },
      orderBy: { uploadedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

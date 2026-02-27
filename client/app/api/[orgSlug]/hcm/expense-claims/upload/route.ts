import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireOrgMembership, ensurePermission } from '@/lib/access';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST /api/[orgSlug]/hcm/expense-claims/upload
export async function POST(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { org, membership } = await requireOrgMembership(user.id, params.orgSlug);
    ensurePermission(membership.role, 'create');

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Allowed: JPEG, PNG, WebP, PDF',
      }, { status: 400 });
    }

    // Validate file size (max 10 MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum 10 MB.' }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', org.slug, 'receipts');
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'bin';
    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Return public URL
    const fileUrl = `/uploads/${org.slug}/receipts/${uniqueName}`;

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
      },
    });
  } catch (error: any) {
    console.error('Receipt upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

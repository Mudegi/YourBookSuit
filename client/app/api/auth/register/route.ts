/**
 * Register API Route
 * POST /api/auth/register
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, createToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { UserRole } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, phone } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        isActive: true,
        emailVerified: false,
      },
    });

    // Create a default organization for the user
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const organization = await prisma.organization.create({
      data: {
        name: `${firstName}'s Company`,
        slug: `${firstName.toLowerCase()}-${user.id.substring(0, 8)}`,
        baseCurrency: 'USD',
        fiscalYearStart: 1,
        isActive: true,
        subscriptionStatus: 'TRIAL',
        trialStartDate: trialStart,
        trialEndDate: trialEnd,
      },
    });

    // Link user to organization as ADMIN
    await prisma.organizationUser.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    // Create session token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      organizationId: organization.id,
      role: UserRole.ADMIN,
    });

    // Return token in response so the client can store it in localStorage
    const response = NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        role: UserRole.ADMIN,
      },
      message: 'Registration successful',
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const getUserPassword = () => process.env.USER_PASSWORD || 'good939ramadan';
const getAdminSecret = () => process.env.ADMIN_SECRET || 'gastro_admin_2024_secret';
const getExpirationDays = () => parseInt(process.env.ACCESS_EXPIRATION_DAYS || '7', 10);

// Verify session token
async function verifyToken(token: string | null) {
  if (!token) return null;
  
  try {
    const session = await db.accessSession.findUnique({
      where: { token }
    });
    
    if (!session || new Date() > session.expiresAt) {
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
}

// POST - Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, isAdmin } = body;

    // Admin login
    if (isAdmin) {
      if (password === getAdminSecret()) {
        return NextResponse.json({ 
          success: true, 
          isAdmin: true
        });
      }
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    // Get or create access control
    let accessControl = await db.accessControl.findFirst();
    if (!accessControl) {
      accessControl = await db.accessControl.create({
        data: {
          isEnabled: true,
          password: getUserPassword()
        }
      });
    }

    // Check if access is enabled
    if (!accessControl.isEnabled) {
      return NextResponse.json({ error: 'Access disabled' }, { status: 403 });
    }

    // Check expiration
    if (accessControl.expiresAt && new Date() > accessControl.expiresAt) {
      return NextResponse.json({ error: 'Access expired' }, { status: 403 });
    }

    // Verify password
    if (password !== getUserPassword() && password !== accessControl.password) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    // Create session
    const expirationDays = getExpirationDays();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const token = crypto.randomUUID();

    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0].trim() || realIp || null;

    await db.accessSession.create({
      data: {
        token,
        expiresAt,
        userAgent: request.headers.get('user-agent'),
        ipAddress
      }
    });

    // Set global expiration on first access
    if (!accessControl.expiresAt) {
      try {
        const globalExpiry = new Date();
        globalExpiry.setDate(globalExpiry.getDate() + expirationDays);
        
        await db.accessControl.update({
          where: { id: accessControl.id },
          data: { expiresAt: globalExpiry }
        });
      } catch {
        // Ignore race condition
      }
    }

    const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (86400000));

    return NextResponse.json({ 
      success: true, 
      token,
      expiresAt: expiresAt.toISOString(),
      daysRemaining
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

// GET - Check session
export async function GET(request: NextRequest) {
  const token = request.headers.get('x-session-token');
  const session = await verifyToken(token);
  
  if (!session) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
  
  const accessControl = await db.accessControl.findFirst();
  
  if (accessControl && !accessControl.isEnabled) {
    return NextResponse.json({ valid: false, reason: 'disabled' }, { status: 401 });
  }
  
  if (accessControl?.expiresAt && new Date() > accessControl.expiresAt) {
    return NextResponse.json({ valid: false, reason: 'expired' }, { status: 401 });
  }
  
  return NextResponse.json({ valid: true });
}

// DELETE - Logout
export async function DELETE(request: NextRequest) {
  const token = request.headers.get('x-session-token');
  
  if (token) {
    try {
      await db.accessSession.deleteMany({ where: { token } });
    } catch {}
  }

  return NextResponse.json({ success: true });
}

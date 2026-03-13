import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const getAdminSecret = () => process.env.ADMIN_SECRET || 'gastro_admin_2024_secret';
const getExpirationDays = () => parseInt(process.env.ACCESS_EXPIRATION_DAYS || '7', 10);

function verifyAdmin(auth: string | null) {
  return auth === getAdminSecret();
}

// GET - Get status
export async function GET(request: NextRequest) {
  const auth = request.headers.get('x-admin-secret');
  
  if (!verifyAdmin(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accessControl = await db.accessControl.findFirst();
    const sessions = await db.accessSession.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { progress: true } }
      }
    });
    
    const questionsCount = await db.question.count();

    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (accessControl?.expiresAt) {
      const diff = accessControl.expiresAt.getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diff / 86400000));
    }

    return NextResponse.json({
      accessControl: accessControl ? {
        ...accessControl,
        daysRemaining
      } : null,
      sessions: sessions.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        progressCount: s._count.progress
      })),
      sessionsCount: sessions.length,
      activeSessionsCount: sessions.filter(s => new Date() < s.expiresAt).length,
      questionsCount
    });
  } catch (error) {
    console.error('Admin GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// PATCH - Update settings
export async function PATCH(request: NextRequest) {
  const auth = request.headers.get('x-admin-secret');
  
  if (!verifyAdmin(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { isEnabled, resetExpiration } = body;

    const accessControl = await db.accessControl.findFirst();
    
    if (!accessControl) {
      return NextResponse.json({ error: 'Access control not found' }, { status: 404 });
    }

    const updateData: any = {};
    
    if (typeof isEnabled === 'boolean') {
      updateData.isEnabled = isEnabled;
    }
    
    if (resetExpiration) {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + getExpirationDays());
      updateData.expiresAt = newExpiry;
    }

    const updated = await db.accessControl.update({
      where: { id: accessControl.id },
      data: updateData
    });

    return NextResponse.json({ success: true, accessControl: updated });
  } catch (error) {
    console.error('Admin PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE - Revoke sessions
export async function DELETE(request: NextRequest) {
  const auth = request.headers.get('x-admin-secret');
  
  if (!verifyAdmin(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const revokeAll = searchParams.get('all') === 'true';

    if (sessionId) {
      await db.accessSession.delete({ where: { id: sessionId } });
      return NextResponse.json({ success: true, message: 'Session revoked' });
    } else if (revokeAll) {
      await db.accessSession.deleteMany();
      return NextResponse.json({ success: true, message: 'All sessions revoked' });
    }
    
    return NextResponse.json({ error: 'Specify sessionId or all=true' }, { status: 400 });
  } catch (error) {
    console.error('Admin DELETE error:', error);
    return NextResponse.json({ error: 'Failed to revoke sessions' }, { status: 500 });
  }
}

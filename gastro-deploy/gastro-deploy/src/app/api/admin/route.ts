import { NextRequest, NextResponse } from 'next/server';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'gastro_admin_2024_secret';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('x-admin-secret');
  
  if (auth !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Simple stats without database
  return NextResponse.json({
    accessControl: {
      isEnabled: true,
      password: process.env.USER_PASSWORD || 'good939ramadan',
      expiresAt: null,
      daysRemaining: 7
    },
    sessions: [],
    sessionsCount: 0,
    activeSessionsCount: 0,
    questionsCount: 300
  });
}

export async function PATCH(request: NextRequest) {
  const auth = request.headers.get('x-admin-secret');
  
  if (auth !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const auth = request.headers.get('x-admin-secret');
  
  if (auth !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ success: true, message: 'Sessions cleared' });
}

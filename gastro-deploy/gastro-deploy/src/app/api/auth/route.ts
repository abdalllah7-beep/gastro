import { NextRequest, NextResponse } from 'next/server';

const USER_PASSWORD = process.env.USER_PASSWORD || 'good939ramadan';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'gastro_admin_2024_secret';
const EXPIRATION_DAYS = parseInt(process.env.ACCESS_EXPIRATION_DAYS || '7', 10);

// Simple auth without database for initial setup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, isAdmin } = body;

    // Admin check
    if (isAdmin) {
      return password === ADMIN_SECRET
        ? NextResponse.json({ success: true, isAdmin: true })
        : NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // User check - just validate password
    if (password !== USER_PASSWORD) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    // Generate token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + EXPIRATION_DAYS);

    return NextResponse.json({ 
      success: true, 
      token,
      expiresAt: expiresAt.toISOString(),
      daysRemaining: EXPIRATION_DAYS
    });

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET - check token
export async function GET(request: NextRequest) {
  const token = request.headers.get('x-session-token');
  // For now, just return valid if token exists
  return NextResponse.json({ valid: !!token });
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Verify session
async function verifySession(token: string | null) {
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

// GET - Fetch progress
export async function GET(request: NextRequest) {
  const token = request.headers.get('x-session-token');
  const session = await verifySession(token);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const progress = await db.userProgress.findMany({
      where: { sessionId: session.id }
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Progress fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}

// POST - Save answer
export async function POST(request: NextRequest) {
  const token = request.headers.get('x-session-token');
  const session = await verifySession(token);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { questionId, userAnswer, isCorrect } = body;

    const existing = await db.userProgress.findUnique({
      where: {
        sessionId_questionId: {
          sessionId: session.id,
          questionId
        }
      }
    });

    let progress;
    if (existing) {
      progress = await db.userProgress.update({
        where: {
          sessionId_questionId: {
            sessionId: session.id,
            questionId
          }
        },
        data: {
          userAnswer,
          isCorrect,
          answeredAt: new Date()
        }
      });
    } else {
      progress = await db.userProgress.create({
        data: {
          sessionId: session.id,
          questionId,
          userAnswer,
          isCorrect
        }
      });
    }

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error('Progress save error:', error);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}

// PUT - Toggle star or update note
export async function PUT(request: NextRequest) {
  const token = request.headers.get('x-session-token');
  const session = await verifySession(token);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { questionId, isStarred, note } = body;

    const progress = await db.userProgress.update({
      where: {
        sessionId_questionId: {
          sessionId: session.id,
          questionId
        }
      },
      data: {
        ...(isStarred !== undefined && { isStarred }),
        ...(note !== undefined && { note })
      }
    });

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error('Progress update error:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}

// DELETE - Reset progress
export async function DELETE(request: NextRequest) {
  const token = request.headers.get('x-session-token');
  const session = await verifySession(token);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await db.userProgress.deleteMany({
      where: { sessionId: session.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Progress reset error:', error);
    return NextResponse.json({ error: 'Failed to reset progress' }, { status: 500 });
  }
}

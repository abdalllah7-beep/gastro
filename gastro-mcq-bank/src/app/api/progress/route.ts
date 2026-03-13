import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory progress storage (resets on server restart)
// For persistent storage, use Prisma with PostgreSQL
const progressStore = new Map<string, Map<number, any>>();

function getSessionProgress(token: string) {
  if (!progressStore.has(token)) {
    progressStore.set(token, new Map());
  }
  return progressStore.get(token)!;
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('x-session-token');
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const progress = getSessionProgress(token);
  const progressArray = Array.from(progress.entries()).map(([questionId, data]) => ({
    questionId,
    ...data
  }));

  return NextResponse.json({ progress: progressArray });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-session-token');
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { questionId, userAnswer, isCorrect } = body;

    const progress = getSessionProgress(token);
    progress.set(questionId, {
      userAnswer,
      isCorrect,
      isStarred: progress.get(questionId)?.isStarred || false,
      answeredAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get('x-session-token');
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { questionId, isStarred } = body;

    const progress = getSessionProgress(token);
    const existing = progress.get(questionId) || {};
    
    progress.set(questionId, {
      ...existing,
      isStarred
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.headers.get('x-session-token');
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  progressStore.delete(token);
  return NextResponse.json({ success: true });
}

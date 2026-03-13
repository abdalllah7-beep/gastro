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

// GET - Fetch questions
export async function GET(request: NextRequest) {
  const token = request.headers.get('x-session-token');
  const session = await verifySession(token);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const chapter = searchParams.get('chapter');

    // Check if questions exist, if not seed from JSON
    const count = await db.question.count();
    if (count === 0) {
      // Initialize from questions.json
      const questionsData = require('../../../../questions.json');
      
      for (let i = 0; i < questionsData.length; i += 30) {
        const batch = questionsData.slice(i, i + 30);
        const formatted = batch.map((q: any) => ({
          id: q.id,
          chapter: q.ch || '',
          topic: q.tp || '',
          question: q.q || '',
          optionA: q.opts?.[0] || '',
          optionB: q.opts?.[1] || '',
          optionC: q.opts?.[2] || '',
          optionD: q.opts?.[3] || '',
          optionE: q.opts?.[4] || null,
          answer: q.ans || '',
          answerText: q.ansTxt || '',
          explanation: q.exp || '',
          keyPoints: JSON.stringify(q.kp || []),
          imageUrl: q.img || null
        }));

        try {
          await db.question.createMany({
            data: formatted,
            skipDuplicates: true
          });
        } catch {}
      }
    }

    if (id) {
      const question = await db.question.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      }
      
      // Map to frontend format
      return NextResponse.json({ 
        question: {
          ...question,
          keyPoints: question.keyPoints
        }
      });
    }

    if (chapter) {
      const questions = await db.question.findMany({
        where: { chapter },
        orderBy: { id: 'asc' }
      });
      return NextResponse.json({ questions });
    }

    // Fetch all questions
    const questions = await db.question.findMany({
      orderBy: { id: 'asc' }
    });

    // Map keyPoints for frontend
    const mappedQuestions = questions.map(q => ({
      ...q,
      keyPoints: q.keyPoints
    }));

    const chapters = await db.question.groupBy({
      by: ['chapter'],
      _count: { id: true },
      orderBy: { chapter: 'asc' }
    });

    return NextResponse.json({ 
      questions: mappedQuestions,
      chapters: chapters.map(c => ({ name: c.chapter, count: c._count.id })),
      total: questions.length
    });
  } catch (error) {
    console.error('Questions fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Initialize database - call this endpoint to seed questions
export async function GET() {
  try {
    // Check if questions exist
    const count = await db.question.count();
    if (count > 0) {
      return NextResponse.json({ 
        initialized: true, 
        questions: count,
        message: 'Database already initialized'
      });
    }

    // Create access control if not exists
    const existingControl = await db.accessControl.findFirst();
    if (!existingControl) {
      await db.accessControl.create({
        data: {
          isEnabled: true,
          password: process.env.USER_PASSWORD || 'good939ramadan'
        }
      });
    }

    // Load questions from JSON
    // @ts-ignore - importing JSON
    const questionsData = require('../../../questions.json');
    
    let inserted = 0;
    const batchSize = 20;
    
    for (let i = 0; i < questionsData.length; i += batchSize) {
      const batch = questionsData.slice(i, i + batchSize);
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
        inserted += batch.length;
      } catch (e) {
        console.log('Batch error:', e);
      }
    }

    return NextResponse.json({ 
      initialized: true, 
      questions: inserted,
      message: `Successfully seeded ${inserted} questions`
    });
  } catch (error: any) {
    console.error('Init error:', error);
    return NextResponse.json({ 
      initialized: false, 
      error: error.message 
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

// Import questions from root
import questionsData from '../../../../questions.json';

// Serve questions directly from JSON - no database needed!
export async function GET() {
  try {
    // Transform to frontend format
    const questions = (questionsData as any[]).map((q: any) => ({
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

    // Get unique chapters
    const chapterMap = new Map<string, number>();
    questions.forEach((q: any) => {
      const ch = q.chapter;
      chapterMap.set(ch, (chapterMap.get(ch) || 0) + 1);
    });

    const chapters = Array.from(chapterMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ 
      questions,
      chapters,
      total: questions.length
    });
  } catch (error) {
    console.error('Questions error:', error);
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    env: process.env.NODE_ENV,
    message: 'Gastro MCQ Bank is running'
  });
}

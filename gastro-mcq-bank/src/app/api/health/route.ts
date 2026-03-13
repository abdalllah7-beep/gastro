import { NextResponse } from 'next/server';

// Health check - works even without database
export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  
  return NextResponse.json({
    status: dbUrl ? 'database_configured' : 'database_missing',
    hasDb: !!dbUrl,
    env: process.env.NODE_ENV,
    message: dbUrl 
      ? 'Database URL is set. Run prisma db push to create tables.'
      : 'Add DATABASE_URL environment variable in Vercel settings.'
  });
}

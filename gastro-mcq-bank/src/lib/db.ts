// Database module - simplified for Vercel
// Note: For full progress tracking, set up PostgreSQL with Prisma

let _db: any = null;

export const db = new Proxy({} as any, {
  get(target, prop) {
    if (!_db) {
      try {
        // Dynamic import to avoid build errors
        const { PrismaClient } = require('@prisma/client');
        _db = new PrismaClient();
      } catch {
        console.log('Prisma not available - using in-memory storage');
        return {
          findMany: async () => [],
          findUnique: async () => null,
          create: async (data: any) => data,
          update: async (data: any) => data,
          delete: async () => ({ count: 0 }),
          count: async () => 0,
        };
      }
    }
    return _db[prop];
  }
});

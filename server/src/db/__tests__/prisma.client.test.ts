import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaInstance = { $disconnect: vi.fn() };
const prismaClientConstructor = vi.fn(() => prismaInstance);

vi.mock('@prisma/client', () => ({
  PrismaClient: prismaClientConstructor,
}));

describe('prisma client singleton', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    prismaClientConstructor.mockClear();
    delete (global as Record<string, unknown>).prisma;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete (global as Record<string, unknown>).prisma;
  });

  it('reuses existing global prisma instance when present', async () => {
    (global as Record<string, unknown>).prisma = prismaInstance;

    const { prisma } = await import('../prisma.client');

    expect(prismaClientConstructor).not.toHaveBeenCalled();
    expect(prisma).toBe(prismaInstance);
  });

  it('creates and caches client in non-production environments', async () => {
    process.env.NODE_ENV = 'development';

    const { prisma } = await import('../prisma.client');

    expect(prismaClientConstructor).toHaveBeenCalledTimes(1);
    expect(prisma).toBe(prismaInstance);
    expect((global as Record<string, unknown>).prisma).toBe(prismaInstance);
  });

  it('creates client without caching in production', async () => {
    process.env.NODE_ENV = 'production';

    const { prisma } = await import('../prisma.client');

    expect(prismaClientConstructor).toHaveBeenCalledTimes(1);
    expect(prisma).toBe(prismaInstance);
    expect((global as Record<string, unknown>).prisma).toBeUndefined();
  });
});

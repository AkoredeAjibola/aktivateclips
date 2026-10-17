import { UsersService } from './users.service.js';

describe('UsersService', () => {
  it('should save a new user to the database and return a public user', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'ada@example.com',
          passwordHash: 'hashed-password',
          name: 'Ada Stone',
          role: 'CLIENT',
          status: 'PENDING',
          isVerified: false,
          companyName: null,
          niche: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    };

    const service = new UsersService(prisma as any);

    const result = await service.create({
      email: 'Ada@Example.com',
      password: 'StrongPass123',
      name: 'Ada Stone',
      role: 'client',
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'ada@example.com',
          role: 'CLIENT',
          status: 'PENDING',
        }),
      }),
    );
    expect(result.email).toBe('ada@example.com');
    expect(result.role).toBe('client');
    expect(result).not.toHaveProperty('passwordHash');
  });
});

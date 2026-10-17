import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  it('should accept fullName as a registration alias for name', async () => {
    const usersService = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockReturnValue({
        id: 'user-1',
        email: 'ada@example.com',
        name: 'Ada Stone',
        role: 'client',
        isVerified: false,
      }),
    };
    const emailService = {
      sendVerificationEmail: vi.fn().mockResolvedValue({}),
      sendPasswordResetEmail: vi.fn().mockResolvedValue({}),
    };

    const service = new AuthService(usersService as any, emailService as any);

    const result = await service.register({
      email: 'ada@example.com',
      password: 'StrongPass123',
      fullName: 'Ada Stone',
      role: 'client',
    } as any);

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ada Stone',
        email: 'ada@example.com',
        role: 'client',
      }),
    );
    expect(result.user.name).toBe('Ada Stone');
    expect(result.requiresEmailVerification).toBe(true);
    expect(result).not.toHaveProperty('accessToken');
  });

  it('should reject duplicate email registrations', async () => {
    const usersService = {
      findByEmail: vi.fn().mockResolvedValue({ id: 'user-1', email: 'ada@example.com', isVerified: false }),
      create: vi.fn(),
    };
    const emailService = {
      sendVerificationEmail: vi.fn().mockResolvedValue({}),
      sendPasswordResetEmail: vi.fn().mockResolvedValue({}),
    };

    const service = new AuthService(usersService as any, emailService as any);

    await expect(
      service.register({
        email: 'Ada@Example.com',
        password: 'StrongPass123',
        name: 'Ada Stone',
        role: 'client',
      }),
    ).rejects.toThrow('already exists');
  });

  it('should verify email with a generated token', async () => {
    const usersService = {
      findByEmail: vi.fn().mockResolvedValue({ id: 'user-1', email: 'ada@example.com', isVerified: false }),
      updateUser: vi.fn().mockImplementation((id, patch) => ({ id, email: 'ada@example.com', ...patch })),
    };
    const emailService = {
      sendVerificationEmail: vi.fn().mockResolvedValue({}),
      sendPasswordResetEmail: vi.fn().mockResolvedValue({}),
    };

    const service = new AuthService(usersService as any, emailService as any);
    const token = service.issueVerificationToken('ada@example.com');

    const result = await service.verifyEmail(token);

    expect(result.user.isVerified).toBe(true);
    expect(usersService.updateUser).toHaveBeenCalledWith('user-1', expect.objectContaining({ isVerified: true }));
  });

  it('should reset password with a valid token', async () => {
    const usersService = {
      findByEmail: vi.fn().mockResolvedValue({ id: 'user-1', email: 'ada@example.com', passwordHash: 'oldhash' }),
      updateUser: vi.fn().mockImplementation((id, patch) => ({ id, email: 'ada@example.com', ...patch })),
    };
    const emailService = {
      sendVerificationEmail: vi.fn().mockResolvedValue({}),
      sendPasswordResetEmail: vi.fn().mockResolvedValue({}),
    };

    const service = new AuthService(usersService as any, emailService as any);
    const token = service.issuePasswordResetToken('ada@example.com');

    const result = await service.resetPassword(token, 'NewStrongPass123');

    expect(result.success).toBe(true);
    expect(usersService.updateUser).toHaveBeenCalledWith('user-1', expect.objectContaining({ passwordHash: expect.any(String) }));
  });
});

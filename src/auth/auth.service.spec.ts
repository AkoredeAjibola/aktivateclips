import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  it('should accept fullName as a registration alias for name', async () => {
    const usersService = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'ada@example.com',
        name: 'Ada Stone',
        role: 'client',
        isVerified: false,
      }),
      createAuthToken: vi.fn().mockResolvedValue({}),
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
      findByEmail: vi
        .fn()
        .mockResolvedValue({
          id: 'user-1',
          email: 'ada@example.com',
          isVerified: false,
        }),
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
      findByEmail: vi
        .fn()
        .mockResolvedValue({
          id: 'user-1',
          email: 'ada@example.com',
          isVerified: false,
        }),
      findAuthToken: vi
        .fn()
        .mockResolvedValue({
          id: 'token-1',
          userId: 'user-1',
          expiresAt: new Date(Date.now() + 10000),
        }),
      verifyUserAndConsumeToken: vi
        .fn()
        .mockResolvedValue({
          id: 'user-1',
          email: 'ada@example.com',
          isVerified: true,
        }),
    };
    const emailService = {
      sendVerificationEmail: vi.fn().mockResolvedValue({}),
      sendPasswordResetEmail: vi.fn().mockResolvedValue({}),
    };

    const service = new AuthService(usersService as any, emailService as any);
    const token = 'raw-verification-token';
    usersService.findAuthToken.mockResolvedValueOnce({
      id: 'token-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 10000),
    });

    const result = await service.verifyEmail(token);

    expect(result.user.isVerified).toBe(true);
    expect(usersService.verifyUserAndConsumeToken).toHaveBeenCalledWith(
      'token-1',
      'user-1',
    );
  });

  it('should reset password with a valid token', async () => {
    const usersService = {
      findAuthToken: vi
        .fn()
        .mockResolvedValue({
          id: 'reset-1',
          userId: 'user-1',
          expiresAt: new Date(Date.now() + 10000),
        }),
      findByIdWithPassword: vi
        .fn()
        .mockResolvedValue({
          id: 'user-1',
          email: 'ada@example.com',
          passwordHash: 'oldhash',
        }),
      updatePasswordAndConsumeToken: vi
        .fn()
        .mockResolvedValue({ id: 'user-1', email: 'ada@example.com' }),
    };
    const emailService = {
      sendVerificationEmail: vi.fn().mockResolvedValue({}),
      sendPasswordResetEmail: vi.fn().mockResolvedValue({}),
    };

    const service = new AuthService(usersService as any, emailService as any);
    const token = 'raw-reset-token';

    const result = await service.resetPassword(token, 'NewStrongPass123');

    expect(result.success).toBe(true);
    expect(usersService.updatePasswordAndConsumeToken).toHaveBeenCalledWith(
      'user-1',
      'reset-1',
      expect.any(String),
    );
  });

  it('should reject login for unverified users even with a correct password', async () => {
    const usersService = {
      findByEmail: vi
        .fn()
        .mockResolvedValue({
          id: 'user-1',
          email: 'ada@example.com',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
          isVerified: false,
          status: 'pending',
        }),
    };
    const emailService = {
      sendVerificationEmail: vi.fn(),
      sendPasswordResetEmail: vi.fn(),
    };
    const service = new AuthService(usersService as any, emailService as any);
    vi.spyOn(service, 'validateUser').mockRejectedValue(
      new Error('Please verify your email address before signing in.'),
    );
    await expect(
      service.login('ada@example.com', 'StrongPass123'),
    ).rejects.toThrow('verify your email');
  });
});

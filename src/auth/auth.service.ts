import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { compareSync, hashSync } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { DEFAULT_JWT_SECRET } from '../common/constants.js';
import { EmailService } from '../common/email.service.js';
import type { User } from '../common/types.js';
import { UsersService } from '../users/users.service.js';

export interface RegisterUserDto {
  email: string;
  password: string;
  name?: string;
  fullName?: string;
  role: 'client' | 'clipper' | 'admin';
  companyName?: string;
  niche?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly verificationTokens = new Map<string, { email: string; expiresAt: number }>();
  private readonly passwordResetTokens = new Map<string, { email: string; expiresAt: number }>();

  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  issueVerificationToken(email: string): string {
    const token = randomBytes(32).toString('hex');
    this.verificationTokens.set(token, {
      email: email.toLowerCase(),
      expiresAt: Date.now() + 60 * 60 * 1000,
    });
    return token;
  }

  issuePasswordResetToken(email: string): string {
    const token = randomBytes(32).toString('hex');
    this.passwordResetTokens.set(token, {
      email: email.toLowerCase(),
      expiresAt: Date.now() + 60 * 60 * 1000,
    });
    return token;
  }

  async register(registerUserDto: RegisterUserDto) {
    const normalizedEmail = registerUserDto.email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const name = registerUserDto.name ?? registerUserDto.fullName;
    if (!name) {
      throw new BadRequestException('Name is required. Please provide a valid name or fullName.');
    }

    const createdUser = await this.usersService.create({
      email: normalizedEmail,
      password: registerUserDto.password,
      name,
      role: registerUserDto.role,
      companyName: registerUserDto.companyName,
      niche: registerUserDto.niche,
    });

    const verificationToken = this.issueVerificationToken(createdUser.email);

    try {
      await this.emailService.sendVerificationEmail(createdUser.email, verificationToken);
    } catch (error) {
      this.logger.warn(`Verification email could not be sent to ${createdUser.email}: ${(error as Error).message}`);
    }

    return {
      user: { ...createdUser, isVerified: false },
      verificationToken,
      requiresEmailVerification: true,
      message: 'Registration successful. Please verify your email address to activate your account.',
    };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('No account found for this email address.');
    }

    if (user.isVerified) {
      return {
        success: true,
        message: 'This email is already verified.',
      };
    }

    const verificationToken = this.issueVerificationToken(email);

    try {
      await this.emailService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      this.logger.warn(`Verification email resend failed for ${email}: ${(error as Error).message}`);
    }

    return {
      success: true,
      message: 'A new verification email has been sent.',
      verificationToken,
    };
  }

  async verifyEmail(token: string) {
    const record = this.verificationTokens.get(token);
    if (!record || record.expiresAt < Date.now()) {
      throw new BadRequestException('Verification token is invalid or expired.');
    }

    const user = await this.usersService.findByEmail(record.email);
    if (!user) {
      throw new NotFoundException('User associated with this token was not found.');
    }

    const updatedUser = this.usersService.updateUser(user.id, {
      isVerified: true,
      status: 'active',
      updatedAt: new Date().toISOString(),
    });

    this.verificationTokens.delete(token);

    return {
      success: true,
      message: 'Email verified successfully.',
      user: updatedUser,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return {
        success: true,
        message: 'If an account exists for this email, a password reset link has been sent.',
      };
    }

    const resetToken = this.issuePasswordResetToken(email);

    try {
      await this.emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      this.logger.warn(`Password reset email could not be sent to ${email}: ${(error as Error).message}`);
    }

    return {
      success: true,
      message: 'Password reset instructions have been sent to your email.',
      resetToken,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = this.passwordResetTokens.get(token);
    if (!record || record.expiresAt < Date.now()) {
      throw new BadRequestException('Reset token is invalid or expired.');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }

    const user = await this.usersService.findByEmail(record.email);
    if (!user) {
      throw new NotFoundException('User associated with this password reset token was not found.');
    }

    const updatedUser = this.usersService.updateUser(user.id, {
      passwordHash: hashSync(newPassword, 10),
      updatedAt: new Date().toISOString(),
    });

    this.passwordResetTokens.delete(token);

    return {
      success: true,
      message: 'Password reset successfully.',
      user: updatedUser,
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = compareSync(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const { passwordHash, ...safeUser } = user;

    return {
      accessToken: this.generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      }),
      user: safeUser,
    };
  }

  generateToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
    return jwt.sign({ sub: user.id, email: user.email, role: user.role }, DEFAULT_JWT_SECRET, {
      expiresIn: '7d',
    });
  }
}

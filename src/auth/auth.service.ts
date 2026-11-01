import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
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
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  private createRawToken() {
    return randomBytes(32).toString('hex');
  }
  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async register(registerUserDto: RegisterUserDto) {
    const normalizedEmail = registerUserDto.email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const name = (registerUserDto.name ?? registerUserDto.fullName)?.trim();
    if (!name) {
      throw new BadRequestException(
        'Name is required. Please provide a valid name or fullName.',
      );
    }
    if (!['client', 'clipper'].includes(registerUserDto.role)) {
      throw new BadRequestException('Role must be client or clipper.');
    }

    const createdUser = await this.usersService.create({
      email: normalizedEmail,
      password: registerUserDto.password,
      name,
      role: registerUserDto.role,
      companyName: registerUserDto.companyName,
      niche: registerUserDto.niche,
    });

    const verificationToken = this.createRawToken();
    await this.usersService.createAuthToken({
      userId: createdUser.id,
      tokenHash: this.hashToken(verificationToken),
      type: 'EMAIL_VERIFICATION',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    try {
      await this.emailService.sendVerificationEmail(
        createdUser.email,
        verificationToken,
      );
    } catch (error) {
      this.logger.error(
        `Verification email could not be sent to ${createdUser.email}: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'Your account was created, but the verification email could not be sent. Please request a new verification email.',
      );
    }

    return {
      user: { ...createdUser, isVerified: false },
      requiresEmailVerification: true,
      message:
        'Registration successful. Please verify your email address to activate your account.',
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

    const verificationToken = this.createRawToken();
    await this.usersService.deleteAuthTokens(user.id, 'EMAIL_VERIFICATION');
    await this.usersService.createAuthToken({
      userId: user.id,
      tokenHash: this.hashToken(verificationToken),
      type: 'EMAIL_VERIFICATION',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    try {
      await this.emailService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      this.logger.error(
        `Verification email resend failed for ${email}: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'The verification email could not be sent. Please try again later.',
      );
    }

    return {
      success: true,
      message: 'A new verification email has been sent.',
    };
  }

  async verifyEmail(token: string) {
    const record = await this.usersService.findAuthToken(
      this.hashToken(token),
      'EMAIL_VERIFICATION',
    );
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'Verification token is invalid or expired.',
      );
    }
    const updatedUser = await this.usersService.verifyUserAndConsumeToken(
      record.id,
      record.userId,
    );

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
        message:
          'If an account exists for this email, a password reset link has been sent.',
      };
    }

    const resetToken = this.createRawToken();
    await this.usersService.deleteAuthTokens(user.id, 'PASSWORD_RESET');
    await this.usersService.createAuthToken({
      userId: user.id,
      tokenHash: this.hashToken(resetToken),
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    try {
      await this.emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      this.logger.error(
        `Password reset email could not be sent to ${email}: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'The password reset email could not be sent. Please try again later.',
      );
    }

    return {
      success: true,
      message: 'Password reset instructions have been sent to your email.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.usersService.findAuthToken(
      this.hashToken(token),
      'PASSWORD_RESET',
    );
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Reset token is invalid or expired.');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long.',
      );
    }

    const user = await this.usersService.findByIdWithPassword(record.userId);
    if (!user) {
      throw new NotFoundException(
        'User associated with this password reset token was not found.',
      );
    }

    const updatedUser = await this.usersService.updatePasswordAndConsumeToken(
      user.id,
      record.id,
      await hash(newPassword, 10),
    );

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

    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    if (!user.isVerified || user.status !== 'active') {
      throw new UnauthorizedException(
        'Please verify your email address before signing in.',
      );
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
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      DEFAULT_JWT_SECRET,
      {
        expiresIn: '7d',
      },
    );
  }
}

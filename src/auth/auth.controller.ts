import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @ValidateIf((o) => !o.fullName)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ValidateIf((o) => !o.name)
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  niche?: string;

  @IsString()
  role: 'client' | 'clipper' | 'admin';
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new client, clipper, or admin',
    description:
      'Creates a new user account with the selected role. Use this for onboarding clients, creators, or internal admin staff.',
  })
  @ApiBody({
    type: RegisterDto,
    description:
      'User registration payload. Password must be at least 8 characters. `role` must be one of: client, clipper, admin.',
    examples: {
      default: {
        summary: 'Client registration example',
        value: {
          name: 'Ada Stone',
          email: 'ada@example.com',
          password: 'StrongPass123',
          role: 'client',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User created successfully and a JWT access token is returned.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Authenticate user and return JWT',
    description:
      'Signs in an existing member and returns a bearer token used on all protected routes, including campaign and payment APIs.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Email and password credentials for the existing user account.',
    examples: {
      default: {
        summary: 'Login example',
        value: {
          email: 'ada@example.com',
          password: 'StrongPass123',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful and JWT returned.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify a user email with a token',
    description: 'Marks the user account as verified after they click the verification link or submit the token from the email.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Email verification token sent after signup or resend.' },
      },
      required: ['token'],
      example: { token: 'abc123...' },
    },
  })
  verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  @Post('resend-verification')
  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Generates a fresh verification token if the user has not confirmed their email yet.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email address of the unverified user.' },
      },
      required: ['email'],
      example: { email: 'ada@example.com' },
    },
  })
  resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerification(body.email);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request a password reset link',
    description: 'Sends a reset token to the user email so they can create a new password.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email address linked to the account being reset.' },
      },
      required: ['email'],
      example: { email: 'ada@example.com' },
    },
  })
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset a user password with a token',
    description: 'Validates a password reset token and updates the user password to the new value.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Password reset token received by email.' },
        newPassword: { type: 'string', description: 'New password for the account. Minimum length is 8 characters.' },
      },
      required: ['token', 'newPassword'],
      example: { token: 'xyz456...', newPassword: 'NewStrongPass123' },
    },
  })
  resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current authenticated user profile',
    description:
      'Returns the authenticated user record using the JWT stored in the Authorization header. Frontend should attach Bearer <token>.',
  })
  @ApiResponse({ status: 200, description: 'Authenticated user details returned.' })
  getCurrentUser(@Req() req: any) {
    return req.user;
  }
}

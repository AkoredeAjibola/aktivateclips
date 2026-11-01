import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import type { SocialPage, User, UserRole } from '../common/types.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type PublicUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany();
    return users.map((user) => this.toPublicUser(user));
  }

  async findById(id: string): Promise<PublicUser | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toPublicUser(user) : undefined;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    return user ? this.toDomainUser(user) : undefined;
  }

  async createAuthToken(input: {
    userId: string;
    tokenHash: string;
    type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
    expiresAt: Date;
  }) {
    return this.prisma.authToken.create({ data: input });
  }

  async deleteAuthTokens(
    userId: string,
    type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
  ) {
    return this.prisma.authToken.deleteMany({ where: { userId, type } });
  }

  async findAuthToken(
    tokenHash: string,
    type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
  ) {
    return this.prisma.authToken
      .findUnique({
        where: { tokenHash },
        select: {
          id: true,
          userId: true,
          type: true,
          expiresAt: true,
          createdAt: true,
        },
      })
      .then((token) => (token?.type === type ? token : null));
  }

  async verifyUserAndConsumeToken(
    tokenId: string,
    userId: string,
  ): Promise<PublicUser> {
    return this.prisma.$transaction(async (tx) => {
      await tx.authToken.delete({ where: { id: tokenId } });
      const updated = await tx.user.update({
        where: { id: userId },
        data: { isVerified: true, status: 'ACTIVE' },
      });
      return this.toPublicUser(updated);
    });
  }

  async findByIdWithPassword(id: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toDomainUser(user) : undefined;
  }

  async updatePasswordAndConsumeToken(
    userId: string,
    tokenId: string,
    passwordHash: string,
  ): Promise<PublicUser> {
    return this.prisma.$transaction(async (tx) => {
      await tx.authToken.delete({ where: { id: tokenId } });
      const updated = await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      await tx.authToken.deleteMany({
        where: { userId, type: 'PASSWORD_RESET' },
      });
      return this.toPublicUser(updated);
    });
  }

  async findByRole(role: UserRole): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany({
      where: { role: this.toPrismaRole(role) },
    });

    return users.map((user) => this.toPublicUser(user));
  }

  async create(input: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    companyName?: string;
    niche?: string;
    socialPages?: SocialPage[];
  }): Promise<PublicUser> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    let createdUser;
    try {
      createdUser = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: hashSync(input.password, 10),
          name: input.name,
          role: this.toPrismaRole(input.role),
          companyName: input.companyName ?? null,
          niche: input.niche ?? null,
          status: this.toPrismaStatus('pending'),
          isVerified: false,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists.');
      }
      throw error;
    }

    return this.toPublicUser(createdUser);
  }

  async updateUser(id: string, patch: Partial<User>): Promise<PublicUser> {
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new NotFoundException(`User with id ${id} was not found.`);
    }

    const data: Record<string, unknown> = { ...patch };

    if (patch.role) {
      data.role = this.toPrismaRole(patch.role);
    }

    if (patch.status) {
      data.status = this.toPrismaStatus(patch.status);
    }

    if (patch.passwordHash) {
      data.passwordHash = patch.passwordHash;
    }

    if (patch.isVerified !== undefined) {
      data.isVerified = patch.isVerified;
    }

    if (patch.updatedAt) {
      data.updatedAt = new Date(patch.updatedAt);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.toPublicUser(updatedUser);
  }

  private toDomainUser(user: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: string;
    companyName: string | null;
    niche: string | null;
    status: string;
    isVerified: boolean;
    earningsTotal?: number | { toNumber(): number } | null;
    campaignsCompleted?: number | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      name: user.name,
      role: this.toAppRole(user.role),
      companyName: user.companyName ?? undefined,
      niche: user.niche ?? undefined,
      status: this.toAppStatus(user.status),
      isVerified: user.isVerified,
      earningsTotal: this.toNumber(user.earningsTotal),
      campaignsCompleted: user.campaignsCompleted ?? undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: string;
    companyName: string | null;
    niche: string | null;
    status: string;
    isVerified: boolean;
    earningsTotal?: number | { toNumber(): number } | null;
    campaignsCompleted?: number | null;
    createdAt: Date;
    updatedAt: Date;
  }): PublicUser {
    const { passwordHash, ...rest } = this.toDomainUser(user);
    return rest;
  }

  private toPrismaRole(role: UserRole): 'CLIENT' | 'CLIPPER' | 'ADMIN' {
    return role.toUpperCase() as 'CLIENT' | 'CLIPPER' | 'ADMIN';
  }

  private toPrismaStatus(
    status: User['status'],
  ): 'ACTIVE' | 'PENDING' | 'SUSPENDED' {
    return (status ?? 'pending').toUpperCase() as
      'ACTIVE' | 'PENDING' | 'SUSPENDED';
  }

  private toAppRole(role: string): UserRole {
    return role.toLowerCase() as UserRole;
  }

  private toAppStatus(status: string): User['status'] {
    return status.toLowerCase() as User['status'];
  }

  private toNumber(
    value: number | { toNumber(): number } | null | undefined,
  ): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    return typeof value === 'number' ? value : value.toNumber();
  }
}

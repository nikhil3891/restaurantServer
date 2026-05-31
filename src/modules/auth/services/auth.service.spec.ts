import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../../users/services/users.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

/**
 * Unit tests for AuthService.
 *
 * ALL dependencies (PrismaService, UsersService, JwtService, ConfigService)
 * are mocked — no real database or Redis needed.
 *
 * Run: pnpm test
 */

// A fake user that matches the Prisma User shape
const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  password: '$2b$10$hashedpassword',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.CUSTOMER,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock implementations — return fake data instead of hitting the DB
const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

const mockPrismaService = {
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    if (key === 'jwt.refreshSecret') return 'test-refresh-secret';
    if (key === 'jwt.refreshExpiresIn') return '7d';
    return null;
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset all mocks before each test so they don't bleed into each other
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // validateUser()
  // ──────────────────────────────────────────────
  describe('validateUser()', () => {
    it('should return the user when email and password are correct', async () => {
      const plainPassword = 'password123';
      const hashed = await bcrypt.hash(plainPassword, 10);
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        password: hashed,
      });

      const result = await service.validateUser(mockUser.email, plainPassword);

      expect(result).not.toBeNull();
      expect(result?.email).toBe(mockUser.email);
    });

    it('should return null when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nobody@example.com', 'pass');

      expect(result).toBeNull();
    });

    it('should return null when password is wrong', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.validateUser(
        mockUser.email,
        'wrong-password',
      );

      expect(result).toBeNull();
    });

    it('should return null when user account is inactive', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await service.validateUser(mockUser.email, 'anypassword');

      expect(result).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // register()
  // ──────────────────────────────────────────────
  describe('register()', () => {
    it('should create a user and return accessToken + refreshToken', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        email: mockUser.email,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(mockUser.email);
      expect(mockUsersService.create).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────
  // login()
  // ──────────────────────────────────────────────
  describe('login()', () => {
    it('should return tokens for a valid user', async () => {
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(mockUser as any);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
    });
  });

  // ──────────────────────────────────────────────
  // refreshTokens()
  // ──────────────────────────────────────────────
  describe('refreshTokens()', () => {
    it('should return new tokens for a valid, non-expired refresh token', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      mockPrismaService.refreshToken.findFirst.mockResolvedValue({
        id: 'token-id',
        token: 'valid-refresh-token',
        isRevoked: false,
        expiresAt: futureDate,
        user: mockUser,
      });
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException when token does not exist', async () => {
      mockPrismaService.refreshToken.findFirst.mockResolvedValue(null);

      await expect(
        service.refreshTokens('non-existent-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when token is expired', async () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      mockPrismaService.refreshToken.findFirst.mockResolvedValue({
        id: 'token-id',
        token: 'expired-token',
        isRevoked: false,
        expiresAt: pastDate,
        user: mockUser,
      });
      mockPrismaService.refreshToken.update.mockResolvedValue({});

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // logout()
  // ──────────────────────────────────────────────
  describe('logout()', () => {
    it('should revoke all refresh tokens for the user', async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await service.logout(mockUser.id);

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });
});

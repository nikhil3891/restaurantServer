import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UsersService } from '../../users/services/users.service';
import { RegisterDto } from '../dto/register.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    return user;
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create(dto);
    return this.generateAuthResponse(user as User);
  }

  async login(user: User): Promise<AuthResponseDto> {
    return this.generateAuthResponse(user);
  }

  async refreshTokens(refreshTokenValue: string): Promise<AuthResponseDto> {
    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: { token: refreshTokenValue, isRevoked: false },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (new Date() > tokenRecord.expiresAt) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true },
      });
      throw new ForbiddenException('Refresh token expired, please login again');
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    return this.generateAuthResponse(tokenRecord.user);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }

  private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);

    const refreshExpiresIn =
      this.config.get<string>('jwt.refreshExpiresIn') ?? '7d';

    const refreshTokenValue = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: refreshExpiresIn as any,
    });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: this.parseExpiry(refreshExpiresIn),
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  private parseExpiry(expiry: string): Date {
    const now = new Date();
    const value = parseInt(expiry);
    const unit = expiry.slice(-1);

    switch (unit) {
      case 'd':
        now.setDate(now.getDate() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
      default:
        now.setDate(now.getDate() + 7);
    }

    return now;
  }
}

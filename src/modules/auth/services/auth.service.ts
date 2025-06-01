import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, AuthProvider } from '../entities/user.entity';
import { Token, TokenType } from '../entities/token.entity';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../email/services/email.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<{ user: User; token: string }> {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException('Email already registered');
    }

    const user = this.userRepository.create({
      email,
      password,
      firstName: name,
      role: UserRole.USER,
      provider: AuthProvider.LOCAL,
    });

    await this.userRepository.save(user);

    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * Login a user
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(token: string): Promise<{ token: string }> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newToken = this.generateToken(user);
      return { token: newToken };
    } catch (error: any) {
      throw new UnauthorizedException('Invalid token', error.message);
    }
  }

  /**
   * Logout a user by revoking their refresh token
   */
  async logout(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (user) {
      user.refreshToken = undefined;
      await this.userRepository.save(user);
    }
  }

  /**
   * Initiate password reset process
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user || user.provider !== AuthProvider.LOCAL) {
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpiry = resetTokenExpiry;
    await this.userRepository.save(user);
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user || !user.passwordResetTokenExpiry || new Date() > user.passwordResetTokenExpiry) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;
    await this.userRepository.save(user);
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (
      !user.emailVerificationTokenExpiry ||
      new Date() > user.emailVerificationTokenExpiry
    ) {
      throw new BadRequestException('Verification token expired');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;
    await this.userRepository.save(user);
  }

  /**
   * Handle OAuth login (Google, GitHub)
   */
  async oauthLogin(
    provider: AuthProvider,
    profile: any,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<any> {
    const { email, providerId, firstName, lastName } = profile;

    let user = await this.userRepository.findOne({
      where: { provider, providerId },
    });

    if (!user && email) {
      user = await this.userRepository.findOne({
        where: { email },
      });

      if (user) {
        user.provider = provider;
        user.providerId = providerId;
        await this.userRepository.save(user);
      }
    }

    if (!user) {
      let username = email
        ? email.split('@')[0]
        : `user_${Math.floor(Math.random() * 10000)}`;

      const existingUser = await this.userRepository.findOne({
        where: { username },
      });

      if (existingUser) {
        username = `${username}_${Math.floor(Math.random() * 10000)}`;
      }

      user = this.userRepository.create({
        email,
        username,
        firstName,
        lastName,
        provider,
        providerId,
        isEmailVerified: true,
        role: UserRole.USER,
      });

      await this.userRepository.save(user);
    }

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user, userAgent, ipAddress);

    const { password, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(
    user: User,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessTokenId = uuidv4();
    const refreshTokenId = uuidv4();

    const accessTokenExpiry =
      this.configService.get<number>('JWT_EXPIRY') || 15 * 60;
    const refreshTokenExpiry =
      this.configService.get<number>('JWT_REFRESH_EXPIRY') || 7 * 24 * 60 * 60;

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(
      { ...payload, jti: accessTokenId },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: accessTokenExpiry,
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload, jti: refreshTokenId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTokenExpiry,
      },
    );

    const tokenEntity = this.tokenRepository.create({
      token: refreshToken,
      type: TokenType.REFRESH,
      userId: user.id,
      expiresAt: new Date(Date.now() + refreshTokenExpiry * 1000),
      userAgent,
      ipAddress,
    });

    await this.tokenRepository.save(tokenEntity);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    const tokens = await this.tokenRepository.find({
      where: {
        userId,
        type: TokenType.REFRESH,
        isRevoked: false,
      },
    });

    for (const token of tokens) {
      token.isRevoked = true;
      token.revokedAt = new Date();
    }

    await this.tokenRepository.save(tokens);
  }

  /**
   * Validate user by email and password (used by local strategy)
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (user && (await user.validatePassword(password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password || '',
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    user.password = newPassword;
    await this.userRepository.save(user);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      return;
    }

    const resetToken = this.generateResetToken();
    user.passwordResetToken = resetToken;
    await this.userRepository.save(user);

    await this.emailService.sendPasswordResetEmail(email, resetToken);
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  private generateResetToken(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  async validateOAuthLogin(userData: any, provider: AuthProvider) {
    try {
      let user = await this.userRepository.findOne({
        where: { email: userData.email },
      });

      if (!user) {
        user = this.userRepository.create({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          provider,
          providerId: userData.providerId,
          isEmailVerified: true,
        });
        await this.userRepository.save(user);
      }

      const tokens = await this.generateTokens(user);
      return { user, ...tokens };
    } catch (err) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    return { user, ...tokens };
  }
}

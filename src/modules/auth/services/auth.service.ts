import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, AuthProvider } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../email/services/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
      name,
      role: UserRole.USER,
      authProvider: AuthProvider.LOCAL,
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
  async logout(token: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (user) {
        user.refreshToken = null;
        await this.userRepository.save(user);
      }
    } catch (err: any) {
      throw new UnauthorizedException('Invalid token', err.message);
    }
  }

  /**
   * Initiate password reset process
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    // Don't reveal if user exists or not for security
    if (!user || user.provider !== AuthProvider.LOCAL) {
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    // Save reset token to user
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpiry = resetTokenExpiry;
    await this.userRepository.save(user);

    // TODO: Send password reset email
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid reset token');
    }

    user.password = newPassword;
    user.passwordResetToken = null;
    await this.userRepository.save(user);
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token: string): Promise<void> {
    // Find user by verification token
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    // Check if token is expired
    if (
      !user.emailVerificationTokenExpiry ||
      new Date() > user.emailVerificationTokenExpiry
    ) {
      throw new BadRequestException('Verification token expired');
    }

    // Mark email as verified and clear verification token
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpiry = null;
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

    // Check if user exists by provider ID
    let user = await this.userRepository.findOne({
      where: { provider, providerId },
    });

    // If not found by provider ID, try to find by email
    if (!user && email) {
      user = await this.userRepository.findOne({
        where: { email },
      });

      // If user exists but with different provider, link accounts
      if (user) {
        user.provider = provider;
        user.providerId = providerId;
        await this.userRepository.save(user);
      }
    }

    // If user still not found, create new user
    if (!user) {
      // Generate a unique username based on email or name
      let username = email
        ? email.split('@')[0]
        : `user_${Math.floor(Math.random() * 10000)}`;

      // Check if username exists and append random string if needed
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
        isEmailVerified: true, // OAuth emails are verified by the provider
        roles: [UserRole.USER],
      });

      await this.userRepository.save(user);
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user, userAgent, ipAddress);

    // Return user and tokens
    const { ...userWithoutPassword } = user;
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
    // Generate unique token IDs
    const accessTokenId = uuidv4();
    const refreshTokenId = uuidv4();

    // Set token expiry times
    const accessTokenExpiry =
      this.configService.get<number>('JWT_EXPIRY') || 15 * 60; // 15 minutes in seconds
    const refreshTokenExpiry =
      this.configService.get<number>('JWT_REFRESH_EXPIRY') || 7 * 24 * 60 * 60; // 7 days in seconds

    // Create JWT payload
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(
      { ...payload, jti: accessTokenId },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: accessTokenExpiry,
      },
    );

    // Generate refresh token
    const refreshToken = this.jwtService.sign(
      { ...payload, jti: refreshTokenId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTokenExpiry,
      },
    );

    // Save refresh token to database
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
    // Find all active refresh tokens for user
    const tokens = await this.tokenRepository.find({
      where: {
        userId,
        type: TokenType.REFRESH,
        isRevoked: false,
      },
    });

    // Revoke all tokens
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
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      return null;
    }

    const { ...result } = user;
    return result;
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
      return; // Don't reveal if email exists
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
}

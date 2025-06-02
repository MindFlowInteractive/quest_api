import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { User, UserRole, AuthProvider } from '../entities/user.entity';
import { Token, TokenType } from '../entities/token.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<{ user: User; tokens: any }> {
    const { email, password, passwordConfirm, username, firstName, lastName } = registerDto;

    // Check if passwords match
    if (password !== passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if user with email already exists
    const existingUserByEmail = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('Email already in use');
    }

    // Check if username is taken
    const existingUserByUsername = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUserByUsername) {
      throw new ConflictException('Username already taken');
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hours expiry

    // Create new user
    const user = this.userRepository.create({
      email,
      password, // Will be hashed by entity hook
      username,
      firstName,
      lastName,
      roles: [UserRole.USER],
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpiry: verificationTokenExpiry,
      provider: AuthProvider.LOCAL,
    });

    await this.userRepository.save(user);

    // TODO: Send verification email

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Return user (without sensitive data) and tokens
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword as User,
      tokens,
    };
  }

  /**
   * Login a user
   */
  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string): Promise<any> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ForbiddenException('Account is inactive');
    }

    // Check if user is using local authentication
    if (user.provider !== AuthProvider.LOCAL) {
      throw new BadRequestException(
        `Please login using ${user.provider} authentication`,
      );
    }

    // Check if password is correct
    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.isActive = false;
      }
      
      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login attempts and update last login
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user, userAgent, ipAddress);

    // Return user (without sensitive data) and tokens
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(userId: string, refreshToken: string): Promise<any> {
    // Find user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Find token in database
    const tokenEntity = await this.tokenRepository.findOne({
      where: {
        userId,
        token: refreshToken,
        type: TokenType.REFRESH,
        isRevoked: false,
      },
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date() > tokenEntity.expiresAt) {
      // Revoke the token
      tokenEntity.isRevoked = true;
      tokenEntity.revokedAt = new Date();
      await this.tokenRepository.save(tokenEntity);
      
      throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user, tokenEntity.userAgent, tokenEntity.ipAddress);

    // Revoke old refresh token
    tokenEntity.isRevoked = true;
    tokenEntity.revokedAt = new Date();
    await this.tokenRepository.save(tokenEntity);

    return tokens;
  }

  /**
   * Logout a user by revoking their refresh token
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    // Find token in database
    const tokenEntity = await this.tokenRepository.findOne({
      where: {
        userId,
        token: refreshToken,
        type: TokenType.REFRESH,
        isRevoked: false,
      },
    });

    if (!tokenEntity) {
      return; // Token not found or already revoked, nothing to do
    }

    // Revoke the token
    tokenEntity.isRevoked = true;
    tokenEntity.revokedAt = new Date();
    await this.tokenRepository.save(tokenEntity);

    // Add access token to blacklist
    const payload = this.jwtService.decode(refreshToken);
    if (payload && payload.sub) {
      const accessTokenId = payload.jti;
      await this.blacklistToken(accessTokenId, userId);
    }
  }

  /**
   * Blacklist a token
   */
  async blacklistToken(tokenId: string, userId: string): Promise<void> {
    const blacklistedToken = this.tokenRepository.create({
      token: tokenId,
      userId,
      type: TokenType.BLACKLISTED,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    await this.tokenRepository.save(blacklistedToken);
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
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, password, passwordConfirm } = resetPasswordDto;

    // Check if passwords match
    if (password !== passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }

    // Find user by reset token
    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    // Check if token is expired
    if (
      !user.passwordResetTokenExpiry ||
      new Date() > user.passwordResetTokenExpiry
    ) {
      throw new BadRequestException('Token expired');
    }

    // Update password and clear reset token
    user.password = password; // Will be hashed by entity hook
    user.passwordResetToken = '';
    // user.passwordResetTokenExpiry = undefined;
    await this.userRepository.save(user);

    // Revoke all refresh tokens for this user
    await this.revokeAllUserTokens(user.id);
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
    user.emailVerificationToken = '';
    // user.emailVerificationTokenExpiry = null;
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
      let username = email ? email.split('@')[0] : `user_${Math.floor(Math.random() * 10000)}`;
      
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
    const { password: _, ...userWithoutPassword } = user;
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
    const accessTokenExpiry = this.configService.get<number>('JWT_EXPIRY') || 15 * 60; // 15 minutes in seconds
    const refreshTokenExpiry = this.configService.get<number>('JWT_REFRESH_EXPIRY') || 7 * 24 * 60 * 60; // 7 days in seconds

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

    const { password: _, ...result } = user;
    return result;
  }
}

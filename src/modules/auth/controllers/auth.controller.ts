import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

import { AuthService } from '../services/auth.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { Public } from '../decorators/public.decorator';

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(
    @Body() registerData: { email: string; password: string; name: string },
  ) {
    const { email, password, name } = registerData;
    return this.authService.register(email, password, name);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginData: { email: string; password: string }) {
    const { email, password } = loginData;
    return this.authService.login(email, password);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Req() request: Request) {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No refresh token provided');
    }
    return this.authService.refreshToken(token);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @UseGuards(JwtAuthGuard)
  async logout(@Req() request: Request) {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }
    return this.authService.logout(token);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() request: Request) {
    const userId = request.user?.id;
    if (!userId) {
      throw new Error('User not found in request');
    }
    return this.authService.getProfile(userId);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Body() data: { currentPassword: string; newPassword: string },
    @Req() request: Request,
  ) {
    const userId = request.user?.id;
    if (!userId) {
      throw new Error('User not found in request');
    }
    return this.authService.changePassword(
      userId,
      data.currentPassword,
      data.newPassword,
    );
  }

  @Post('request-password-reset')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Reset email sent' })
  async requestPasswordReset(@Body() data: { email: string }) {
    return this.authService.requestPasswordReset(data.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body() data: { token: string; newPassword: string }) {
    return this.authService.resetPassword(data.token, data.newPassword);
  }

  @Get('admin')
  @ApiOperation({ summary: 'Admin endpoint' })
  @ApiResponse({ status: 200, description: 'Admin access granted' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminEndpoint() {
    return { message: 'Admin access granted' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto);
    return { message: 'Password reset instructions sent to your email' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid token or passwords' })
  async resetPasswordDto(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password reset successfully' };
  }

  @Public()
  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify email using token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification token' })
  async verifyEmail(@Param('token') token: string) {
    await this.authService.verifyEmail(token);
    return { message: 'Email verified successfully' };
  }

  // OAuth routes
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth() {
    // This route will redirect to Google OAuth
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const { tokens } = await this.authService.oauthLogin(
      AuthProvider.GOOGLE,
      req.user,
      userAgent,
      ipAddress,
    );

    // Redirect to frontend with tokens
    const redirectUrl = `${this.authService['configService'].get<string>('FRONTEND_URL')}/auth/oauth-callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

    return res.redirect(redirectUrl);
  }

  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  async githubAuth() {
    // This route will redirect to GitHub OAuth
  }

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubAuthCallback(@Req() req: Request, @Res() res: Response) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const { tokens } = await this.authService.oauthLogin(
      AuthProvider.GITHUB,
      req.user,
      userAgent,
      ipAddress,
    );

    // Redirect to frontend with tokens
    const redirectUrl = `${this.authService['configService'].get<string>('FRONTEND_URL')}/auth/oauth-callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

    return res.redirect(redirectUrl);
  }
}

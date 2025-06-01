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
  Res,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole, AuthProvider, User } from '../entities/user.entity';
import { AuthService } from '../services/auth.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { Public } from '../decorators/public.decorator';
import { LocalAuthGuard } from '../guards/local-auth.guard';

interface RequestWithUser extends Omit<Request, 'body'> {
  user: User;
  body: {
    refreshToken?: string;
    [key: string]: any;
  };
}

@ApiTags('auth')
@Controller('auth')
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

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: RequestWithUser) {
    return this.authService.generateTokens(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Req() req: RequestWithUser) {
    const userId = req.user?.id;
    if (userId) {
      await this.authService.logout(userId);
    }
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refresh(@Req() req: RequestWithUser) {
    const userId = req.user?.id;
    const refreshToken = req.body?.refreshToken;
    if (!userId || !refreshToken) {
      throw new Error('Invalid refresh token');
    }
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: RequestWithUser) {
    const userId = req.user?.id;
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
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;
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
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    await this.authService.resetPassword(token, newPassword);
    return { message: 'Password reset successful' };
  }

  @Get('admin')
  @ApiOperation({ summary: 'Admin endpoint' })
  @ApiResponse({ status: 200, description: 'Admin access granted' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminEndpoint() {
    return { message: 'Admin access granted' };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body('email') email: string) {
    await this.authService.forgotPassword(email);
    return { message: 'Password reset email sent' };
  }

  @Public()
  @Post('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth() {
    return { message: 'Google auth endpoint' };
  }

  @Public()
  @Post('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req: RequestWithUser, @Res() res: Response) {
    const result = await this.authService.validateOAuthLogin(
      req.user,
      AuthProvider.GOOGLE,
    );
    res.redirect(`/auth/callback?token=${result.accessToken}`);
  }

  @Public()
  @Post('github')
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  async githubAuth() {
    return { message: 'GitHub auth endpoint' };
  }

  @Public()
  @Post('github/callback')
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubAuthCallback(@Req() req: RequestWithUser, @Res() res: Response) {
    const result = await this.authService.validateOAuthLogin(
      req.user,
      AuthProvider.GITHUB,
    );
    res.redirect(`/auth/callback?token=${result.accessToken}`);
  }
}

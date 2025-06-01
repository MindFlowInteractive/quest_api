import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Request } from 'express';
import { Token, TokenType } from '../entities/token.entity';

interface JwtRefreshPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

interface RefreshTokenRequest extends Request {
  body: {
    refreshToken: string;
  };
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    } as any);
  }

  async validate(req: RefreshTokenRequest, payload: JwtRefreshPayload) {
    const refreshToken = req.body.refreshToken;

    // Check if token exists and is valid
    const tokenEntity = await this.tokenRepository.findOne({
      where: {
        token: refreshToken,
        type: TokenType.REFRESH,
        isRevoked: false,
      },
      relations: ['user'],
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token belongs to the user in the payload
    if (tokenEntity.userId !== payload.sub) {
      throw new UnauthorizedException('Token does not match user');
    }

    // Check if token is expired
    if (new Date() > tokenEntity.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      refreshToken,
    };
  }
}

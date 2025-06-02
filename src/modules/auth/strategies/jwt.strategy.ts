import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Token, TokenType } from '../entities/token.entity';

interface JwtPayload {
  sub: string;
  jti: string;
  email: string;
  username: string;
  roles: string[];
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', ''),
    });
  }

  async validate(payload: JwtPayload) {
    // Check if token is blacklisted
    const blacklistedToken = await this.tokenRepository.findOne({
      where: {
        token: payload.jti,
        type: TokenType.BLACKLISTED,
      },
    });

    if (blacklistedToken) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Find user by ID from token payload
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Return user object with roles for use in guards
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles,
    };
  }
}

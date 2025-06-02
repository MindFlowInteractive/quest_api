import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { AuthProvider } from '../entities/user.entity';

interface GithubProfile {
  id: string;
  username: string;
  displayName: string;
  emails?: Array<{ value: string; primary?: boolean; verified?: boolean }>;
  photos?: Array<{ value: string }>;
  provider: string;
}

interface GithubUser {
  email: string | null;
  username: string;
  firstName: string | null;
  lastName: string | null;
  picture: string | null;
  accessToken: string;
  providerId: string;
}

type DoneCallback = (err: Error | null, user: GithubUser | false) => void;

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID', ''),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET', ''),
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL', ''),
      scope: ['user:email'],
      passReqToCallback: true,
    });
  }

  async validate(
    request: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
  ) {
    const { name, emails, photos } = profile;
    const user = {
      email: emails[0].value,
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
      picture: photos?.[0]?.value,
      accessToken,
      providerId: profile.id,
    };
    return this.authService.validateOAuthLogin(user, AuthProvider.GITHUB);
  }
}

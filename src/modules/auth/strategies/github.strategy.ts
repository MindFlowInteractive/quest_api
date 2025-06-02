import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

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
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID', ''),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET', ''),
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL', ''),
      scope: ['user:email'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: GithubProfile,
    done: DoneCallback,
  ): void {
    // GitHub profile structure is different from Google
    const { id, username, displayName, emails, photos } = profile;
    
    // GitHub may not provide email directly, so we need to handle that case
    const email = emails && emails.length > 0 ? emails[0].value : null;
    
    // Extract name parts if available
    let firstName: string | null = null;
    let lastName: string | null = null;
    
    if (displayName) {
      const nameParts = displayName.split(' ');
      firstName = nameParts[0] || null;
      lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    }
    
    const user: GithubUser = {
      email,
      username,
      firstName,
      lastName,
      picture: photos && photos.length > 0 ? photos[0].value : null,
      accessToken,
      providerId: id,
    };
    
    done(null, user);
  }
}

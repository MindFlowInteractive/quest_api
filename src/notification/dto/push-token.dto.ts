/* eslint-disable prettier/prettier */
import { IsString } from 'class-validator';

export class PushTokenDto {
  @IsString()
  deviceToken: string;
}

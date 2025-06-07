import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { DeviceType } from '../entities/game-session.entity';

export class CreateGameSessionDto {
  @IsEnum(DeviceType)
  @IsOptional()
  deviceType?: DeviceType;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsObject()
  @IsOptional()
  sessionData?: any;
}

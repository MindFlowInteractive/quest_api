import { IsNumber, IsOptional, IsObject, IsEnum } from 'class-validator';
import { SessionStatus } from '../entities/game-session.entity';

export class UpdateGameSessionDto {
  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

  @IsNumber()
  @IsOptional()
  puzzlesAttempted?: number;

  @IsNumber()
  @IsOptional()
  puzzlesCompleted?: number;

  @IsNumber()
  @IsOptional()
  totalScore?: number;

  @IsNumber()
  @IsOptional()
  experienceGained?: number;

  @IsObject()
  @IsOptional()
  sessionData?: any;
}

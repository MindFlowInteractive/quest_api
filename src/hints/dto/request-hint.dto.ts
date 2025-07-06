import { IsNotEmpty, IsString } from 'class-validator';

export class RequestHintDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  puzzleId: string;

  @IsNotEmpty()
  @IsString()
  puzzleType: string;

  @IsNotEmpty()
  currentState: any;
}
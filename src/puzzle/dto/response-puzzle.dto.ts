import { ApiProperty } from '@nestjs/swagger';
import { PuzzleStateDto } from './create-puzzle.dto';

export class PuzzleHintResponseDto {
  @ApiProperty({ description: 'Hint level provided' })
  level: number;

  @ApiProperty({ description: 'Hint content/message' })
  content: string;

  @ApiProperty({ description: 'Type of hint provided' })
  type: 'directional' | 'elimination' | 'pattern' | 'next-move';
}

export class PuzzleResultResponseDto {
  @ApiProperty({ description: 'Whether puzzle is solved' })
  solved: boolean;

  @ApiProperty({ description: 'Base score earned' })
  score: number;

  @ApiProperty({ description: 'Time bonus points' })
  timeBonus: number;

  @ApiProperty({ description: 'Penalty for extra moves' })
  movesPenalty: number;

  @ApiProperty({ description: 'Number of hints used' })
  hintsUsed: number;

  @ApiProperty({ description: 'Total final score' })
  totalScore: number;
}

export class UndoRedoResponseDto {
  @ApiProperty({ description: 'Whether operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Updated puzzle state if successful' })
  state?: PuzzleStateDto;

  @ApiProperty({ description: 'Error message if unsuccessful' })
  message?: string;
}

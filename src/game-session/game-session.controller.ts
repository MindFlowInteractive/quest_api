import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { GameSessionService } from './game-session.service';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { UpdateGameSessionDto } from './dto/update-game-session.dto';

@ApiTags('Game Sessions')
@Controller('game-session')
export class GameSessionController {
  constructor(private readonly gameSessionService: GameSessionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new game session' })
  @ApiBody({ type: CreateGameSessionDto })
  create(@Body() createGameSessionDto: CreateGameSessionDto) {
    return this.gameSessionService.create(createGameSessionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all game sessions' })
  findAll() {
    return this.gameSessionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single game session by ID' })
  @ApiParam({ name: 'id', description: 'Game session ID' })
  findOne(@Param('id') id: string) {
    return this.gameSessionService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing game session by ID' })
  @ApiParam({ name: 'id', description: 'Game session ID' })
  @ApiBody({ type: UpdateGameSessionDto })
  update(@Param('id') id: string, @Body() updateGameSessionDto: UpdateGameSessionDto) {
    return this.gameSessionService.update(+id, updateGameSessionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a game session by ID' })
  @ApiParam({ name: 'id', description: 'Game session ID' })
  remove(@Param('id') id: string) {
    return this.gameSessionService.remove(+id);
  }
}

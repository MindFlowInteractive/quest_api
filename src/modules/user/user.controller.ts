import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateUserPasswordDto } from './dto/update-user.dto';
import { UpdateUserPreferencesDto } from './dto/user-preferences.dto';
import { SearchUserDto } from './dto/search-user.dto';
import { UserResponseDto, UserStatsDto } from './dto/user-response.dto';
import { AuthRequest } from './../../types/AuthRequest';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.create(createUserDto);
  }

  @Get('me')
  async getCurrentUser(@Req() req: AuthRequest): Promise<UserResponseDto> {
    return this.userService.findById(req.user.id);
  }

  @Put('me')
  async updateCurrentUser(
    @Req() req: AuthRequest,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.update(req.user.id, updateUserDto);
  }

  @Put('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updatePassword(
    @Req() req: AuthRequest,
    @Body() updatePasswordDto: UpdateUserPasswordDto,
  ): Promise<void> {
    await this.userService.updatePassword(req.user.id, updatePasswordDto);
  }

  // Upload Avatar
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req: AuthRequest, file, cb) => {
          const userId = req.user.id;
          const fileExt = extname(file.originalname);
          cb(null, `${userId}-${Date.now()}${fileExt}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadAvatar(
    @Req() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    return this.userService.uploadAvatar(req.user.id, file);
  }

  @Get('me/preferences')
  async getUserPreferences(@Req() req: AuthRequest) {
    return this.userService.getUserPreferences(req.user.id);
  }

  @Put('me/preferences')
  async updateUserPreferences(
    @Req() req: AuthRequest,
    @Body() preferencesDto: UpdateUserPreferencesDto,
  ) {
    return this.userService.updateUserPreferences(req.user.id, preferencesDto);
  }

  @Get('me/achievements')
  async getUserAchievements(@Req() req: AuthRequest) {
    return this.userService.getUserAchievements(req.user.id);
  }

  @Get('me/activities')
  async getUserActivities(
    @Req() req: AuthRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.userService.getUserActivities(req.user.id, page, limit);
  }

  @Post('me/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateAccount(@Req() req: AuthRequest): Promise<void> {
    await this.userService.deactivateUser(req.user.id);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Req() req: AuthRequest): Promise<void> {
    await this.userService.deleteUser(req.user.id);
  }

  @Get('search')
  async searchUsers(@Query() searchDto: SearchUserDto) {
    return this.userService.searchUsers(searchDto);
  }

  @Get(':id')
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.userService.findById(id, true);
  }

  @Get()
  async getAllUsers(@Query() searchDto: SearchUserDto) {
    return this.userService.findAll(searchDto);
  }

  @Get('stats/overview')
  async getUserStats(): Promise<UserStatsDto> {
    return this.userService.getUserStats();
  }

  @Put(':id/status')
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ): Promise<UserResponseDto> {
    return this.userService.updateStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUserById(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.userService.deleteUser(id);
  }
}

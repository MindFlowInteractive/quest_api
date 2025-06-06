/* eslint-disable prettier/prettier */
import { IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTemplateDto {
  @ApiProperty({
    example: 101,
    description: 'Unique identifier of the template to be updated',
  })
  @IsNumber()
  id: number;

  @ApiPropertyOptional({
    example: 'New Care Plan Title',
    description: 'Updated title of the template',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: '<h1>New Template HTML</h1>',
    description: 'Updated content in HTML or rich text format',
  })
  @IsOptional()
  @IsString()
  content?: string;
}

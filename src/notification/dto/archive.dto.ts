/* eslint-disable prettier/prettier */
import { IsArray } from 'class-validator';

export class ArchiveDto {
  @IsArray()
  notificationIds: number[];
  ids: string[];
}

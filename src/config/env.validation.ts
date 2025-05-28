import { IsString, IsNumber, IsOptional, validateSync } from 'class-validator';
import { plainToClass, Transform } from 'class-transformer';

export class EnvironmentVariables {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  PORT?: number = 3000;

  @IsOptional()
  @IsString()
  DATABASE_HOST?: string = 'localhost';

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  DATABASE_PORT?: number = 5432;

  @IsOptional()
  @IsString()
  DATABASE_USERNAME?: string = 'postgres';

  @IsOptional()
  @IsString()
  DATABASE_PASSWORD?: string = 'password';

  @IsOptional()
  @IsString()
  DATABASE_NAME?: string = 'logiquest';

  @IsOptional()
  @IsString()
  JWT_SECRET?: string = 'your-secret-key';

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string = '24h';

  @IsOptional()
  @IsString()
  REDIS_HOST?: string = 'localhost';

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  REDIS_PORT?: number = 6379;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string = '';

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string = 'http://localhost:3000';

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  RATE_LIMIT_TTL?: number = 60;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  RATE_LIMIT_MAX?: number = 10;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}

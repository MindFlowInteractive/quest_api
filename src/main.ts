import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Apply security headers
  app.use(helmet());

  // Enable CORS
  app.enableCors({
    origin: configService.get<string>('cors.origin'),
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Set API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger Setup (enabled by env flag)
  if (configService.get('ENABLE_SWAGGER') !== 'false') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('LogiQuest API')
      .setDescription('Comprehensive API documentation for the LogiQuest puzzle game')
      .setVersion('1.0')
      .addBearerAuth()
      .addServer('/api/v1')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
      customSiteTitle: 'LogiQuest API Docs',
      // Optionally include this if you have custom CSS hosted
      // customCssUrl: '/docs/custom-swagger.css',
    });

    console.log(`📚 Swagger documentation available at: http://localhost:${configService.get<number>('port')}/api/docs`);
  }

  // Launch app
  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);

  console.log(`🚀 LogiQuest API running at: http://localhost:${port}`);
}

void bootstrap();

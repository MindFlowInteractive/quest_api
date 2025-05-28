# LogiQuest API

## For any question contact us through our telegram channel: https://t.me/+uCENCnbnruxiMjA0

A robust NestJS backend API for the LogiQuest puzzle game platform. Built with TypeScript, featuring modular architecture, comprehensive security, and developer-friendly tooling.

## 🚀 Features

- **Modular Architecture**: Organized into separate modules for users, puzzles, achievements, and game logic
- **Type Safety**: Full TypeScript support with strict mode enabled
- **Security**: Helmet, CORS, and rate limiting configured
- **Validation**: Request validation using class-validator
- **Logging**: Structured logging with Winston
- **Documentation**: Auto-generated API docs with Swagger
- **Code Quality**: ESLint, Prettier, and pre-commit hooks
- **Environment Management**: Validated environment variables

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Git

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd quest_api
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up git hooks**
   ```bash
   npm run prepare
   ```

## 🏗️ Project Structure

```
src/
├── config/                 # Configuration files
│   ├── configuration.ts    # Environment configuration
│   └── env.validation.ts   # Environment validation schema
├── modules/                # Feature modules
│   ├── users/             # User management
│   ├── puzzles/           # Puzzle management
│   ├── achievements/      # Achievement system
│   └── game/              # Game logic
├── common/                # Shared utilities
│   ├── guards/           # Authentication guards
│   ├── interceptors/     # Request/response interceptors
│   ├── decorators/       # Custom decorators
│   └── filters/          # Exception filters
├── app.module.ts          # Root application module
└── main.ts               # Application entry point
```

## 🚦 Available Scripts

### Development

```bash
npm run start:dev          # Start in development mode with hot reload
npm run start:debug        # Start in debug mode
npm run build              # Build the application
npm run start:prod         # Start in production mode
```

### Code Quality

```bash
npm run lint               # Run ESLint with auto-fix
npm run lint:check         # Run ESLint without auto-fix
npm run format             # Format code with Prettier
npm run typecheck          # Run TypeScript type checking
```

### Testing

```bash
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run end-to-end tests
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

| Variable            | Description                      | Default                 |
| ------------------- | -------------------------------- | ----------------------- |
| `PORT`              | Server port                      | `3000`                  |
| `DATABASE_HOST`     | Database host                    | `localhost`             |
| `DATABASE_PORT`     | Database port                    | `5432`                  |
| `DATABASE_USERNAME` | Database username                | `postgres`              |
| `DATABASE_PASSWORD` | Database password                | `password`              |
| `DATABASE_NAME`     | Database name                    | `logiquest`             |
| `JWT_SECRET`        | JWT secret key                   | `your-secret-key`       |
| `JWT_EXPIRES_IN`    | JWT expiration time              | `24h`                   |
| `REDIS_HOST`        | Redis host                       | `localhost`             |
| `REDIS_PORT`        | Redis port                       | `6379`                  |
| `CORS_ORIGIN`       | CORS allowed origin              | `http://localhost:3000` |
| `RATE_LIMIT_TTL`    | Rate limit time window (seconds) | `60`                    |
| `RATE_LIMIT_MAX`    | Max requests per time window     | `10`                    |

## 📚 API Documentation

Once the server is running, you can access the Swagger documentation at:

```
http://localhost:3000/api/docs
```

## 🔒 Security Features

- **Helmet**: Security headers middleware
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: Request rate limiting with Redis
- **Input Validation**: Request validation with class-validator
- **Environment Validation**: Startup-time environment validation

## 🏛️ Architecture

### Modules

- **Users Module**: User registration, authentication, and profile management
- **Puzzles Module**: Puzzle creation, management, and retrieval
- **Achievements Module**: Achievement system and progress tracking
- **Game Module**: Game logic, scoring, and session management

### Common Utilities

- **Guards**: Authentication and authorization
- **Interceptors**: Logging, transformation, and caching
- **Decorators**: Custom parameter and method decorators
- **Filters**: Global exception handling

## 🧪 Testing

The project includes comprehensive testing setup:

- **Unit Tests**: Jest-based unit testing for services and controllers
- **E2E Tests**: End-to-end testing for API endpoints
- **Coverage**: Code coverage reporting

## 📝 Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Write meaningful commit messages
- Add JSDoc comments for public APIs

### Git Workflow

- Pre-commit hooks run linting and formatting
- Use conventional commit messages
- Create feature branches for new development

### Module Structure

Each module should follow this structure:

```
module-name/
├── dto/                   # Data transfer objects
├── entities/              # Database entities
├── module-name.controller.ts
├── module-name.service.ts
├── module-name.module.ts
└── tests/                 # Module-specific tests
```

## 🚀 Deployment

### Production Build

```bash
npm run build
npm run start:prod
```

### Environment Setup

- Set `NODE_ENV=production`
- Configure production database
- Set secure JWT secret
- Configure production CORS origins
- Set up proper logging levels

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the UNLICENSED License.

## 🆘 Support

For support and questions, please open an issue in the repository.

---

Built with ❤️ using [NestJS](https://nestjs.com/)

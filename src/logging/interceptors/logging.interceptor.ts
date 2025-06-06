import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
  HttpException,
} from "@nestjs/common"
import { type Observable, throwError } from "rxjs"
import { tap, catchError } from "rxjs/operators"
import type { WinstonLoggerService } from "../services/winston-logger.service"
import type { ErrorTrackingService } from "../services/error-tracking.service"
import { CORRELATION_ID_HEADER } from "../../common/constants/logging.constants"

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private logger: WinstonLoggerService,
    private errorTracker: ErrorTrackingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const correlationId = request.headers[CORRELATION_ID_HEADER]
    const className = context.getClass().name
    const methodName = context.getHandler().name

    const logContext = {
      correlationId,
      class: className,
      method: methodName,
    }

    this.logger.debug(`Entering ${className}.${methodName}`, logContext)

    const startTime = Date.now()

    return next.handle().pipe(
      tap((data) => {
        const executionTime = Date.now() - startTime
        this.logger.debug(`Exiting ${className}.${methodName}`, {
          ...logContext,
          executionTime,
          hasData: !!data,
        })
      }),
      catchError((error) => {
        const executionTime = Date.now() - startTime

        this.logger.error(`Error in ${className}.${methodName}`, {
          ...logContext,
          executionTime,
          error: error.message,
          stack: error.stack,
        })

        // Track the error
        this.errorTracker.trackError(error, {
          ...logContext,
          statusCode: error instanceof HttpException ? error.getStatus() : 500,
        })

        return throwError(() => error)
      }),
    )
  }
}

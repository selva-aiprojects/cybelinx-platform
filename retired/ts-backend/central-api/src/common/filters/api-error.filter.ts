import { ArgumentsHost, Catch, ExceptionFilter, Injectable } from '@nestjs/common';
import { ApiError } from '@cybelinx/shared';
import type { Response } from 'express';

@Injectable()
@Catch(ApiError)
export class ApiErrorFilter implements ExceptionFilter {
  catch(exception: ApiError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(exception.status).json({
      statusCode: exception.status,
      code: exception.code,
      message: exception.message,
      details: exception.details ?? undefined,
    });
  }
}
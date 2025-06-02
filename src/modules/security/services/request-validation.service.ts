import { Injectable, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class RequestValidationService {
  async validateAndSanitize<T extends object>(dto: T): Promise<T> {
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return this.sanitizeObject(dto);
  }

  private sanitizeObject<T extends object>(obj: T): T {
    const sanitized = { ...obj };
    
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        (sanitized as any)[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        (sanitized as any)[key] = this.sanitizeObject(value);
      }
    }

    return sanitized;
  }

  private sanitizeString(value: string): string {
    return sanitizeHtml(value, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {}, // No attributes allowed
      disallowedTagsMode: 'recursiveEscape'
    });
  }

  validateContentType(contentType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(contentType.toLowerCase());
  }

  validateFileSize(size: number, maxSize: number): boolean {
    return size <= maxSize;
  }

  validateEndpoint(endpoint: string): boolean {
    // Validate endpoint format (e.g., /api/v1/resource)
    const endpointRegex = /^\/api\/v[0-9]+\/[\w\-\/]+$/;
    return endpointRegex.test(endpoint);
  }
}

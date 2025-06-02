import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
} from '@nestjs/common';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailTemplate } from '../entities/email-template.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Email Templates')
@Controller('api/v1/email/templates')
export class EmailTemplateController {
  constructor(private readonly templateService: EmailTemplateService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new email template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template created successfully',
  })
  async createTemplate(
    @Body() template: Partial<EmailTemplate>,
  ): Promise<EmailTemplate> {
    return this.templateService.createTemplate(template);
  }

  @Get()
  @ApiOperation({ summary: 'Get all email templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates retrieved successfully',
  })
  async listTemplates(): Promise<EmailTemplate[]> {
    return this.templateService.listTemplates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an email template by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  async getTemplate(@Param('id') id: string): Promise<EmailTemplate> {
    return this.templateService.getTemplate(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an email template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  async updateTemplate(
    @Param('id') id: string,
    @Body() template: Partial<EmailTemplate>,
  ): Promise<EmailTemplate> {
    return this.templateService.updateTemplate(id, template);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an email template' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Template deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  async deleteTemplate(@Param('id') id: string): Promise<void> {
    await this.templateService.deleteTemplate(id);
  }

  @Post(':id/render')
  @ApiOperation({ summary: 'Render an email template with variables' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template rendered successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  async renderTemplate(
    @Param('id') id: string,
    @Body() variables: Record<string, any>,
  ): Promise<{ rendered: string }> {
    const template = await this.templateService.getTemplate(id);
    const rendered = await this.templateService.renderTemplate(
      template,
      variables,
    );
    return { rendered: rendered.html };
  }
}

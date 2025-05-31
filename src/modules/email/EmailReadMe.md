# Email Service Documentation

## Overview

The email service is a comprehensive solution for handling email communications in the LogiQuest application. It supports multiple email providers, templating, tracking, and automation features.

## Features

- Multiple email provider support (SendGrid/AWS SES)
- MJML-based responsive email templates
- Email queue management with BullMQ
- Comprehensive email tracking and analytics
- User preference management
- Unsubscribe handling
- Webhook integration
- Automated email workflows

## Prerequisites

1. Redis server for email queue management
2. PostgreSQL database for email tracking and templates
3. SendGrid or AWS SES account
4. Node.js 16+ and npm

## Environment Variables

Create a `.env` file with the following variables:

```env
# Email Configuration
EMAIL_PROVIDER=sendgrid # or 'ses'
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=LogiQuest

# SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key

# AWS SES Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=your-aws-region

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=logiquest

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Email Tracking
EMAIL_WEBHOOK_SECRET=your-webhook-secret
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Run database migrations:
```bash
npm run typeorm migration:run
```

3. Start Redis server:
```bash
# Using Docker
docker run -d -p 6379:6379 redis

# Or install Redis locally
# Follow instructions at https://redis.io/download
```

4. Start the application:
```bash
npm run start:dev
```

## API Documentation

### Email Templates

#### Create Template
```http
POST /api/v1/email/templates
Content-Type: application/json

{
  "name": "welcome",
  "subject": "Welcome to LogiQuest",
  "html": "<mjml>...</mjml>",
  "text": "Welcome text",
  "category": "onboarding"
}
```

#### Get Templates
```http
GET /api/v1/email/templates
```

#### Get Template by Name
```http
GET /api/v1/email/templates/:name
```

### Email Sending

#### Send Email
```http
POST /api/v1/email/send
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Test Email",
  "html": "<p>Content</p>",
  "text": "Content"
}
```

#### Send Templated Email
```http
POST /api/v1/email/send-templated
Content-Type: application/json

{
  "templateName": "welcome",
  "to": "user@example.com",
  "templateData": {
    "name": "John Doe"
  }
}
```

### Email Preferences

#### Update Preferences
```http
POST /api/v1/email/preferences
Content-Type: application/json

{
  "email": "user@example.com",
  "preferences": {
    "newsletters": true,
    "announcements": false
  }
}
```

#### Unsubscribe
```http
POST /api/v1/email/unsubscribe
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "unsubscribe-token"
}
```

### Email Tracking

#### Get Tracking Status
```http
GET /api/v1/email/tracking/:messageId
```

#### Webhook Endpoint
```http
POST /api/v1/email/tracking/webhook
Content-Type: application/json

{
  "event": "delivered",
  "messageId": "message-id",
  "email": "user@example.com"
}
```

## Template Creation Guidelines

### MJML Structure

```mjml
<mjml>
  <mj-head>
    <mj-title>Email Title</mj-title>
    <mj-font name="Roboto" href="https://fonts.googleapis.com/css?family=Roboto" />
    <mj-attributes>
      <mj-all font-family="Roboto, Helvetica, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>
          Hello {{name}}!
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### Template Variables

Use Handlebars syntax for dynamic content:
- `{{variableName}}` for simple variables
- `{{#if condition}}...{{/if}}` for conditionals
- `{{#each items}}...{{/each}}` for loops

### Best Practices

1. Always include a text version of your email
2. Use responsive design with MJML
3. Keep images hosted on a CDN
4. Test emails across different clients
5. Include unsubscribe links
6. Follow email marketing regulations

## Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:e2e
```

### Test Environment
Create a `.env.test` file for test-specific configuration:
```env
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_USERNAME=postgres
TEST_DB_PASSWORD=password
TEST_DB_NAME=logiquest_test
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Monitoring and Maintenance

### Queue Monitoring
- Monitor queue size and processing rate
- Set up alerts for failed jobs
- Check Redis memory usage

### Email Provider Monitoring
- Monitor delivery rates
- Check bounce rates
- Review spam reports

### Database Maintenance
- Regular backups
- Index optimization
- Data retention policies

## Security Considerations

1. API Key Management
   - Rotate keys regularly
   - Use environment variables
   - Restrict key permissions

2. Webhook Security
   - Validate webhook signatures
   - Use HTTPS
   - Rate limit webhook endpoints

3. Data Protection
   - Encrypt sensitive data
   - Implement data retention policies
   - Follow GDPR guidelines

## Troubleshooting

### Common Issues

1. Email Not Sending
   - Check provider credentials
   - Verify queue status
   - Check rate limits

2. Template Rendering Issues
   - Validate MJML syntax
   - Check variable names
   - Test template preview

3. Tracking Not Working
   - Verify webhook configuration
   - Check database connection
   - Validate tracking IDs

### Logs
- Check application logs in `logs/`
- Monitor Redis logs
- Review provider logs

## Support

For issues and support:
1. Check the documentation
2. Review logs
3. Contact the development team
4. Submit an issue on GitHub

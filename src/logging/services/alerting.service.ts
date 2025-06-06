import { Injectable } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import type { WinstonLoggerService } from "./winston-logger.service"
import { AlertSeverity } from "../../common/types/logging.types"

interface AlertPayload {
  title: string
  message: string
  severity: AlertSeverity
  context?: Record<string, any>
}

@Injectable()
export class AlertingService {
  private alertCooldowns: Map<string, Date> = new Map()
  private readonly cooldownPeriod = 5 * 60 * 1000 // 5 minutes

  constructor(
    private logger: WinstonLoggerService,
    private configService: ConfigService,
  ) {}

  async sendAlert(payload: AlertPayload): Promise<void> {
    const alertKey = `${payload.title}:${payload.severity}`

    // Check cooldown to prevent spam
    if (this.isInCooldown(alertKey)) {
      return
    }

    this.setCooldown(alertKey)

    // Log the alert
    this.logger.error("ALERT TRIGGERED", {
      alert: payload,
      timestamp: new Date().toISOString(),
    })

    // Send to external alerting systems
    await Promise.all([this.sendSlackAlert(payload), this.sendEmailAlert(payload), this.sendWebhookAlert(payload)])
  }

  private isInCooldown(alertKey: string): boolean {
    const lastAlert = this.alertCooldowns.get(alertKey)
    if (!lastAlert) return false

    return Date.now() - lastAlert.getTime() < this.cooldownPeriod
  }

  private setCooldown(alertKey: string): void {
    this.alertCooldowns.set(alertKey, new Date())
  }

  private async sendSlackAlert(payload: AlertPayload): Promise<void> {
    const webhookUrl = this.configService.get<string>("SLACK_WEBHOOK_URL")
    if (!webhookUrl) return

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 ${payload.title}`,
          attachments: [
            {
              color: this.getSeverityColor(payload.severity),
              fields: [
                { title: "Message", value: payload.message, short: false },
                { title: "Severity", value: payload.severity.toUpperCase(), short: true },
                { title: "Timestamp", value: new Date().toISOString(), short: true },
              ],
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.statusText}`)
      }
    } catch (error) {
      this.logger.error("Failed to send Slack alert", { error: error.message })
    }
  }

  private async sendEmailAlert(payload: AlertPayload): Promise<void> {
    // Implement email alerting (using nodemailer, SES, etc.)
    // This is a placeholder implementation
    const emailEnabled = this.configService.get<boolean>("EMAIL_ALERTS_ENABLED", false)
    if (!emailEnabled) return

    this.logger.info("Email alert would be sent", { payload })
  }

  private async sendWebhookAlert(payload: AlertPayload): Promise<void> {
    const webhookUrl = this.configService.get<string>("ALERT_WEBHOOK_URL")
    if (!webhookUrl) return

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
          service: "nestjs-app",
        }),
      })

      if (!response.ok) {
        throw new Error(`Webhook alert failed: ${response.statusText}`)
      }
    } catch (error) {
      this.logger.error("Failed to send webhook alert", { error: error.message })
    }
  }

  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return "danger"
      case AlertSeverity.HIGH:
        return "warning"
      case AlertSeverity.MEDIUM:
        return "#ffaa00"
      case AlertSeverity.LOW:
        return "good"
      default:
        return "#cccccc"
    }
  }
}

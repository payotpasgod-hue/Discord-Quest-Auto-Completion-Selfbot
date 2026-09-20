import { REST, WebhooksAPI } from '@discordjs/core';
import type { APIEmbed, RESTPostAPIWebhookWithTokenJSONBody } from 'discord-api-types/v10';
import { logger } from './logger';

const COLORS = {
  brand: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  error: 0xed4245,
} as const;

export class WebhookNotifier {
  private readonly api = new WebhooksAPI(new REST());
  private readonly id: string | null;
  private readonly token: string | null;

  constructor(webhookUrl?: string) {
    const match = webhookUrl?.match(/\/webhooks\/([^/]+)\/([^/?#]+)/);
    this.id = match?.[1] ?? null;
    this.token = match?.[2] ?? null;

    if (webhookUrl && (!this.id || !this.token)) {
      logger.warn('WEBHOOK_URL is invalid; notifications are disabled.');
    }
  }

  get enabled(): boolean {
    return Boolean(this.id && this.token);
  }

  async send(embed: APIEmbed): Promise<void> {
    if (!this.id || !this.token) return;

    const body: RESTPostAPIWebhookWithTokenJSONBody = {
      embeds: [
        {
          ...embed,
          footer: embed.footer ?? {
            text: 'Discord Quest Runner',
          },
          timestamp: embed.timestamp ?? new Date().toISOString(),
        },
      ],
    };

    try {
      await this.api.execute(this.id, this.token, body);
    } catch (error) {
      logger.warn('Failed to send webhook notification', error);
    }
  }

  async startup(username?: string): Promise<void> {
    const fields = username
      ? [{ name: 'Account', value: `\`${username}\``, inline: true }]
      : [];

    await this.send({
      title: 'Quest Runner Started',
      description: 'The quest run has started successfully.',
      color: COLORS.brand,
      fields,
      timestamp: new Date().toISOString(),
    });
  }

  async completed(name: string, questId: string): Promise<void> {
    await this.send({
      title: 'Quest Completed',
      description: `**${name}** was completed successfully.`,
      color: COLORS.success,
      url: `https://discord.com/quests/${questId}`,
      timestamp: new Date().toISOString(),
    });
  }

  async summary(total: number, processed: number, failed: number): Promise<void> {
    const title = failed > 0 ? 'Quest Run Finished with Warnings' : 'Quest Run Finished';
    const color = failed > 0 ? COLORS.warning : COLORS.success;

    await this.send({
      title,
      color,
      description: failed > 0
        ? 'Some quests failed during the run. Review the logs for details.'
        : 'Everything processed successfully.',
      fields: [
        { name: 'Discovered', value: String(total), inline: true },
        { name: 'Completed', value: String(processed), inline: true },
        { name: 'Failed', value: String(failed), inline: true },
      ],
      timestamp: new Date().toISOString(),
    });
  }

  async error(message: string): Promise<void> {
    await this.send({
      title: 'Quest Runner Error',
      description: message.slice(0, 4096),
      color: COLORS.error,
      timestamp: new Date().toISOString(),
    });
  }
}

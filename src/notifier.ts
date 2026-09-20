import { REST, WebhooksAPI } from '@discordjs/core';
import type { APIEmbed, RESTPostAPIWebhookWithTokenJSONBody } from 'discord-api-types/v10';
import { logger } from './logger';

const COLORS = { brand: 0x5865f2, success: 0x57f287, warning: 0xfee75c, error: 0xed4245 } as const;

export class WebhookNotifier {
  private readonly api = new WebhooksAPI(new REST());
  private readonly id: string | null;
  private readonly token: string | null;

  constructor(webhookUrl?: string) {
    const match = webhookUrl?.match(/\/webhooks\/([^/]+)\/([^/?#]+)/);
    this.id = match?.[1] ?? null;
    this.token = match?.[2] ?? null;
    if (webhookUrl && (!this.id || !this.token)) logger.warn('WEBHOOK_URL is invalid; notifications are disabled.');
  }

  get enabled(): boolean { return Boolean(this.id && this.token); }

  async send(embed: APIEmbed): Promise<void> {
    if (!this.id || !this.token) return;
    const body: RESTPostAPIWebhookWithTokenJSONBody = { embeds: [embed] };
    try {
      await this.api.execute(this.id, this.token, body);
    } catch (error) {
      // Notifications must never crash or interrupt quest processing.
      logger.warn('Failed to send webhook notification', error);
    }
  }

  async startup(username?: string): Promise<void> {
    return this.send({ title: 'Quest Runner Started', description: 'The quest run has started.', color: COLORS.brand, fields: username ? [{ name: 'Account', value: `\`${username}\``, inline: true }] : [], timestamp: new Date().toISOString() });
  }

  async completed(name: string, questId: string): Promise<void> {
    return this.send({ title: 'Quest Completed', description: `**${name}** was completed successfully.`, color: COLORS.success, url: `https://discord.com/quests/${questId}`, timestamp: new Date().toISOString() });
  }

  async summary(total: number, processed: number, failed: number): Promise<void> {
    return this.send({ title: failed ? 'Quest Run Finished with Warnings' : 'Quest Run Finished', color: failed ? COLORS.warning : COLORS.success, fields: [{ name: 'Discovered', value: String(total), inline: true }, { name: 'Processed', value: String(processed), inline: true }, { name: 'Failed', value: String(failed), inline: true }], timestamp: new Date().toISOString() });
  }

  async error(message: string): Promise<void> {
    return this.send({ title: 'Quest Runner Error', description: message.slice(0, 4096), color: COLORS.error, timestamp: new Date().toISOString() });
  }
}

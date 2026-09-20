import { GatewayDispatchEvents } from 'discord-api-types/v10';
import { ClientQuest } from './src/client';
import { loadConfig } from './src/config';
import { logger } from './src/logger';
import { QuestRunner } from './src/runner';

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new ClientQuest(config.token, config.webhookUrl);
  const runner = new QuestRunner(client);

  client.once(GatewayDispatchEvents.Ready, async ({ data }) => {
    const username = data.user.username;
    logger.success(`Logged in as @${username}`);

    try {
      await client.notifyStartup(username);
      const summary = await runner.run();

      logger.info(
        `Run complete: ${summary.completed}/${summary.total} completed, ${summary.failed} failed in ${Math.round(summary.durationMs / 1000)}s`,
      );

      await client.notifySummary(summary.total, summary.completed, summary.failed);
    } catch (error) {
      const message = logger.formatError(error);
      logger.error('Quest run failed', message);
      await client.notifyError(message);
    } finally {
      logger.info('All tasks completed. Disconnecting...');
      await client.destroy().catch((error) => {
        logger.warn('Failed to disconnect cleanly', error);
      });
    }
  });

  await client.connect();
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
});

main().catch((error) => {
  logger.error('Unable to start the runner', error);
  process.exitCode = 1;
});

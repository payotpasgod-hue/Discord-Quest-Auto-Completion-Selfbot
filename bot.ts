import { GatewayDispatchEvents } from 'discord-api-types/v10';
import { ClientQuest } from './src/client';
import { loadConfig } from './src/config';
import { logger } from './src/logger';

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new ClientQuest(config.token, config.webhookUrl);

  client.once(GatewayDispatchEvents.Ready, async ({ data }) => {
    const username = data.user.username;
    logger.success(`Logged in as @${username}`);

    try {
      await client.notifyStartup(username);
      const manager = await client.fetchQuests(false);
      const quests = manager.filterQuestsValidToDo();
      logger.info(`Found ${quests.length} valid quests to process.`);

      const results = await Promise.allSettled(quests.map((quest) => manager.doingQuest(quest)));
      const failed = results.filter((result) => result.status === 'rejected');
      failed.forEach((result) => logger.error('Quest processing failed', result.reason));
      await client.notifySummary(quests.length, results.length - failed.length, failed.length);
    } catch (error) {
      logger.error('Quest run failed', error);
      await client.notifyError(logger.formatError(error));
    } finally {
      logger.info('All quests processed. Disconnecting...');
      await client.destroy().catch((error) => logger.warn('Failed to disconnect cleanly', error));
    }
  });

  await client.connect();
}

process.on('unhandledRejection', (reason) => logger.error('Unhandled promise rejection', reason));
process.on('uncaughtException', (error) => logger.error('Uncaught exception', error));

main().catch((error) => {
  logger.error('Unable to start the runner', error);
  process.exitCode = 1;
});

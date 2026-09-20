import { GatewayDispatchEvents } from 'discord-api-types/v10';
import { ClientQuest } from './src/client';
import { loadConfig } from './src/config';
import { logger } from './src/logger';

async function processQuests(client: ClientQuest): Promise<void> {
  const manager = await client.fetchQuests(false);
  const quests = manager.filterQuestsValidToDo();

  logger.info(`Found ${quests.length} valid quests to process.`);
  if (quests.length === 0) {
    await client.notifySummary(0, 0, 0);
    return;
  }

  const results = await Promise.allSettled(
    quests.map(async (quest) => {
      try {
        await manager.doingQuest(quest);
        return { questId: quest.id, questName: quest.config.messages.quest_name };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Quest "${quest.config.messages.quest_name}" failed: ${message}`);
      }
    }),
  );

  const failures = results.filter((result) => result.status === 'rejected');
  const successfulCount = results.length - failures.length;

  for (const failure of failures) {
    logger.error('Quest processing failed', failure.status === 'rejected' ? failure.reason : failure);
  }

  await client.notifySummary(quests.length, successfulCount, failures.length);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new ClientQuest(config.token, config.webhookUrl);

  client.once(GatewayDispatchEvents.Ready, async ({ data }) => {
    const username = data.user.username;
    logger.success(`Logged in as @${username}`);

    try {
      await client.notifyStartup(username);
      await processQuests(client);
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

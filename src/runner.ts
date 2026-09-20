import type { Quest } from './quest';
import type { QuestManager } from './questManager';
import type { ClientQuest } from './client';
import { logger } from './logger';

export interface QuestRunSummary {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export class QuestRunner {
  private readonly startedAt = Date.now();

  constructor(private readonly client: ClientQuest) {}

  async run(): Promise<QuestRunSummary> {
    const manager = await this.client.fetchQuests(false);
    const quests = manager.filterQuestsValidToDo();

    logger.info(`Found ${quests.length} valid quests to process.`);
    if (quests.length === 0) {
      return this.buildSummary(0, 0, 0, 0);
    }

    const results = await Promise.allSettled(
      quests.map(async (quest) => this.executeQuest(manager, quest)),
    );

    const failed = results.filter((result) => result.status === 'rejected');
    const completed = results.filter((result) => result.status === 'fulfilled').length;

    for (const failure of failed) {
      const reason = failure.status === 'rejected' ? failure.reason : failure;
      logger.error('Quest processing failed', reason);
    }

    return this.buildSummary(quests.length, completed, failed.length, 0);
  }

  private async executeQuest(manager: QuestManager, quest: Quest): Promise<void> {
    try {
      await manager.doingQuest(quest);
      if (quest.isCompleted()) {
        await this.client.notifyQuestCompleted(
          quest.config.messages.quest_name,
          quest.id,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Quest "${quest.config.messages.quest_name}" failed: ${message}`);
    }
  }

  private buildSummary(
    total: number,
    completed: number,
    failed: number,
    skipped: number,
  ): QuestRunSummary {
    const finishedAt = Date.now();
    return {
      total,
      completed,
      failed,
      skipped,
      startedAt: new Date(this.startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - this.startedAt,
    };
  }
}

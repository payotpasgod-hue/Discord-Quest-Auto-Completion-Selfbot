import process from 'node:process';

export interface AppConfig {
  token: string;
  webhookUrl?: string;
  environment: 'local' | 'github-actions';
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const token = env.TOKEN?.trim();
  if (!token) {
    throw new Error('TOKEN is required. Add it to .env or your GitHub Actions secrets.');
  }

  return {
    token,
    webhookUrl: optional(env.WEBHOOK_URL),
    environment: env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local',
  };
}

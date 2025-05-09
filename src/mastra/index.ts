
import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow, hackerNewsWorkflow } from './workflows';
import { weatherAgent, hackerNewsAgent } from './agents';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, hackerNewsWorkflow },
  agents: { weatherAgent, hackerNewsAgent },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
});

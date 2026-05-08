export enum AppStep {
  DASHBOARD = 'DASHBOARD',
  TOPIC_SELECTION = 'TOPIC_SELECTION',
  AUTO_GENERATION = 'AUTO_GENERATION',
  SCRIPT_GENERATION = 'SCRIPT_GENERATION',
  PRODUCTION_ELEMENTS = 'PRODUCTION_ELEMENTS',
  PREVIEW = 'PREVIEW',
  EXPORT = 'EXPORT',
}

export interface ProjectContext {
  projectId: string;
  topic: string;
  niche?: string;
}

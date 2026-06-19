export {
  appConfigSchema,
  cliConfigSchema,
  snapshotConfigSchema,
  type AppConfig,
  type CliConfig,
  type SnapshotConfig
} from "./config/schema.js";

export {
  agentActionSchema,
  clickActionSchema,
  defaultScrollAmount,
  finishActionSchema,
  maxScrollAmount,
  maxWaitMs,
  parseAgentAction,
  pressActionSchema,
  scrollActionSchema,
  selectActionSchema,
  typeActionSchema,
  waitActionSchema,
  type AgentAction,
  type ClickAction,
  type FinishAction,
  type PressAction,
  type ScrollAction,
  type SelectAction,
  type TypeAction,
  type WaitAction
} from "./actions/schema.js";

export {
  DomCompactRefRegistry,
  buildDomCompactRefRegistry,
  collectDomCompactRefTargets,
  type DomCompactRefTarget,
  type ExecutableTarget,
  type RefRegistry
} from "./actions/refRegistry.js";

export { executeAction, type ActionResult } from "./actions/executor.js";

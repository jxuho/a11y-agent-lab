import { z } from "zod";

export const maxWaitMs = 5_000;
export const defaultScrollAmount = 700;
export const maxScrollAmount = 5_000;

const refSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9:_-]+$/, "Ref must be a stable observer ref, not a selector");

const boundedTextSchema = z.string().max(10_000);

export const clickActionSchema = z
  .object({
    type: z.literal("click"),
    ref: refSchema
  })
  .strict();

export const typeActionSchema = z
  .object({
    type: z.literal("type"),
    ref: refSchema,
    text: boundedTextSchema,
    clear: z.boolean().optional()
  })
  .strict();

export const selectActionSchema = z
  .object({
    type: z.literal("select"),
    ref: refSchema,
    value: z.string().min(1).max(1_000)
  })
  .strict();

export const pressActionSchema = z
  .object({
    type: z.literal("press"),
    key: z.string().min(1).max(64)
  })
  .strict();

export const scrollActionSchema = z
  .object({
    type: z.literal("scroll"),
    direction: z.enum(["up", "down"]),
    amount: z.number().int().positive().max(maxScrollAmount).optional()
  })
  .strict();

export const waitActionSchema = z
  .object({
    type: z.literal("wait"),
    ms: z.number().int().nonnegative().max(maxWaitMs)
  })
  .strict();

export const finishActionSchema = z
  .object({
    type: z.literal("finish"),
    answer: z.string().max(4_000).optional()
  })
  .strict();

export const agentActionSchema = z.discriminatedUnion("type", [
  clickActionSchema,
  typeActionSchema,
  selectActionSchema,
  pressActionSchema,
  scrollActionSchema,
  waitActionSchema,
  finishActionSchema
]);

export type AgentAction = z.infer<typeof agentActionSchema>;
export type ClickAction = z.infer<typeof clickActionSchema>;
export type TypeAction = z.infer<typeof typeActionSchema>;
export type SelectAction = z.infer<typeof selectActionSchema>;
export type PressAction = z.infer<typeof pressActionSchema>;
export type ScrollAction = z.infer<typeof scrollActionSchema>;
export type WaitAction = z.infer<typeof waitActionSchema>;
export type FinishAction = z.infer<typeof finishActionSchema>;

export function parseAgentAction(value: unknown): AgentAction {
  return agentActionSchema.parse(value);
}

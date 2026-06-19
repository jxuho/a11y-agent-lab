import { z } from "zod";

const optionalDescriptionSchema = z.string().optional();
const selectorSchema = z.string().min(1);
const expectedTextSchema = z.string();

const textAssertionBaseSchema = z
  .object({
    type: z.literal("text"),
    selector: selectorSchema,
    equals: expectedTextSchema.optional(),
    contains: expectedTextSchema.optional(),
    description: optionalDescriptionSchema
  })
  .strict();

const inputValueAssertionBaseSchema = z
  .object({
    type: z.literal("inputValue"),
    selector: selectorSchema,
    equals: expectedTextSchema.optional(),
    contains: expectedTextSchema.optional(),
    description: optionalDescriptionSchema
  })
  .strict();

const urlAssertionBaseSchema = z
  .object({
    type: z.literal("url"),
    equals: expectedTextSchema.optional(),
    contains: expectedTextSchema.optional(),
    description: optionalDescriptionSchema
  })
  .strict();

const jsAssertionBaseSchema = z
  .object({
    type: z.literal("js"),
    expression: z.string().min(1),
    equals: z.unknown().optional(),
    truthy: z.literal(true).optional(),
    description: optionalDescriptionSchema
  })
  .strict();

export const textAssertionSchema = textAssertionBaseSchema.superRefine((value, context) => {
  addExactlyOneIssue(value, context, ["equals", "contains"]);
});

export const inputValueAssertionSchema = inputValueAssertionBaseSchema.superRefine(
  (value, context) => {
    addExactlyOneIssue(value, context, ["equals", "contains"]);
  }
);

export const urlAssertionSchema = urlAssertionBaseSchema.superRefine((value, context) => {
  addExactlyOneIssue(value, context, ["equals", "contains"]);
});

export const jsAssertionSchema = jsAssertionBaseSchema.superRefine((value, context) => {
  addExactlyOneIssue(value, context, ["equals", "truthy"]);
});

export const evaluatorAssertionSchema = z.union([
  textAssertionSchema,
  inputValueAssertionSchema,
  urlAssertionSchema,
  jsAssertionSchema
]);

export const evaluatorConfigSchema = z
  .object({
    assertions: z.array(evaluatorAssertionSchema).nonempty("At least one evaluator assertion is required")
  })
  .strict();

export type TextEvaluatorAssertion = z.infer<typeof textAssertionSchema>;
export type InputValueEvaluatorAssertion = z.infer<typeof inputValueAssertionSchema>;
export type UrlEvaluatorAssertion = z.infer<typeof urlAssertionSchema>;
export type JsEvaluatorAssertion = z.infer<typeof jsAssertionSchema>;
export type EvaluatorAssertion = z.infer<typeof evaluatorAssertionSchema>;
export type EvaluatorConfig = z.infer<typeof evaluatorConfigSchema>;

function addExactlyOneIssue(
  value: Record<string, unknown>,
  context: z.RefinementCtx,
  keys: [string, string]
): void {
  const presentCount = keys.filter((key) => Object.prototype.hasOwnProperty.call(value, key)).length;

  if (presentCount === 1) {
    return;
  }

  context.addIssue({
    code: z.ZodIssueCode.custom,
    message: `Provide exactly one of ${keys[0]} or ${keys[1]}`
  });
}

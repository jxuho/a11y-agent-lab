import { z } from "zod";

const isoTimestampSchema = z.string().datetime();
const optionalTextSchema = z.string().optional();
const baseObservationFields = {
  mode: z.string().min(1),
  url: z.string().url(),
  finalUrl: z.string().url().optional(),
  title: z.string(),
  timestamp: isoTimestampSchema,
  variantId: optionalTextSchema,
  suiteId: optionalTextSchema
};

export const snapshotMetadataSchema = z.object({
  mode: z.literal("snapshot-metadata"),
  url: z.string().url(),
  finalUrl: z.string().url(),
  title: z.string(),
  timestamp: isoTimestampSchema,
  variantId: optionalTextSchema,
  suiteId: optionalTextSchema,
  viewport: z
    .object({
      width: z.number(),
      height: z.number()
    })
    .nullable(),
  readySelector: z.string().min(1),
  snapshotRoot: z.string().min(1),
  timeoutMs: z.number().int().positive(),
  userAgent: optionalTextSchema
});

const cdpAxSummaryNodeSchema = z.object({
  nodeId: z.string(),
  role: z.string(),
  name: z.string(),
  description: z.string(),
  value: z.string(),
  ignored: z.boolean(),
  childIds: z.array(z.string()),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export const cdpAxSummarySchema = z.object({
  ...baseObservationFields,
  mode: z.literal("cdp-ax"),
  stats: z.object({
    totalNodeCount: z.number().int().nonnegative(),
    ignoredNodeCount: z.number().int().nonnegative(),
    nonIgnoredNodeCount: z.number().int().nonnegative(),
    interactiveNodeCount: z.number().int().nonnegative(),
    unnamedInteractiveNodeCount: z.number().int().nonnegative(),
    duplicateInteractiveNameCount: z.number().int().nonnegative()
  }),
  nodes: z.array(cdpAxSummaryNodeSchema)
});

export const ariaSummarySchema = z.object({
  ...baseObservationFields,
  mode: z.literal("aria-snapshot"),
  snapshotRoot: z.string().min(1),
  stats: z.object({
    charCount: z.number().int().nonnegative(),
    lineCount: z.number().int().nonnegative(),
    nonEmptyLineCount: z.number().int().nonnegative(),
    approxTokenCount: z.number().int().nonnegative(),
    roleLineCount: z.number().int().nonnegative(),
    buttonLineCount: z.number().int().nonnegative(),
    textboxLineCount: z.number().int().nonnegative(),
    checkboxLineCount: z.number().int().nonnegative(),
    linkLineCount: z.number().int().nonnegative(),
    unnamedInteractiveLineCount: z.number().int().nonnegative()
  }),
  previewLines: z.array(z.string())
});

const domBoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number()
});

export const domCompactElementSchema = z.object({
  ref: z.string().regex(/^dom-\d+$/),
  tag: z.string().min(1),
  roleAttr: optionalTextSchema,
  text: optionalTextSchema,
  label: optionalTextSchema,
  ariaLabel: optionalTextSchema,
  ariaLabelledBy: optionalTextSchema,
  ariaDescribedBy: optionalTextSchema,
  placeholder: optionalTextSchema,
  title: optionalTextSchema,
  alt: optionalTextSchema,
  type: optionalTextSchema,
  name: optionalTextSchema,
  value: optionalTextSchema,
  checked: z.boolean().optional(),
  selected: z.boolean().optional(),
  disabled: z.boolean().optional(),
  expanded: z.boolean().optional(),
  hiddenAttr: z.boolean().optional(),
  dataTestId: optionalTextSchema,
  href: optionalTextSchema,
  bbox: domBoundingBoxSchema.optional(),
  visible: z.boolean(),
  interactive: z.boolean(),
  selectorHint: optionalTextSchema
});

export const domCompactObservationSchema = z.object({
  ...baseObservationFields,
  mode: z.literal("dom-compact"),
  root: z.string().min(1),
  elements: z.array(domCompactElementSchema)
});

export const domSummarySchema = z.object({
  ...baseObservationFields,
  mode: z.literal("dom-compact"),
  stats: z.object({
    elementCount: z.number().int().nonnegative(),
    serializedElementCount: z.number().int().nonnegative(),
    textNodeCount: z.number().int().nonnegative(),
    interactiveElementCount: z.number().int().nonnegative(),
    unnamedInteractiveElementCount: z.number().int().nonnegative(),
    hiddenElementCount: z.number().int().nonnegative(),
    linkCount: z.number().int().nonnegative(),
    buttonCount: z.number().int().nonnegative(),
    inputCount: z.number().int().nonnegative(),
    formControlCount: z.number().int().nonnegative(),
    charCount: z.number().int().nonnegative(),
    approxTokenCount: z.number().int().nonnegative()
  }),
  previewElements: z.array(domCompactElementSchema)
});

export const serializedErrorSchema = z.object({
  errorName: z.string().min(1),
  errorMessage: z.string(),
  errorStack: optionalTextSchema
});

const suiteVariantStatsSchema = z.object({
  cdpAx: z
    .object({
      totalNodeCount: z.number().int().nonnegative(),
      interactiveNodeCount: z.number().int().nonnegative(),
      unnamedInteractiveNodeCount: z.number().int().nonnegative(),
      duplicateInteractiveNameCount: z.number().int().nonnegative()
    })
    .optional(),
  aria: z
    .object({
      charCount: z.number().int().nonnegative(),
      lineCount: z.number().int().nonnegative(),
      nonEmptyLineCount: z.number().int().nonnegative(),
      approxTokenCount: z.number().int().nonnegative()
    })
    .optional(),
  dom: z
    .object({
      elementCount: z.number().int().nonnegative(),
      serializedElementCount: z.number().int().nonnegative(),
      interactiveElementCount: z.number().int().nonnegative(),
      unnamedInteractiveElementCount: z.number().int().nonnegative(),
      hiddenElementCount: z.number().int().nonnegative(),
      charCount: z.number().int().nonnegative(),
      approxTokenCount: z.number().int().nonnegative()
    })
    .optional()
});

export const snapshotSuiteSummarySchema = z.object({
  suiteId: z.string().min(1),
  timestamp: isoTimestampSchema,
  configPath: z.string().min(1),
  outDir: z.string().min(1),
  variantCount: z.number().int().nonnegative(),
  successfulSnapshotCount: z.number().int().nonnegative(),
  failedSnapshotCount: z.number().int().nonnegative(),
  variants: z.array(
    z.object({
      id: z.string().min(1),
      url: z.string().url(),
      outDir: z.string().min(1),
      status: z.enum(["success", "failed"]),
      stats: suiteVariantStatsSchema.optional(),
      errorName: optionalTextSchema,
      errorMessage: optionalTextSchema,
      errorStack: optionalTextSchema
    })
  )
});

export function validateJsonOutput<T>(
  schema: { safeParse: (value: unknown) => z.SafeParseReturnType<unknown, T> },
  value: T,
  label: string
): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || label}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid ${label}: ${message}`);
  }

  return result.data;
}

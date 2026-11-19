import { z } from "zod"

export const graphSchema = z.object({
  nodes: z.array(z.unknown()).max(200),
  edges: z.array(z.unknown()).max(500),
})

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(120),
  description: z.string().max(2000).optional(),
  graph: graphSchema,
  isPublic: z.boolean().optional(),
})

export const updateWorkflowSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().max(2000).nullable(),
    graph: graphSchema,
    isPublic: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "at least one field is required",
  })

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>

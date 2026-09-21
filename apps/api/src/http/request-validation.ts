import { IMAGE_STATUSES } from '@aragon/shared';
import { z } from 'zod';
import { PAGINATION } from '../constants';
import { BadRequestError } from './errors';

export const listImagesQuerySchema = z.object({
  status: z.enum(IMAGE_STATUSES).optional(),
  limit: z.coerce.number().int().positive().max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  cursor: z.uuid().optional(),
});

export const imageParamsSchema = z.object({
  id: z.uuid(),
});

/** Parses untrusted request input, or throws a 400 that names each invalid field. */
export function parseRequest<Schema extends z.ZodType>(schema: Schema, input: unknown): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestError(describeIssues(result.error));
  return result.data;
}

function describeIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
}

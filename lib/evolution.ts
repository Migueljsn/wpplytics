import { z } from 'zod';

const webhookMessageSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.unknown().optional(),
  date_time: z.string().optional(),
});

export type EvolutionWebhookPayload = z.infer<typeof webhookMessageSchema>;

export function parseEvolutionWebhookPayload(payload: unknown) {
  return webhookMessageSchema.parse(payload);
}

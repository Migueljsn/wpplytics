import { z } from 'zod';

const webhookMessageSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.record(z.any()).optional(),
  date_time: z.string().optional(),
});

export type EvolutionWebhookPayload = z.infer<typeof webhookMessageSchema>;

export function parseEvolutionWebhookPayload(payload: unknown) {
  return webhookMessageSchema.parse(payload);
}

export function isMessageEvent(event: string) {
  return ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_SET'].includes(event);
}

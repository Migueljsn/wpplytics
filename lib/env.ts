import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  EVOLUTION_WEBHOOK_SECRET: z.string().default('CHANGE_ME'),
  EVOLUTION_API_BASE_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required'),
});

export const env = envSchema.parse(process.env);

export const hasSupabaseEnv =
  Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
  Boolean(env.SUPABASE_SERVICE_ROLE_KEY);

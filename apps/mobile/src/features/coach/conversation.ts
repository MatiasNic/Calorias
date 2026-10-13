import { CoachDishSchema, type CoachDish } from '@bocado/shared';
import { z } from 'zod';

import { kv } from '@/stores/kv';
import { STORAGE_KEYS } from '@/stores/storageKeys';

export interface CoachMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  dishes?: CoachDish[];
}

/** Messages kept on the device (the server never stores conversations). */
export const MAX_STORED_MESSAGES = 40;

const StoredSchema = z.array(
  z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    dishes: z.array(CoachDishSchema).optional(),
  }),
);

export function loadConversation(): CoachMsg[] {
  try {
    const parsed = StoredSchema.safeParse(JSON.parse(kv.get(STORAGE_KEYS.coachChat) ?? '[]'));
    return parsed.success ? parsed.data : [];
  } catch {
    // Corrupt saved chat: start a new one.
    return [];
  }
}

export function saveConversation(messages: readonly CoachMsg[]) {
  kv.set(STORAGE_KEYS.coachChat, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
}

/** What the model sees of past turns: the text, plus the names of dishes it already proposed. */
export function historyForServer(messages: readonly CoachMsg[]) {
  return messages.map(({ role, content, dishes }) => ({
    role,
    content: dishes?.length
      ? `${content}\n[Dishes proposed: ${dishes.map((d) => d.name).join('; ')}]`
      : content,
  }));
}

/** Ingredients the user said they have, remembered for the next time. */
export function loadPantry(): string {
  return kv.get(STORAGE_KEYS.coachPantry) ?? '';
}

export function savePantry(text: string) {
  kv.set(STORAGE_KEYS.coachPantry, text.trim().slice(0, 300));
}

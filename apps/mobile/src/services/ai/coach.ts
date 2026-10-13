import {
  COACH_HISTORY,
  CoachResponseSchema,
  mockCoachReply,
  trimChatHistory,
  type CoachResponse,
} from '@plato/shared';

import { currentLocale } from '@/i18n';
import { invokeFunction } from '@/services/api/client';
import type { PreparedImage } from '@/services/image';
import { mocked, MOCK_DELAY_MS, sleep } from './mode';
import { uploadPhoto } from './photos';
import { consumeMock } from './quota';

export async function askCoach(
  messages: { role: 'user' | 'assistant'; content: string }[],
  photo?: { img: PreparedImage; kind: 'fridge' | 'menu' },
): Promise<CoachResponse> {
  if (mocked()) {
    const quota = consumeMock('coach_message');
    await sleep(MOCK_DELAY_MS);
    return { reply: mockCoachReply(messages[messages.length - 1]?.content ?? ''), quota };
  }
  const photo_path = photo ? await uploadPhoto(photo.img) : undefined;
  return invokeFunction(
    'coach-chat',
    {
      messages: trimChatHistory(messages, COACH_HISTORY.maxMessages, COACH_HISTORY.maxChars),
      locale: currentLocale(),
      photo_path,
      photo_kind: photo?.kind,
    },
    CoachResponseSchema,
  );
}

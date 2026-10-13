import { ApiError } from '@/services/api/errors';
import { newId } from '@/services/db/repository';
import type { PreparedImage } from '@/services/image';
import { deletePhoto, MEAL_PHOTOS_BUCKET } from '@/services/photos';
import { requireSupabase } from '@/services/supabase/client';
import { currentUserId } from '@/stores/session';

/** Uploads the compressed photo to the private bucket; returns its storage path. */
export async function uploadPhoto(img: PreparedImage): Promise<string> {
  const path = `${currentUserId()}/${newId()}.jpg`;
  const { error } = await requireSupabase()
    .storage.from(MEAL_PHOTOS_BUCKET)
    .upload(path, img.bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new ApiError('NETWORK', 0, { reason: error.message });
  return path;
}

/** Uploads the photo for one AI call and removes it again if the call fails (no orphan files). */
export async function withUploadedPhoto<T>(img: PreparedImage, call: (path: string) => Promise<T>) {
  const path = await uploadPhoto(img);
  try {
    return await call(path);
  } catch (e) {
    // Best-effort cleanup: surfacing the original error matters more than a leftover photo.
    deletePhoto(path).catch(() => undefined);
    throw e;
  }
}

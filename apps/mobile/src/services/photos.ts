import { useQuery } from '@tanstack/react-query';

import { getSupabase } from '@/services/supabase/client';

export const MEAL_PHOTOS_BUCKET = 'meal-photos';
/** Signed URLs are short-lived: photos are private. */
const SIGNED_URL_TTL_S = 300;

export async function signedPhotoUrl(path: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.storage
    .from(MEAL_PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_S);
  return error ? null : data.signedUrl;
}

/** Prefers the on-device copy; falls back to a short-lived signed URL. */
export function usePhotoUri(meal: { local_photo_uri: string | null; photo_path: string | null }) {
  const q = useQuery({
    queryKey: ['photo', meal.photo_path],
    queryFn: () => signedPhotoUrl(meal.photo_path!),
    enabled: !meal.local_photo_uri && !!meal.photo_path,
    staleTime: (SIGNED_URL_TTL_S - 30) * 1000,
  });
  return meal.local_photo_uri ?? q.data ?? null;
}

export async function deletePhoto(path: string) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.storage.from(MEAL_PHOTOS_BUCKET).remove([path]);
}

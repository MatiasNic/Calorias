import { IMAGE_UPLOAD } from '@plato/shared';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
  bytes: Uint8Array;
  sha256: string;
}

const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/**
 * Resizes to ≤1024 px on the long side and re-encodes as JPEG ~0.7 before upload: smaller upload,
 * fewer image tokens (≈1k per image), and the SHA-256 lets the server dedupe repeated photos.
 */
export async function prepareMealImage(
  uri: string,
  srcWidth: number,
  srcHeight: number,
  highQuality = false,
): Promise<PreparedImage> {
  const maxDim = highQuality ? IMAGE_UPLOAD.premiumMaxDimensionPx : IMAGE_UPLOAD.maxDimensionPx;
  const quality = highQuality ? IMAGE_UPLOAD.premiumJpegQuality : IMAGE_UPLOAD.jpegQuality;
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(srcWidth, srcHeight) > maxDim) {
    ctx.resize(srcWidth >= srcHeight ? { width: maxDim } : { height: maxDim });
  }
  const ref = await ctx.renderAsync();
  const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: quality });
  const bytes = await new File(saved.uri).bytes();
  const sha256 = toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes));
  return { uri: saved.uri, width: saved.width, height: saved.height, bytes, sha256 };
}

/** Keeps an on-device copy for thumbnails (app documents dir, never synced). */
export function persistLocalPhoto(uri: string, name: string): string {
  const dir = new Directory(Paths.document, 'meal-photos');
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = new File(dir, `${name}.jpg`);
  if (dest.exists) dest.delete();
  new File(uri).copy(dest);
  return dest.uri;
}

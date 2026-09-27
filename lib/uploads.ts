import "server-only";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// Uploaded files live outside the release folders (UPLOADS_DIR on the server,
// data/uploads locally) under random names, and are only served through an
// access-checked route.

export function uploadsDir() {
  const raw = process.env.UPLOADS_DIR?.trim();
  const dir = raw ? (path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)) : path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function maxUploadBytes() {
  const mb = Number(process.env.MAX_UPLOAD_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : 20) * 1024 * 1024;
}

/** Allowed types by extension, with the MIME type we serve them as and the file signature to check. */
const TYPES: Record<string, { mime: string; magic: number[][] }> = {
  pdf: { mime: "application/pdf", magic: [[0x25, 0x50, 0x44, 0x46]] },
  png: { mime: "image/png", magic: [[0x89, 0x50, 0x4e, 0x47]] },
  jpg: { mime: "image/jpeg", magic: [[0xff, 0xd8, 0xff]] },
  jpeg: { mime: "image/jpeg", magic: [[0xff, 0xd8, 0xff]] },
  webp: { mime: "image/webp", magic: [[0x52, 0x49, 0x46, 0x46]] },
  // Office files are zip containers.
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", magic: [[0x50, 0x4b, 0x03, 0x04]] },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", magic: [[0x50, 0x4b, 0x03, 0x04]] },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", magic: [[0x50, 0x4b, 0x03, 0x04]] },
};

export const ALLOWED_EXTENSIONS = Object.keys(TYPES);

/** Types shown in the browser rather than downloaded. */
export function isInline(mime: string | null) {
  return mime === "application/pdf" || (mime?.startsWith("image/") ?? false);
}

export type SavedFile = { storageKey: string; originalName: string; mimeType: string; sizeBytes: number };

/** Validates and stores an uploaded file. Returns an error message instead of throwing for bad input. */
export async function saveUpload(file: File): Promise<SavedFile | { error: string }> {
  const originalName = path.basename(file.name || "file").slice(0, 200);
  const ext = originalName.toLowerCase().split(".").pop() ?? "";
  const type = TYPES[ext];
  if (!type) return { error: `That file type isn't allowed. Use ${ALLOWED_EXTENSIONS.join(", ")}.` };
  if (file.size === 0) return { error: "That file is empty." };
  if (file.size > maxUploadBytes()) return { error: `Files can be up to ${Math.round(maxUploadBytes() / 1024 / 1024)} MB.` };

  const bytes = Buffer.from(await file.arrayBuffer());
  const matches = type.magic.some((sig) => sig.every((b, i) => bytes[i] === b));
  if (!matches) return { error: `That doesn't look like a real .${ext} file.` };

  const storageKey = `${randomUUID()}.${ext}`;
  const dir = uploadsDir();
  const tmp = path.join(dir, `.${storageKey}.tmp`);
  await fs.promises.writeFile(tmp, bytes, { flag: "wx" });
  await fs.promises.rename(tmp, path.join(dir, storageKey));
  return { storageKey, originalName, mimeType: type.mime, sizeBytes: bytes.length };
}

/** Absolute path for a stored key, or null if the key isn't one of ours. */
export function storedPath(storageKey: string) {
  if (!/^[0-9a-f-]{36}\.[a-z]{3,4}$/.test(storageKey)) return null;
  return path.join(uploadsDir(), storageKey);
}

export async function deleteUpload(storageKey: string) {
  const p = storedPath(storageKey);
  if (p) await fs.promises.rm(p, { force: true });
}

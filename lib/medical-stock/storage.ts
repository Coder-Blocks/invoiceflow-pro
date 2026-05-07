import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  MEDICAL_UPLOAD_PUBLIC_DIR,
} from "@/lib/medical-stock/constants";

export type StoredMedicalUpload = {
  absoluteFilePath: string;
  publicFileUrl: string;
  storedFileName: string;
  mimeType: string;
  size: number;
};

export function getFileExtension(fileName: string): string {
  const ext = path.extname(fileName || "").toLowerCase();
  return ext;
}

export function validateMedicalUploadFile(file: File) {
  const extension = getFileExtension(file.name);

  if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Only PNG, JPG, JPEG, WEBP, and PDF are allowed.");
  }

  if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported file extension. Only PNG, JPG, JPEG, WEBP, and PDF are allowed.");
  }

  if (file.size <= 0) {
    throw new Error("Uploaded file is empty.");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("File size exceeds 10MB limit.");
  }
}

export async function storeMedicalUploadFile(file: File): Promise<StoredMedicalUpload> {
  validateMedicalUploadFile(file);

  const extension = getFileExtension(file.name);
  const storedFileName = `${Date.now()}-${randomUUID()}${extension}`;
  const relativePublicDir = MEDICAL_UPLOAD_PUBLIC_DIR;
  const absolutePublicDir = path.join(process.cwd(), "public", relativePublicDir);

  await mkdir(absolutePublicDir, { recursive: true });

  const absoluteFilePath = path.join(absolutePublicDir, storedFileName);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await writeFile(absoluteFilePath, buffer);

  return {
    absoluteFilePath,
    publicFileUrl: `/${relativePublicDir}/${storedFileName}`,
    storedFileName,
    mimeType: file.type,
    size: file.size,
  };
}
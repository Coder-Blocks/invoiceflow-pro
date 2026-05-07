import { randomUUID } from "node:crypto";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
} from "@/lib/medical-stock/constants";

export type StoredMedicalUpload = {
  publicFileUrl: string;
  storedFileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
};

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getBucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || "medical-stock";
}

export function getFileExtension(fileName: string): string {
  return path.extname(fileName || "").toLowerCase();
}

function sanitizeFileName(fileName: string): string {
  const extension = getFileExtension(fileName);
  const baseName = path.basename(fileName, extension);

  const sanitizedBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${sanitizedBase || "bill"}${extension}`;
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

export async function storeMedicalUploadFile(params: {
  file: File;
  organizationId: string;
}): Promise<StoredMedicalUpload> {
  const { file, organizationId } = params;

  validateMedicalUploadFile(file);

  const supabase = getSupabaseAdminClient();
  const bucket = getBucketName();

  const extension = getFileExtension(file.name);
  const safeName = sanitizeFileName(file.name);
  const storedFileName = `${Date.now()}-${randomUUID()}${extension}`;
  const storagePath = `${organizationId}/${new Date().getFullYear()}/${storedFileName}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload file to Supabase Storage.");
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  if (!publicUrlData?.publicUrl) {
    throw new Error("Failed to generate public URL for uploaded file.");
  }

  return {
    publicFileUrl: publicUrlData.publicUrl,
    storedFileName,
    mimeType: file.type,
    size: file.size,
    storagePath,
  };
}
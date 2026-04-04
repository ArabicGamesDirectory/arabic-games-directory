import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const MAX_FILE_SIZE = 200 * 1024; // 200 KB

function detectMimeFromBuffer(buf: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "image/png";
  // WebP: RIFF????WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

export async function POST(request: Request) {
  // Reject early if Content-Length already exceeds the limit.
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_SIZE * 2) {
    // Multiply by 2 to account for multipart overhead; exact check is on buffer below.
    return Response.json({ error: "File too large. Maximum size is 200 KB." }, { status: 413 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const slug = formData.get("slug") as string | null;

  if (!file || !slug) {
    return Response.json({ error: "Missing file or slug" }, { status: 400 });
  }

  // Check declared size before buffering.
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "File too large. Maximum size is 200 KB." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Re-check actual buffer size.
  if (buffer.length > MAX_FILE_SIZE) {
    return Response.json({ error: "File too large. Maximum size is 200 KB." }, { status: 413 });
  }

  // Validate magic bytes — do not trust Content-Type header.
  const detectedType = detectMimeFromBuffer(buffer);
  if (!detectedType) {
    return Response.json(
      { error: "Invalid file type. Only JPEG, PNG, and WebP are accepted." },
      { status: 400 }
    );
  }

  // Convert to WebP at 460×215 with cover crop.
  let webpBuffer: Buffer;
  try {
    webpBuffer = await sharp(buffer)
      .resize(460, 215, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return Response.json({ error: "Invalid image — could not process file." }, { status: 400 });
  }

  const filename = `temp/${slug}-${Date.now()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from("thumbnails")
    .upload(filename, webpBuffer, {
      contentType: "image/webp",
      upsert: false,
    });

  if (uploadError) {
    return Response.json(
      { error: "Upload failed: " + uploadError.message },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage
    .from("thumbnails")
    .getPublicUrl(filename);

  return Response.json({ url: urlData.publicUrl });
}

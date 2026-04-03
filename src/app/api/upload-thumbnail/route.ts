import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const MAX_FILE_SIZE = 150 * 1024; // 150 KB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
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

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return Response.json(
      { error: "Invalid file type. Accepted: jpg, png, webp" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File too large. Maximum size is 150 KB." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Convert to WebP at 256×256 with cover crop
  const webpBuffer = await sharp(buffer)
    .resize(256, 256, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();

  const filename = `${slug}-${Date.now()}.webp`;

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

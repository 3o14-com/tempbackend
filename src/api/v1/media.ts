import { eq } from "drizzle-orm";
import { type Context, Hono } from "hono";
import mime from "mime";
import sharp from "sharp";
import { db } from "../../db";
import { serializeMedium } from "../../entities/medium";
import { makeVideoScreenshot, uploadThumbnail } from "../../media";
import { type Variables, scopeRequired, tokenRequired } from "../../oauth";
import { media } from "../../schema";
import { disk, getAssetUrl } from "../../storage";
import { isUuid, uuidv7 } from "../../uuid";

const app = new Hono<{ Variables: Variables }>();

export async function postMedia(c: Context<{ Variables: Variables }>) {
  const owner = c.get("token").accountOwner;
  if (owner == null) {
    return c.json({ error: "This method requires an authenticated user" }, 422);
  }

  try {
    const form = await c.req.formData();
    const file = form.get("file");

    if (!file) {
      return c.json({ error: "file is required" }, 422);
    }

    // Handle the mobile upload format
    let fileData: File;
    console.log(file);
    if (typeof file === 'object' && 'uri' in file) {
      // Convert the mobile format to File
      const response = await fetch(file.uri);
      const blob = await response.blob();
      fileData = new File([blob], file.name || 'upload.jpg', {
        type: file.type || 'image/jpeg'
      });
    } else if (file instanceof File) {
      fileData = file;
    } else {
      return c.json({ error: "Invalid file format" }, 422);
    }

    const description = form.get("description")?.toString();
    const id = uuidv7();
    const imageData = new Uint8Array(await fileData.arrayBuffer());

    // Get the file extension
    const fileType = fileData.type || 'image/jpeg';
    const extension = mime.getExtension(fileType);
    if (!extension) {
      return c.json({ error: "Unsupported media type" }, 400);
    }

    // Process image
    const image = sharp(imageData);
    const fileMetadata = await image.metadata();

    const sanitizedExt = extension.replace(/[/\\]/g, "");
    const path = `media/${id}/original.${sanitizedExt}`;

    // Save file
    try {
      await disk.put(path, imageData, {
        contentType: fileType,
        contentLength: imageData.byteLength,
        visibility: "public",
      });
    } catch (error) {
      console.error("File save error:", error);
      return c.json({ error: "Failed to save media file" }, 500);
    }

    const url = getAssetUrl(path, c.req.url);

    // Save to database
    try {
      const result = await db
        .insert(media)
        .values({
          id,
          type: fileType,
          url,
          width: fileMetadata.width ?? 0,
          height: fileMetadata.height ?? 0,
          description,
          ...(await uploadThumbnail(id, image, c.req.url)),
        })
        .returning();

      if (result.length < 1) {
        throw new Error("Failed to insert media record");
      }

      return c.json(serializeMedium(result[0]));
    } catch (error) {
      console.error("Database error:", error);
      return c.json({ error: "Failed to insert media" }, 500);
    }
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Failed to process upload" }, 500);
  }
}

app.post("/", tokenRequired, scopeRequired(["write:media"]), postMedia);

app.get("/:id", async (c) => {
  const mediumId = c.req.param("id");
  if (!isUuid(mediumId)) return c.json({ error: "Not found" }, 404);
  const medium = await db.query.media.findFirst({
    where: eq(media.id, mediumId),
  });
  if (medium == null) return c.json({ error: "Not found" }, 404);
  return c.json(serializeMedium(medium));
});

app.put("/:id", tokenRequired, scopeRequired(["write:media"]), async (c) => {
  const mediumId = c.req.param("id");
  if (!isUuid(mediumId)) return c.json({ error: "Not found" }, 404);
  let description: string | undefined;
  try {
    const json = await c.req.json();
    description = json.description;
  } catch (e) {
    const form = await c.req.formData();
    description = form.get("description")?.toString();
  }
  if (description == null) {
    return c.json({ error: "description is required" }, 422);
  }
  const result = await db
    .update(media)
    .set({ description })
    .where(eq(media.id, mediumId))
    .returning();
  if (result.length < 1) return c.json({ error: "Not found" }, 404);
  return c.json(serializeMedium(result[0]));
});

export default app;

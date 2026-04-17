import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PAGE_ID = process.env.META_PAGE_ID;
const META_IG_USER_ID = process.env.META_IG_USER_ID;
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Re-encodes a video buffer to H.264/AAC using ffmpeg.
 * Returns a new Buffer with the re-encoded MP4.
 */
async function reencodeToH264(inputBuffer: ArrayBuffer): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `input_${Date.now()}.mp4`);
  const outputPath = path.join(tmpDir, `output_${Date.now()}.mp4`);

  try {
    // Write input buffer to temp file
    fs.writeFileSync(inputPath, Buffer.from(inputBuffer));

    // Re-encode to H.264 + AAC, which Facebook/Instagram require
    const ffmpegCmd = [
      "ffmpeg",
      "-y",                        // overwrite output
      `-i "${inputPath}"`,         // input
      "-c:v libx264",              // H.264 video codec
      "-preset fast",              // encoding speed vs compression tradeoff
      "-crf 23",                   // quality (18=high, 28=low, 23=default)
      "-c:a aac",                  // AAC audio codec
      "-b:a 128k",                 // audio bitrate
      "-movflags +faststart",      // optimize for web streaming (moov atom at front)
      "-pix_fmt yuv420p",          // required for broad compatibility
      `"${outputPath}"`,
    ].join(" ");

    console.log("Re-encoding video to H.264...");
    await execAsync(ffmpegCmd);
    console.log("Re-encoding complete.");

    const outputBuffer = fs.readFileSync(outputPath);
    return outputBuffer;
  } finally {
    // Clean up temp files
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
}

async function uploadToSupabase(driveFileId: string, fileName: string): Promise<string> {
  console.log("Downloading from Google Drive...");
  const driveRes = await fetch(
    `https://drive.google.com/uc?export=download&id=${driveFileId}&confirm=t`
  );
  const videoBuffer = await driveRes.arrayBuffer();
  console.log(`Downloaded ${videoBuffer.byteLength} bytes from Drive.`);

  // Re-encode to H.264 before uploading
  const reencoded = await reencodeToH264(videoBuffer);
  console.log(`Re-encoded size: ${reencoded.byteLength} bytes.`);

  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/clips/${fileName}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "video/mp4",
        "x-upsert": "true",
      },
      body: reencoded,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Supabase upload failed: ${err}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/clips/${fileName}`;
}

async function deleteFromSupabase(fileName: string) {
  await fetch(
    `${SUPABASE_URL}/storage/v1/object/clips/${fileName}`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { caption, videoUrl, imageUrl, platforms } = await req.json();

    let finalVideoUrl = videoUrl;
    let supabaseFileName: string | null = null;

    // If Drive URL, download → re-encode → upload to Supabase
    if (videoUrl?.includes('drive.google.com')) {
      const fileIdMatch = videoUrl.match(/\/d\/([^/]+)/);
      if (fileIdMatch) {
        const fileId = fileIdMatch[1];
        supabaseFileName = `temp_${Date.now()}.mp4`;
        console.log("Processing video via Supabase...");
        finalVideoUrl = await uploadToSupabase(fileId, supabaseFileName);
        console.log("Supabase URL:", finalVideoUrl);
      }
    }

    const results: Record<string, any> = {};

    // FACEBOOK
    if (platforms.includes("facebook")) {
      console.log("Posting to Facebook...");
      console.log("Page ID:", META_PAGE_ID);
      console.log("Token prefix:", META_PAGE_ACCESS_TOKEN?.substring(0, 20));
      console.log("Video URL:", finalVideoUrl);

      if (finalVideoUrl) {
        const fbRes = await fetch(
          `https://graph.facebook.com/v19.0/${META_PAGE_ID}/videos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file_url: finalVideoUrl,
              description: caption,
              published: true,
              access_token: META_PAGE_ACCESS_TOKEN,
            }),
          }
        );
        results.facebook = await fbRes.json();
        console.log("FB Response:", JSON.stringify(results.facebook));
      } else {
        const body: any = { message: caption, access_token: META_PAGE_ACCESS_TOKEN };
        if (imageUrl) body.url = imageUrl;
        const endpoint = imageUrl
          ? `https://graph.facebook.com/v19.0/${META_PAGE_ID}/photos`
          : `https://graph.facebook.com/v19.0/${META_PAGE_ID}/feed`;
        const fbRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        results.facebook = await fbRes.json();
        console.log("FB Response:", JSON.stringify(results.facebook));
      }
    }

    // INSTAGRAM
    if (platforms.includes("instagram")) {
      if (finalVideoUrl) {
        const containerRes = await fetch(
          `https://graph.facebook.com/v19.0/${META_IG_USER_ID}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media_type: "REELS",
              video_url: finalVideoUrl,
              caption,
              access_token: META_ACCESS_TOKEN,
            }),
          }
        );
        const container = await containerRes.json();
        console.log("IG Container:", JSON.stringify(container));
        if (container.id) {
          await new Promise(r => setTimeout(r, 5000));
          const publishRes = await fetch(
            `https://graph.facebook.com/v19.0/${META_IG_USER_ID}/media_publish`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                creation_id: container.id,
                access_token: META_ACCESS_TOKEN,
              }),
            }
          );
          results.instagram = await publishRes.json();
          console.log("IG Publish:", JSON.stringify(results.instagram));
        } else {
          results.instagram = { error: "Container failed", details: container };
        }
      }
    }

    // Delete from Supabase after 5 minutes
    if (supabaseFileName) {
      const fileToDelete = supabaseFileName;
      setTimeout(async () => {
        await deleteFromSupabase(fileToDelete);
        console.log("Deleted from Supabase:", fileToDelete);
      }, 300000);
    }

    const hasErrors = Object.values(results).some((r: any) => r.error && !r.success);
    return NextResponse.json({
      success: !hasErrors,
      results,
      posted_to: platforms,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Auto-post error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

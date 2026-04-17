import { NextRequest, NextResponse } from "next/server";

const PAGE_ID = process.env.META_PAGE_ID;
const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const IG_USER_ID = process.env.META_IG_USER_ID;

async function postToFacebook(caption: string, videoUrl?: string) {
  const url = `https://graph.facebook.com/v19.0/${PAGE_ID}/feed`;
  const body: Record<string, string> = { message: caption, access_token: PAGE_TOKEN! };
  if (videoUrl) body.link = videoUrl;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function postToInstagram(caption: string, imageUrl?: string) {
  if (!imageUrl) return { skipped: "No image URL provided for Instagram" };

  // Step 1: Create container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${IG_USER_ID}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: PAGE_TOKEN,
      }),
    }
  );
  const container = await containerRes.json();
  if (!container.id) return { error: "Failed to create IG container", details: container };

  // Step 2: Publish container
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${IG_USER_ID}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: PAGE_TOKEN,
      }),
    }
  );
  return publishRes.json();
}

export async function POST(req: NextRequest) {
  try {
    const { caption, platforms, videoUrl, imageUrl } = await req.json();

    const results: Record<string, unknown> = {};

    if (platforms.includes("facebook")) {
      results.facebook = await postToFacebook(caption, videoUrl);
    }

    if (platforms.includes("instagram")) {
      results.instagram = await postToInstagram(caption, imageUrl);
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

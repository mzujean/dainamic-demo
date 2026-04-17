import { NextResponse } from "next/server";

const FOLDER_NAME = "Dainamic/clips";

export async function GET() {
  try {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    const folderIdEnv = process.env.GOOGLE_DRIVE_FOLDER_ID;
    let folderId = folderIdEnv;
    const authToken = await getGoogleAccessToken(serviceAccountKey!);

    if (!folderId) {
      const folderRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='clips' and mimeType='application/vnd.google-apps.folder'&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const folderData = await folderRes.json();
      folderId = folderData.files?.[0]?.id;
    }

    if (!folderId) {
      return NextResponse.json({ success: false, error: "Clips folder not found." }, { status: 404 });
    }

    const filesRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and (mimeType contains 'video/' or mimeType contains 'image/')&fields=files(id,name,mimeType,size,createdTime,webViewLink,thumbnailLink)&orderBy=createdTime desc`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const filesData = await filesRes.json();
    const clips = filesData.files || [];

    return NextResponse.json({
      success: true,
      clips: clips.map((f: any) => ({
        id: f.id,
        name: f.name,
        type: f.mimeType.startsWith("video/") ? "video" : "image",
        size: formatBytes(f.size),
        created: f.createdTime,
        viewUrl: f.webViewLink,
        thumbnail: f.thumbnailLink,
        driveUrl: `https://drive.google.com/file/d/${f.id}/view`,
      })),
      total: clips.length,
      folderName: FOLDER_NAME,
    });
  } catch (error) {
    console.error("Drive clips error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

async function getGoogleAccessToken(serviceAccountKeyJson: string): Promise<string> {
  const key = JSON.parse(serviceAccountKeyJson);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claim = btoa(JSON.stringify({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const toSign = `${header}.${claim}`;
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToBuffer(key.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(toSign));
  const jwt = `${toSign}.${bufferToBase64Url(signature)}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

function pemToBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buffer;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function formatBytes(bytes: string): string {
  const b = parseInt(bytes);
  if (!b) return "unknown";
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1024 / 1024).toFixed(1)}MB`;
}

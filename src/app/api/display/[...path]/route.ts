import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathArray } = await params;
  
  // Nettoyer le chemin en supprimant les segments vides (doubles slashes)
  const cleanPath = pathArray.filter(segment => segment !== "");
  const filePath = path.join(process.cwd(), "public", "uploads", ...cleanPath);

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Détection du type MIME basique
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".txt": "text/plain",
      ".srt": "text/srt",
      ".vtt": "text/vtt",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";

    const response = new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
} 
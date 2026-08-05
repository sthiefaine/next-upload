import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import sharp from "sharp";

// sharp + fs : runtime Node obligatoire (interdit sur edge).
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Redimensionnement à la volée : `?w=342`
//
// POURQUOI — les images canoniques sont stockées en pleine taille (une affiche
// de film pèse ~590 Ko) alors que les sites consommateurs les affichent en
// 96–220 px. Résultat : movie-to-podcast utilisait l'optimiseur de Next
// (`/_next/image`) pour compenser… et ce cache, que Next ne borne ni ne purge
// jamais, a saturé le disque du serveur TROIS fois en juillet 2026 (150 Go,
// coolify-db en crash-loop, toutes les apps en 500).
//
// En servant directement la bonne taille depuis la source, plus aucun site n'a
// besoin d'optimiseur : le problème disparaît pour TOUTES les apps à la fois.
//
// DEUX GARDE-FOUS, tirés précisément de cet incident :
//
//   1. AUCUN CACHE DISQUE. On redimensionne à chaque requête et on s'appuie
//      sur `Cache-Control` (navigateurs + CDN). C'est un choix délibéré : tout
//      cache disque non borné finit par remplir le disque, et un cache borné
//      demande une éviction qui ne tient pas le rythme des crawlers.
//      => la consommation disque de cette route est structurellement nulle.
//
//   2. LARGEURS EN ALLOWLIST. Cette route est publique : accepter une largeur
//      arbitraire laisserait n'importe quel crawler demander `?w=1`, `?w=2`…
//      et faire tourner sharp à l'infini. Une largeur hors liste est ignorée
//      (on sert l'original) plutôt que rejetée, pour ne rien casser.
// ---------------------------------------------------------------------------
const ALLOWED_WIDTHS = new Set([96, 185, 342, 500, 780]);

// Formats que sharp sait redimensionner ici. Le SVG (vectoriel) et le GIF
// (animation perdue au resize) sont volontairement exclus.
const RESIZABLE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// 7 jours de fraîcheur, puis 30 jours servis en arrière-plan pendant la
// revalidation. Les images sont adressées par tmdbId et changent rarement.
// Avant, cette route n'envoyait AUCUN Cache-Control : chaque visite
// re-téléchargeait les ~590 Ko.
const CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=2592000";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".srt": "text/srt",
  ".vtt": "text/vtt",
  ".json": "application/json",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathArray } = await params;

  // Nettoyer le chemin en supprimant les segments vides (doubles slashes)
  const cleanPath = pathArray.filter((segment) => segment !== "");

  // Traversée de répertoire : un segment ".." permettrait de sortir de
  // public/uploads et de lire n'importe quel fichier du serveur.
  if (cleanPath.some((segment) => segment === ".." || segment.includes("\0"))) {
    return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
  }

  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadsRoot, ...cleanPath);

  // Ceinture et bretelles : le chemin résolu doit rester sous uploads/.
  if (!filePath.startsWith(uploadsRoot + path.sep)) {
    return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const requestedWidth = Number(request.nextUrl.searchParams.get("w"));
    const shouldResize =
      RESIZABLE_EXT.has(ext) && ALLOWED_WIDTHS.has(requestedWidth);

    if (shouldResize) {
      try {
        const resized = await sharp(file)
          // `withoutEnlargement` : si la source est déjà plus petite que la
          // largeur demandée, on ne l'agrandit pas (ça ne ferait qu'alourdir).
          .resize({ width: requestedWidth, withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer();

        return new NextResponse(new Uint8Array(resized), {
          status: 200,
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": CACHE_CONTROL,
            ...CORS_HEADERS,
          },
        });
      } catch {
        // Image corrompue ou format inattendu : on sert l'original plutôt que
        // de renvoyer une erreur — mieux vaut une image lourde que pas d'image.
      }
    }

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE_CONTROL,
        ...CORS_HEADERS,
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

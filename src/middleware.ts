import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Les sources Atlas passent uniquement par leur API authentifiée.
  let pathname: string;
  try { pathname = decodeURIComponent(request.nextUrl.pathname); }
  catch { return new NextResponse(null, { status: 400 }); }
  if (["/uploads/atlas/sources", "/api/display/atlas/sources"].some(prefix => pathname === prefix || pathname.startsWith(prefix + "/"))) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const response = NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/uploads/")) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  }

  if (request.nextUrl.pathname.startsWith("/api/display/")) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range"
    );
  }

  return response;
}

export const config = {
  matcher: ["/uploads/:path*", "/api/display/:path*"],
};

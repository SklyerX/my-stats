import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!api/|_next/|public/|favicon.ico|globals.css).*)"],
};

export default async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") || "";
  const path = req.nextUrl.pathname;
  const searchParams = req.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : "";

  if (hostname.includes("developer.stats.skylerx.ir")) {
    return NextResponse.rewrite(
      new URL(`/developer.stats.skylerx.ir${path}${queryString}`, req.url),
    );
  }

  if (hostname.includes("api.stats.skylerx.ir")) {
    return NextResponse.rewrite(
      new URL(`/api.stats.skylerx.ir${path}${queryString}`, req.url),
    );
  }

  if (
    hostname.includes("stats.skylerx.ir") ||
    hostname.includes("localhost") ||
    hostname.includes(".vercel.app")
  ) {
    return null;
  }

  if (process.env.NODE_ENV === "development") {
    if (
      req.headers.get("connection")?.includes("Upgrade") &&
      req.headers.get("upgrade") === "websocket"
    ) {
      return undefined; // Let Next.js handle WebSocket connections
    }
  }

  return null;
}

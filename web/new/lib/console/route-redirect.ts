import { NextResponse } from "next/server";

export function redirectTo(request: Request, path: string): NextResponse {
  return NextResponse.redirect(redirectURL(request, path), 303);
}

export function redirectBack(
  request: Request,
  fallbackPath: string,
): NextResponse {
  const fallback = redirectURL(request, fallbackPath);
  const referer = request.headers.get("referer");
  if (!referer) return NextResponse.redirect(fallback, 303);

  try {
    const target = new URL(referer);
    if (target.origin === fallback.origin) {
      return NextResponse.redirect(target, 303);
    }
  } catch {
    return NextResponse.redirect(fallback, 303);
  }
  return NextResponse.redirect(fallback, 303);
}

function redirectURL(request: Request, path: string): URL {
  return new URL(path, requestOrigin(request));
}

function requestOrigin(request: Request): string {
  const internalURL = new URL(request.url);
  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ||
    firstHeaderValue(request.headers.get("host")) ||
    internalURL.host;
  const proto =
    firstHeaderValue(request.headers.get("x-forwarded-proto")) ||
    internalURL.protocol.replace(/:$/, "") ||
    "http";
  return `${proto}://${host}`;
}

function firstHeaderValue(value: string | null): string {
  if (!value) return "";
  return value.split(",")[0]?.trim() || "";
}

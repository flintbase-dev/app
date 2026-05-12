import { NextResponse } from "next/server";

export function redirectTo(request: Request, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export function redirectBack(
  request: Request,
  fallbackPath: string,
): NextResponse {
  const fallback = new URL(fallbackPath, request.url);
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

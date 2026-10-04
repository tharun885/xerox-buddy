import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const protectedPath = ["/student", "/owner", "/admin"].some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (protectedPath && !claims?.sub) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";

    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    ["cache-control", "expires", "pragma"].forEach((header) => {
      const value = response.headers.get(header);
      if (value) redirectResponse.headers.set(header, value);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|apng|bmp|ico|tif|tiff)$).*)",
  ],
};
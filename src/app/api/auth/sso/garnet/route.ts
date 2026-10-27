import { NextRequest, NextResponse } from "next/server";
import { loginWithGarnetSsoAction } from "@/server/actions/garnet";

/**
 * Garnet LMS SSO Endpoint
 * Garnet redirects the user here with a JWT token:
 * GET /api/auth/sso/garnet?token=<garnet_jwt>
 * or POST /api/auth/sso/garnet with body { token: "<garnet_jwt>" }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || searchParams.get("jwt");

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/login?error=" + encodeURIComponent("توکن ورود حساب کاربری مشاهیر دانش یافت نشد."), request.url)
    );
  }

  const result = await loginWithGarnetSsoAction(token);

  if (result.success && result.redirectUrl) {
    return NextResponse.redirect(new URL(result.redirectUrl, request.url));
  }

  if (result.notEntitled && result.redirectUrl) {
    return NextResponse.redirect(new URL(result.redirectUrl, request.url));
  }

  return NextResponse.redirect(
    new URL(
      "/auth/login?error=" + encodeURIComponent(result.message || "خطا در احراز هویت با حساب کاربری مشاهیر دانش."),
      request.url
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token || body.jwt;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "توکن ورود ارسال نشده است." },
        { status: 400 }
      );
    }

    const result = await loginWithGarnetSsoAction(token);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "خطای پردازش داده در وب‌سرویس احراز هویت مشاهیر دانش." },
      { status: 500 }
    );
  }
}

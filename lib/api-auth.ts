import { NextRequest, NextResponse } from "next/server";

/**
 * 書き込みAPIのキー認証。
 * INTERNAL_API_KEY が env に設定されていない場合は通過（ローカル開発用）。
 */
export function requireApiKey(request: NextRequest): NextResponse | null {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) return null;
  const provided = request.headers.get("x-api-key");
  if (provided !== key) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

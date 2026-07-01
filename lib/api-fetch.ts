/**
 * 書き込みリクエストに x-api-key ヘッダーを自動付与する fetch ラッパー。
 * NEXT_PUBLIC_INTERNAL_API_KEY が未設定の場合はヘッダーなしで送信（ローカル開発用）。
 */
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const key = process.env.NEXT_PUBLIC_INTERNAL_API_KEY ?? "";
  return fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "x-api-key": key } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

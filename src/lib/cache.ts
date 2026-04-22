import { NextResponse } from "next/server";

/**
 * Create a cached JSON response with Cache-Control headers.
 * Uses `s-maxage` for Vercel's edge cache and `stale-while-revalidate` for instant responses
 * while revalidating in the background.
 *
 * @param data - The JSON data to return
 * @param maxAgeSeconds - How long the response is fresh (in seconds)
 * @param staleSeconds - How long a stale response can be served while revalidating (default: same as maxAge)
 */
export function cachedJson(data: unknown, maxAgeSeconds: number, staleSeconds?: number) {
  const swr = staleSeconds ?? maxAgeSeconds;
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${swr}`,
    },
  });
}

/**
 * Create a non-cached JSON response (for mutations or user-specific data).
 */
export function freshJson(data: unknown, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

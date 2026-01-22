import { loadBuckets } from '@/lib/buckets';
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const buckets = loadBuckets();

    return NextResponse.json({ total: buckets.length, items: buckets });
  } catch (error) {
    return NextResponse.json({ error: "Error loading buckets" }, { status: 500 });
  }
}

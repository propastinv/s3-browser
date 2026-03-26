import { getBucketsForGroups } from '@/lib/buckets';
import { getToken } from 'next-auth/jwt';
import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const userGroups = token.user.groups;
  try {
    const buckets = getBucketsForGroups(userGroups);

    return NextResponse.json({ total: buckets.length, items: buckets });
  } catch (error) {
    return NextResponse.json({ error: "Error loading buckets" }, { status: 500 });
  }
}

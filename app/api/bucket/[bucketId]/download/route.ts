import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getS3Client } from '@/lib/s3-client';
import { getBucketById } from "@/lib/buckets";
import { getToken } from 'next-auth/jwt';
import { Readable } from "stream";

export async function GET(req: NextRequest, context: { params: Promise<{ bucketId: string }> }) {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get("key")

    if (!key) {
        return NextResponse.json({ error: "Missing key" }, { status: 400 })
    }

    const { bucketId } = await context.params;

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    const userGroups = token.user.groups;

    const bucket = getBucketById(bucketId, userGroups)
    if (!bucket) {
        return NextResponse.json({ error: "Bucket not found" }, { status: 404 })
    }

    try {
        const client = getS3Client(bucket);

        const result = await client.send(
            new GetObjectCommand({
                Bucket: bucket.bucket,
                Key: key,
            })
        )

        const stream = result.Body as Readable

        req.signal.addEventListener("abort", () => stream.destroy());

        const filename = key.split("/").pop() || "file"
        const encodedFilename = encodeURIComponent(filename)

        return new NextResponse(stream as any, {
            headers: {
                "Content-Type": result.ContentType || "application/octet-stream",
                "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
                "Cache-Control": "no-store",
            },
        })

    } catch (err) {
        console.error("Download error:", err)
        return NextResponse.json(
            { error: "Failed to download file" },
            { status: 500 }
        )
    }
}

import { NextRequest, NextResponse } from "next/server";
import { getBucketById } from "@/lib/buckets";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { Readable } from "stream";

export async function GET(req: NextRequest, context: { params: Promise<{ bucketId: string }> }) {
    const { bucketId } = await context.params;
    const bucket = getBucketById(bucketId);

    if (!bucket) {
        return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
        return NextResponse.json({ error: "Missing file key" }, { status: 400 });
    }

    const client = new S3Client({
        region: bucket.region,
        endpoint: bucket.endpoint,
        forcePathStyle: bucket.forcePathStyle ?? false,
        credentials: {
            accessKeyId: bucket.accessKeyId,
            secretAccessKey: bucket.secretAccessKey,
        },
    });

    try {
        const command = new GetObjectCommand({ Bucket: bucket.bucket, Key: key });
        const { Body, ETag } = await client.send(command);

        if (!Body) throw new Error("Empty body from S3");

        const ifNoneMatch = req.headers.get("if-none-match");
        if (ifNoneMatch && ifNoneMatch === ETag) {
            return new Response(null, { status: 304 });
        }

        const s3Stream = Body as Readable;

        const transformer = sharp()
            .resize(400, 400, {
                fit: "inside",
                withoutEnlargement: true
            })
            .jpeg({ quality: 80, progressive: true });

        const processedStream = s3Stream.pipe(transformer);

        const webStream = new ReadableStream({
            async start(controller) {
                processedStream.on("data", (chunk) => controller.enqueue(chunk));
                processedStream.on("end", () => controller.close());
                processedStream.on("error", (err) => controller.error(err));
            },
        });

        return new Response(webStream, {
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
                "ETag": ETag || "",
            },
        });

    } catch (err: any) {
        console.error("Thumbnail Error:", err);
        return NextResponse.json(
            { error: err.name === "NoSuchKey" ? "File not found" : "Failed to generate thumbnail" },
            { status: err.name === "NoSuchKey" ? 404 : 500 }
        );
    }
}
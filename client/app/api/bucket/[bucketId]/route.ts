import { NextRequest, NextResponse } from 'next/server';
import { getBucketById } from '@/lib/buckets';
import {
    S3Client,
    ListObjectsV2Command,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { Readable } from "stream";

async function streamToString(stream: any): Promise<string> {
    const chunks: any[] = [];
    for await (const chunk of stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
}

export async function GET(
    req: Request,
    context: { params: Promise<{ bucketId: string }> }
) {
    const { bucketId } = await context.params;
    const bucket = getBucketById(bucketId);

    if (!bucket) {
        return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
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

    const url = new URL(req.url);
    const prefix = url.searchParams.get('prefix') || '';

    try {
        const command = new ListObjectsV2Command({
            Bucket: bucket.bucket,
            Prefix: prefix,
            Delimiter: '/',
        });

        const data = await client.send(command);

        const folders = data.CommonPrefixes?.map(p => ({
            type: 'folder',
            key: p.Prefix,
        })) || [];

        const files = data.Contents?.filter(f => f.Key !== prefix).map(f => ({
            type: 'file',
            key: f.Key,
            size: f.Size,
            lastModified: f.LastModified,
        })) || [];

        return NextResponse.json({ items: [...folders, ...files] });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to list objects' }, { status: 500 });
    }
}

const CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_PARALLEL = 4;

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ bucketId: string }> }
) {
    const { bucketId } = await context.params;
    const bucket = getBucketById(bucketId);

    if (!bucket) {
        return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const prefix = formData.get("prefix")?.toString() || "";
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const key = prefix ? `${prefix}/${file.name}` : file.name;

    const client = new S3Client({
        region: bucket.region,
        endpoint: bucket.endpoint,
        forcePathStyle: bucket.forcePathStyle ?? false,
        credentials: {
            accessKeyId: bucket.accessKeyId,
            secretAccessKey: bucket.secretAccessKey,
        },
    });

    let uploadId: string | undefined;

    try {
        const create = await client.send(
            new CreateMultipartUploadCommand({
                Bucket: bucket.bucket,
                Key: key,
            })
        );

        uploadId = create.UploadId;
        if (!uploadId) throw new Error("Failed to create multipart upload");

        console.log("UploadId:", uploadId);

        const nodeStream = Readable.fromWeb(file.stream() as any);

        let partNumber = 1;
        const parts: { PartNumber: number; ETag: string }[] = [];
        const activeUploads: Promise<any>[] = [];

        const uploadPart = async (buffer: Buffer, currentPart: number) => {
            console.log(`Uploading part ${currentPart} (${buffer.length} bytes)`);

            try {
                const res = await client.send(
                    new UploadPartCommand({
                        Bucket: bucket.bucket,
                        Key: key,
                        UploadId: uploadId!,
                        PartNumber: currentPart,
                        Body: buffer,
                    })
                );

                parts.push({
                    PartNumber: currentPart,
                    ETag: res.ETag!,
                });
            } catch (err: any) {
                console.error(
                    `Error uploading part ${currentPart}:`,
                    err.message
                );

                // Логируем raw body (SeaweedFS часто HTML)
                if (err.$response?.body) {
                    const raw = await streamToString(err.$response.body);
                    console.error(`Raw server response:\n${raw}`);
                }

                throw err; // пробрасываем дальше
            }
        };

        let chunkBuffer = Buffer.alloc(0);

        for await (const chunk of nodeStream) {
            chunkBuffer = Buffer.concat([chunkBuffer, chunk]);

            while (chunkBuffer.length >= CHUNK_SIZE) {
                const part = chunkBuffer.subarray(0, CHUNK_SIZE);
                chunkBuffer = chunkBuffer.subarray(CHUNK_SIZE);

                const p = uploadPart(part, partNumber++);
                activeUploads.push(p);

                if (activeUploads.length >= MAX_PARALLEL) {
                    await Promise.all(activeUploads);
                    activeUploads.length = 0;
                }
            }
        }

        if (chunkBuffer.length > 0) {
            const p = uploadPart(chunkBuffer, partNumber++);
            activeUploads.push(p);
        }

        await Promise.all(activeUploads);

        parts.sort((a, b) => a.PartNumber - b.PartNumber);


        await client.send(
            new CompleteMultipartUploadCommand({
                Bucket: bucket.bucket,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: { Parts: parts },
            })
        );


        return NextResponse.json({
            success: true,
            key,
            parts: parts.length,
        });

    } catch (err: any) {
        console.error("Upload error:", err.message);

        if (err.$response?.body) {
            const raw = await streamToString(err.$response.body);
            console.error("Raw server response at top level:\n", raw);
        }

        if (uploadId) {
            console.warn("Aborting multipart upload:", uploadId);
            await client.send(
                new AbortMultipartUploadCommand({
                    Bucket: bucket.bucket,
                    Key: key,
                    UploadId: uploadId,
                })
            );
        }

        return NextResponse.json({ error: "Upload failed", detail: err.message }, { status: 500 });
    }

}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ bucketId: string }> }
) {
    const { bucketId } = await context.params;

    const bucket = getBucketById(bucketId);

    if (!bucket) {
        return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
    }

    const { fileKey } = await req.json();

    if (!fileKey) {
        return NextResponse.json({ error: 'No file specified' }, { status: 400 });
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
        await client.send(new DeleteObjectCommand({
            Bucket: bucket.bucket,
            Key: fileKey,
        }));

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}


import { UploadPartCommand, S3Client } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getBucketById } from '@/lib/buckets';

export async function POST(req: NextRequest) {
    const url = new URL(req.url);
    const bucketId = url.searchParams.get('bucketId');
    const key = url.searchParams.get('key');
    const uploadId = url.searchParams.get('uploadId');
    const partNumberStr = url.searchParams.get('partNumber');

    if (!bucketId || !key || !uploadId || !partNumberStr) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const partNumber = parseInt(partNumberStr, 10);

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const userGroups = token.user.groups;
    const bucket = getBucketById(bucketId, userGroups);

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

    try {
        // Read body as arrayBuffer to send to S3
        const body = await req.arrayBuffer();

        const command = new UploadPartCommand({
            Bucket: bucket.bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
            Body: Buffer.from(body),
        });

        const res = await client.send(command);

        return NextResponse.json({
            etag: res.ETag?.replace(/"/g, "")
        });
    } catch (error: any) {
        console.error('Upload part error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { CompleteMultipartUploadCommand, S3Client } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getBucketById } from '@/lib/buckets';

export async function POST(req: NextRequest) {
    const { bucketId, key, uploadId, parts } = await req.json();

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

    await client.send(
        new CompleteMultipartUploadCommand({
            Bucket: bucket.bucket,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: { Parts: parts },
        })
    );

    return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '@/lib/s3-client';
import { getToken } from 'next-auth/jwt';
import { getBucketById } from '@/lib/buckets';

export async function POST(req: NextRequest) {
    const { bucketId, key, contentType } = await req.json();

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

    const client = getS3Client(bucket);

    const res = await client.send(
        new CreateMultipartUploadCommand({
            Bucket: bucket.bucket,
            Key: key,
            ContentType: contentType || 'application/octet-stream',
        })
    );

    return NextResponse.json({
        uploadId: res.UploadId,
    });
}

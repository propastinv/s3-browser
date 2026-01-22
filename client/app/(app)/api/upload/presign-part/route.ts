import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UploadPartCommand, S3Client } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getBucketById } from '@/lib/buckets';

export async function POST(req: NextRequest) {
    const { bucketId, key, uploadId, partNumber } = await req.json();

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

    const command = new UploadPartCommand({
        Bucket: bucket.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
    });

    const url = await getSignedUrl(client, command, { expiresIn: 3600 });

    return NextResponse.json({ url });
}

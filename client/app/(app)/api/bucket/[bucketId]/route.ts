import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getBucketById } from '@/lib/buckets';
import {
    S3Client,
    ListObjectsV2Command,
    DeleteObjectCommand
} from '@aws-sdk/client-s3';

async function streamToString(stream: any): Promise<string> {
    const chunks: any[] = [];
    for await (const chunk of stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ bucketId: string }> }
) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }


    const { bucketId } = await context.params;
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

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ bucketId: string }> }
) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }


    const { bucketId } = await context.params;
    const userGroups = token.user.groups;

    const bucket = getBucketById(bucketId, userGroups);

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


import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getBucketById } from '@/lib/buckets';
import { prisma } from '@/lib/prisma';
import {
    S3Client,
    ListObjectsV2Command,
    DeleteObjectCommand
} from '@aws-sdk/client-s3';

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

        const folders = data.CommonPrefixes?.filter(p => !!p.Prefix).map(p => ({
            type: 'folder',
            key: p.Prefix!,
        })) || [];

        const files = data.Contents?.filter(f => !!f.Key && f.Key !== prefix).map(f => ({
            type: 'file',
            key: f.Key!,
            size: f.Size,
            lastModified: f.LastModified,
        })) || [];

        syncFolderIndex(bucket.id, bucket.group, prefix, files)
            .catch(err => console.error('Background sync failed:', err));
        return NextResponse.json({
            items: [...folders, ...files],
            uploadMethod: bucket.uploadMethod || "proxy"
        });
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

        await prisma.s3FileActionLog.create({
            data: {
                action: 'DELETE',
                bucket: bucket.id,
                key: fileKey,
                group: bucket.group,
                userName: token.name || token.email || 'Unknown',
            }
        }).catch(e => console.error('Failed to log delete action:', e));

        await prisma.s3FileIndex.deleteMany({
            where: {
                bucket: bucket.id,
                key: fileKey,
            }
        }).catch(e => console.error('Failed to delete from index:', e));

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function syncFolderIndex(
    bucketId: string,
    group: string,
    prefix: string,
    foundDetails: { key: string }[]
) {
    try {
        const foundKeys = foundDetails.map(f => f.key);

        const likePattern = prefix ? `${prefix}%` : '%';
        const notLikePattern = prefix ? `${prefix}%/%` : '%/%';

        const existingRecords = await prisma.$queryRaw<{ key: string }[]>`
            SELECT key FROM "S3FileIndex"
            WHERE bucket = ${bucketId}
            AND "group" = ${group}
            AND key LIKE ${likePattern}
            AND key NOT LIKE ${notLikePattern}
        `;

        const existingKeys = new Set(existingRecords.map((r: any) => r.key));
        const foundKeysSet = new Set(foundKeys);

        const toAdd = foundKeys.filter(k => !existingKeys.has(k));
        const toDelete = [...existingKeys].filter(k => !foundKeysSet.has(k));

        if (toAdd.length > 0) {
            await prisma.s3FileIndex.createMany({
                data: toAdd.map(key => ({
                    bucket: bucketId,
                    group,
                    key,
                })),
                skipDuplicates: true,
            });
        }

        if (toDelete.length > 0) {
            await prisma.s3FileIndex.deleteMany({
                where: {
                    bucket: bucketId,
                    group,
                    key: { in: toDelete },
                },
            });
        }

    } catch (error) {
        console.error('Failed to sync S3 index:', error);
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getBucketById } from '@/lib/buckets';
import { prisma } from '@/lib/prisma';
import {
    S3Client,
    ListObjectsV2Command,
    DeleteObjectsCommand
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
            uploadMethod: bucket.uploadMethod || "proxy",
            publicUrlPrefix: bucket.publicUrlPrefix,
            addTimestamp: bucket.addTimestamp ?? false,
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

    const body = await req.json();
    const { fileKey, fileKeys } = body;

    const keysToDelete: string[] = fileKeys || (fileKey ? [fileKey] : []);

    if (keysToDelete.length === 0) {
        return NextResponse.json({ error: 'No files specified' }, { status: 400 });
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
        const finalKeysToDelete = new Set<string>();

        for (const key of keysToDelete) {
            if (key.endsWith('/')) {
                let continuationToken: string | undefined;
                do {
                    const listCommand = new ListObjectsV2Command({
                        Bucket: bucket.bucket,
                        Prefix: key,
                        ContinuationToken: continuationToken,
                    });
                    const listData = await client.send(listCommand);
                    if (listData.Contents) {
                        for (const obj of listData.Contents) {
                            if (obj.Key) finalKeysToDelete.add(obj.Key);
                        }
                    }
                    continuationToken = listData.NextContinuationToken;
                } while (continuationToken);
                finalKeysToDelete.add(key);
            } else {
                finalKeysToDelete.add(key);
            }
        }

        const allKeys = Array.from(finalKeysToDelete);

        for (let i = 0; i < allKeys.length; i += 1000) {
            const chunk = allKeys.slice(i, i + 1000);
            await client.send(new DeleteObjectsCommand({
                Bucket: bucket.bucket,
                Delete: {
                    Objects: chunk.map(Key => ({ Key })),
                    Quiet: true,
                },
            }));
        }

        for (const key of keysToDelete) {
            await prisma.s3FileActionLog.create({
                data: {
                    action: 'DELETE',
                    bucket: bucket.id,
                    key: key,
                    group: bucket.group,
                    userName: token.name || token.email || 'Unknown',
                }
            }).catch(e => console.error('Failed to log delete action:', e));
        }

        const orConditions = keysToDelete.map(key => {
            if (key.endsWith('/')) {
                return { key: { startsWith: key } };
            }
            return { key };
        });

        await prisma.s3FileIndex.deleteMany({
            where: {
                bucket: bucket.id,
                OR: orConditions,
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

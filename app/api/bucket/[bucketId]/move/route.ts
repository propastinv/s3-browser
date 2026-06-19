import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getBucketById } from '@/lib/buckets';
import { prisma } from '@/lib/prisma';
import {
    ListObjectsV2Command,
    CopyObjectCommand,
    DeleteObjectsCommand
} from '@aws-sdk/client-s3';
import { getS3Client } from '@/lib/s3-client';
import { createMoveJob, updateMoveJob } from '../move-jobs';
import crypto from 'crypto';

export async function POST(
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
    let { sourceKey, destinationKey, items } = body;

    let moveItems: { sourceKey: string; destinationKey: string; isFolder: boolean }[] = [];

    if (items && Array.isArray(items)) {
        moveItems = items.map(item => {
            let dest = item.destinationKey;
            while (dest.startsWith('/')) dest = dest.substring(1);
            return {
                sourceKey: item.sourceKey,
                destinationKey: dest,
                isFolder: item.sourceKey.endsWith('/')
            };
        });
    } else if (sourceKey && destinationKey) {
        let dest = destinationKey;
        while (dest.startsWith('/')) dest = dest.substring(1);
        moveItems = [{
            sourceKey,
            destinationKey: dest,
            isFolder: sourceKey.endsWith('/')
        }];
    } else {
        return NextResponse.json({ error: 'Items or sourceKey/destinationKey are required' }, { status: 400 });
    }

    if (moveItems.length === 0) {
        return NextResponse.json({ error: 'No items to move' }, { status: 400 });
    }

    for (const item of moveItems) {
        if (item.sourceKey === item.destinationKey) {
            return NextResponse.json({ error: 'Source and destination keys must be different' }, { status: 400 });
        }
        if (item.isFolder && !item.destinationKey.endsWith('/')) {
            return NextResponse.json({ error: 'Destination key must be a folder (end with /) when moving a folder' }, { status: 400 });
        }
    }

    const client = getS3Client(bucket);

    const jobId = crypto.randomUUID();
    createMoveJob(jobId);

    // Run the move process in the background
    const moveProcess = async () => {
        try {
            const finalKeysToDelete = new Set<string>();
            const newKeysToAdd = new Set<string>();
            
            // First pass: count items to determine total
            let totalItems = 0;
            const itemsToProcess: { oldKey: string, newKey: string }[] = [];

            for (const item of moveItems) {
                if (item.isFolder) {
                    let continuationToken: string | undefined;
                    do {
                        const listCommand = new ListObjectsV2Command({
                            Bucket: bucket.bucket,
                            Prefix: item.sourceKey,
                            ContinuationToken: continuationToken,
                        });
                        const listData = await client.send(listCommand);
                        if (listData.Contents) {
                            for (const obj of listData.Contents) {
                                if (obj.Key) {
                                    totalItems++;
                                    const newKey = item.destinationKey + obj.Key.slice(item.sourceKey.length);
                                    itemsToProcess.push({ oldKey: obj.Key, newKey });
                                }
                            }
                        }
                        continuationToken = listData.NextContinuationToken;
                    } while (continuationToken);
                } else {
                    totalItems++;
                    itemsToProcess.push({ oldKey: item.sourceKey, newKey: item.destinationKey });
                }
            }

            updateMoveJob(jobId, { totalItems, processedItems: 0, progress: 0 });

            if (totalItems === 0) {
                updateMoveJob(jobId, { status: 'completed', progress: 100 });
                return;
            }

            // Second pass: perform copy
            let processedItems = 0;
            for (const item of itemsToProcess) {
                await client.send(new CopyObjectCommand({
                    Bucket: bucket.bucket,
                    CopySource: `${bucket.bucket}/${item.oldKey}`,
                    Key: item.newKey,
                }));
                finalKeysToDelete.add(item.oldKey);
                newKeysToAdd.add(item.newKey);
                
                processedItems++;
                // Progress reaches 50% max for copy phase
                const progress = Math.round((processedItems / totalItems) * 50);
                updateMoveJob(jobId, { processedItems, progress });
            }

            const allKeysToDelete = Array.from(finalKeysToDelete);

            // Third pass: delete in chunks of 1000
            let deletedItems = 0;
            for (let i = 0; i < allKeysToDelete.length; i += 1000) {
                const chunk = allKeysToDelete.slice(i, i + 1000);
                if (chunk.length > 0) {
                    await client.send(new DeleteObjectsCommand({
                        Bucket: bucket.bucket,
                        Delete: {
                            Objects: chunk.map(Key => ({ Key })),
                            Quiet: true,
                        },
                    }));
                    deletedItems += chunk.length;
                    // Progress from 50% to 100% for delete phase
                    const progress = 50 + Math.round((deletedItems / totalItems) * 50);
                    updateMoveJob(jobId, { progress });
                }
            }

            // Log actions
            await prisma.s3FileActionLog.createMany({
                data: moveItems.map(item => ({
                    action: 'MOVE',
                    bucket: bucket.id,
                    key: item.sourceKey,
                    group: bucket.group,
                    userName: token.name || token.email || 'Unknown',
                }))
            }).catch(e => console.error('Failed to log move actions:', e));

            // Update S3FileIndex: delete old
            const orConditions = moveItems.map(item => 
                item.isFolder ? { key: { startsWith: item.sourceKey } } : { key: item.sourceKey }
            );

            if (orConditions.length > 0) {
                await prisma.s3FileIndex.deleteMany({
                    where: {
                        bucket: bucket.id,
                        OR: orConditions,
                    }
                }).catch(e => console.error('Failed to delete old keys from index:', e));
            }

            // Update S3FileIndex: insert new
            if (newKeysToAdd.size > 0) {
                await prisma.s3FileIndex.createMany({
                    data: Array.from(newKeysToAdd).map(key => ({
                        bucket: bucket.id,
                        group: bucket.group,
                        key,
                    })),
                    skipDuplicates: true,
                }).catch(e => console.error('Failed to add new keys to index:', e));
            }

            updateMoveJob(jobId, { status: 'completed', progress: 100 });

        } catch (err: any) {
            console.error('Background move failed:', err);
            updateMoveJob(jobId, { status: 'error', error: err.message || 'Unknown error' });
        }
    };

    moveProcess();

    return NextResponse.json({ success: true, jobId, message: 'Move process started in background' });
}

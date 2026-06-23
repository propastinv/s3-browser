import https from 'https';
import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { BucketConfig } from '@/types/bucket';

const globalForS3 = global as unknown as { s3Clients: Map<string, S3Client> };

if (!globalForS3.s3Clients) {
    globalForS3.s3Clients = new Map();
}

export function getS3Client(bucket: BucketConfig): S3Client {
    const cached = globalForS3.s3Clients.get(bucket.id);
    if (cached) return cached;

    const client = new S3Client({
        region: bucket.region,
        endpoint: bucket.endpoint,
        forcePathStyle: bucket.forcePathStyle ?? false,
        credentials: {
            accessKeyId: bucket.accessKeyId,
            secretAccessKey: bucket.secretAccessKey,
        },
        requestHandler: new NodeHttpHandler({
            connectionTimeout: 10_000,
            requestTimeout: 60_000,
            httpsAgent: new https.Agent({
                keepAlive: true,
                keepAliveMsecs: 1_000,
                maxSockets: 50,
                timeout: 30_000,
            }),
        }),
    });

    globalForS3.s3Clients.set(bucket.id, client);
    return client;
}

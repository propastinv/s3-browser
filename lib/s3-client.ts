import https from 'https';
import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { BucketConfig } from '@/types/bucket';

const globalForS3 = global as unknown as { s3Clients: Map<string, S3Client> };

if (!globalForS3.s3Clients) {
    globalForS3.s3Clients = new Map();
}

const requestHandler = new NodeHttpHandler({
    httpsAgent: new https.Agent({ maxSockets: 300 }),
    socketAcquisitionWarningTimeout: 15_000,
});

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
        requestHandler,
    });

    globalForS3.s3Clients.set(bucket.id, client);
    return client;
}

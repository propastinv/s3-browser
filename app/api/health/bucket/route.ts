import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { loadBuckets } from "@/lib/buckets";
import { getS3Client } from "@/lib/s3-client";

const BUCKET_ID = "cf-images";

export async function GET() {
  const bucket = loadBuckets().find((b) => b.id === BUCKET_ID);

  if (!bucket) {
    return Response.json(
      { status: "error", bucket: BUCKET_ID, error: "Bucket config not found" },
      { status: 503 }
    );
  }

  try {
    const client = getS3Client(bucket);
    await client.send(new HeadBucketCommand({ Bucket: bucket.bucket }));

    return Response.json({ status: "ok", bucket: BUCKET_ID });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { status: "error", bucket: BUCKET_ID, error: message },
      { status: 503 }
    );
  }
}

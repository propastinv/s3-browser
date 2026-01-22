import fs from 'fs';
import yaml from 'js-yaml';
import { BucketConfig } from '@/types/bucket';

export function loadBuckets(): BucketConfig[] {
    const file = fs.readFileSync('./buckets.yaml', 'utf8');
    const data = yaml.load(file) as { buckets: BucketConfig[] };
    return data.buckets;
}

export function getBucketById(id: string, groups: string[]): BucketConfig | undefined {
    const buckets = loadBuckets();

    if (groups.includes('superadmin')) {
        return buckets.find(b => b.id === id);
    }

    const bucket = buckets.find(b => b.id === id);
    if (!bucket) return undefined;

    if (!groups.includes(bucket.group)) return undefined;

    return bucket;
}

export function getBucketsForGroups(groups: string[]): BucketConfig[] {
    const buckets = loadBuckets();
    if (groups.includes('superadmin')) {
        return buckets;
    }
    return buckets.filter(b => groups.includes(b.group));
}

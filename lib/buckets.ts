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

    // Support comma-separated groups
    const allowedGroups = bucket.group.split(',').map(g => g.trim());
    const hasAccess = allowedGroups.some(group => groups.includes(group));

    if (!hasAccess) return undefined;

    return bucket;
}

export function getBucketsForGroups(groups: string[]): BucketConfig[] {
    const buckets = loadBuckets();
    if (groups.includes('superadmin')) {
        return buckets;
    }
    return buckets.filter(b => {
        const allowedGroups = b.group.split(',').map(g => g.trim());
        return allowedGroups.some(group => groups.includes(group));
    });
}

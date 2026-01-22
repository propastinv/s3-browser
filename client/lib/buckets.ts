import fs from 'fs';
import yaml from 'js-yaml';
import { BucketConfig } from '@/types/bucket';

export function loadBuckets(): BucketConfig[] {
    const file = fs.readFileSync('./buckets.yaml', 'utf8');
    const data = yaml.load(file) as { buckets: BucketConfig[] };
    return data.buckets;
}

export function getBucketById(id: string): BucketConfig | undefined {
    const buckets = loadBuckets();
    return buckets.find(b => b.id === id);
}
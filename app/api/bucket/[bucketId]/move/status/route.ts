import { NextRequest, NextResponse } from 'next/server';
import { getMoveJob } from '../../move-jobs';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ bucketId: string }> }
) {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
        return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    const job = getMoveJob(jobId);
    if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
}

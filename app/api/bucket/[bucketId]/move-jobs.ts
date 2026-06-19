const JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface MoveJob {
    id: string;
    status: 'running' | 'completed' | 'error';
    progress: number;
    totalItems: number;
    processedItems: number;
    error?: string;
    finishedAt?: number;
}

const globalForJobs = global as unknown as { moveJobs: Map<string, MoveJob> };

if (!globalForJobs.moveJobs) {
    globalForJobs.moveJobs = new Map();
}

export const moveJobs = globalForJobs.moveJobs;

function evictExpiredJobs() {
    const cutoff = Date.now() - JOB_TTL_MS;
    for (const [id, job] of moveJobs) {
        if (job.finishedAt !== undefined && job.finishedAt < cutoff) {
            moveJobs.delete(id);
        }
    }
}

export function createMoveJob(id: string): MoveJob {
    evictExpiredJobs();
    const job: MoveJob = {
        id,
        status: 'running',
        progress: 0,
        totalItems: 0,
        processedItems: 0,
    };
    moveJobs.set(id, job);
    return job;
}

export function getMoveJob(id: string): MoveJob | undefined {
    return moveJobs.get(id);
}

export function updateMoveJob(id: string, updates: Partial<MoveJob>) {
    const job = moveJobs.get(id);
    if (!job) return;
    Object.assign(job, updates);
    if (updates.status === 'completed' || updates.status === 'error') {
        job.finishedAt = Date.now();
    }
}

export interface MoveJob {
    id: string;
    status: 'running' | 'completed' | 'error';
    progress: number;
    totalItems: number;
    processedItems: number;
    error?: string;
}

const globalForJobs = global as unknown as { moveJobs: Map<string, MoveJob> };
export const moveJobs = globalForJobs.moveJobs || new Map<string, MoveJob>();

if (process.env.NODE_ENV !== "production") {
    globalForJobs.moveJobs = moveJobs;
}

export function createMoveJob(id: string): MoveJob {
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
    if (job) {
        Object.assign(job, updates);
    }
}

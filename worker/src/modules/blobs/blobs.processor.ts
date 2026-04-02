import type { Job } from 'bullmq';

import {
  BLOBS_JOB_DELETE_OBJECT,
  BLOBS_JOB_SWEEP_ORPHANS,
  type DeleteObjectJobData,
  type SweepOrphansJobData,
} from './blobs.constants';
import { removeObjectSafe } from '../../integrations/storage/minio';
import { sweepOrphanObjects } from './blobs.sweeper';
import { withClient } from '../../db/pool';

export async function processBlobsJob(job: Job) {
  if (job.name === BLOBS_JOB_DELETE_OBJECT) {
    const data = job.data as DeleteObjectJobData;
    if (!data?.bucket || !data?.objectKey) throw new Error('Missing bucket/objectKey');

    await removeObjectSafe(data.bucket, data.objectKey);
    return;
  }

  if (job.name === BLOBS_JOB_SWEEP_ORPHANS) {
    void (job.data as SweepOrphansJobData);

    const result = await withClient(async (client) => sweepOrphanObjects(client));
    return result;
  }
}

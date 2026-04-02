export const BLOBS_QUEUE_NAME = 'blobs' as const;

export const BLOBS_JOB_DELETE_OBJECT = 'delete_object' as const;
export const BLOBS_JOB_SWEEP_ORPHANS = 'sweep_orphans' as const;

export type DeleteObjectJobData = {
  bucket: string;
  objectKey: string;
};

export type SweepOrphansJobData = {
  // reserved for future knobs (e.g. dryRun)
};

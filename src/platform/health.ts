// Apple Health integration port. HealthKit is unreachable from a web app, so the
// web build is a no-op that reports "unsupported". A future Capacitor build will
// provide a real implementation (write workout + volume to HealthKit) behind this
// same interface, so no calling code needs to change.

export interface WorkoutSummary {
  date: string;
  liftName: string;
  totalReps: number;
  totalVolumeKg: number;
  durationSeconds?: number;
}

export interface HealthPort {
  isSupported(): boolean;
  saveWorkout(summary: WorkoutSummary): Promise<{ ok: boolean; reason?: string }>;
}

export const health: HealthPort = {
  isSupported: () => false,
  saveWorkout: async () => ({
    ok: false,
    reason: 'Apple Health requires the native app build (coming later).',
  }),
};

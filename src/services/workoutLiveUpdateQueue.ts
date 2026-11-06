export type LatestWinsRunner<T> = (
  payload: T,
  stillCurrent: () => boolean
) => Promise<boolean | void | undefined>;

type PendingJob<T> = {
  payload: T;
  generation: number;
  resolve: (accepted: boolean) => void;
  run: LatestWinsRunner<T>;
};

/**
 * Serializes async writes with latest-wins semantics.
 * A newer enqueue drops a not-yet-started job (resolves false).
 * An in-flight run is allowed to finish; its result is accepted only if its
 * generation is still current when it settles.
 */
export function createLatestWinsQueue<T>() {
  let generation = 0;
  let pending: PendingJob<T> | null = null;
  let draining = false;

  const drain = async (): Promise<void> => {
    if (draining) return;
    draining = true;
    try {
      while (pending) {
        const job = pending;
        pending = null;
        const stillCurrent = () => job.generation === generation;
        let accepted = false;
        try {
          const result = await job.run(job.payload, stillCurrent);
          // Android may resolve undefined; only explicit false is a drop.
          accepted = result !== false;
        } catch {
          accepted = false;
        }
        job.resolve(accepted && stillCurrent());
      }
    } finally {
      draining = false;
      if (pending) {
        void drain();
      }
    }
  };

  return {
    enqueue(payload: T, run: LatestWinsRunner<T>): Promise<boolean> {
      generation += 1;
      const jobGeneration = generation;
      if (pending) {
        pending.resolve(false);
        pending = null;
      }
      return new Promise<boolean>((resolve) => {
        pending = {
          payload,
          generation: jobGeneration,
          resolve,
          run,
        };
        void drain();
      });
    },

    invalidate(): void {
      generation += 1;
      if (pending) {
        pending.resolve(false);
        pending = null;
      }
    },

    hasPending(): boolean {
      return pending != null;
    },
  };
}

export type LatestWinsQueue<T> = ReturnType<typeof createLatestWinsQueue<T>>;

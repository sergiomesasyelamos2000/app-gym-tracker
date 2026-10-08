type Task = () => Promise<void>;

let epoch = 0;
/** Bumps only after a successful layout save for the current epoch. */
let serverGeneration = 0;
let queue: Promise<void> = Promise.resolve();
let pendingSaves = 0;

export function resetRoutineLayoutGateForTests(): void {
  epoch = 0;
  serverGeneration = 0;
  queue = Promise.resolve();
  pendingSaves = 0;
}

export function beginLocalEdit(): number {
  epoch += 1;
  return epoch;
}

export function currentLayoutEpoch(): number {
  return epoch;
}

export function currentServerGeneration(): number {
  return serverGeneration;
}

export function isLayoutSaveInFlight(): boolean {
  return pendingSaves > 0;
}

/**
 * Call after a successful PUT for this edit epoch so in-flight GETs
 * that started before the save cannot hydrate the old layout.
 */
export function markLayoutSaved(editEpoch: number): void {
  if (editEpoch !== epoch) return;
  serverGeneration += 1;
}

/**
 * True when a server hydrate that started at the given epoch/generation
 * may still overwrite local layout.
 */
export function shouldApplyServerLayout(
  epochAtFetchStart: number,
  generationAtFetchStart: number
): boolean {
  if (epoch !== epochAtFetchStart) return false;
  if (pendingSaves > 0) return false;
  if (generationAtFetchStart !== serverGeneration) return false;
  return true;
}

export function settle(editEpoch: number): void {
  if (editEpoch !== epoch) return;
}

export function fail(editEpoch: number): boolean {
  return editEpoch === epoch;
}

export function enqueue(task: Task): Promise<void> {
  pendingSaves += 1;
  const run = queue.then(task, task);
  queue = run.then(
    () => {
      pendingSaves = Math.max(0, pendingSaves - 1);
    },
    () => {
      pendingSaves = Math.max(0, pendingSaves - 1);
    }
  );
  return run;
}

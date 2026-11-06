import { createLatestWinsQueue } from "../workoutLiveUpdateQueue";

describe("createLatestWinsQueue", () => {
  it("coalesces pending jobs to the latest payload", async () => {
    const queue = createLatestWinsQueue<number>();
    const seen: number[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = queue.enqueue(1, async (n) => {
      seen.push(n);
      await firstGate;
      return true;
    });
    const second = queue.enqueue(2, async (n) => {
      seen.push(n);
      return true;
    });
    const third = queue.enqueue(3, async (n, stillCurrent) => {
      seen.push(n);
      expect(stillCurrent()).toBe(true);
      return true;
    });

    releaseFirst();
    // In-flight job is superseded when newer enqueues bump generation.
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(false);
    await expect(third).resolves.toBe(true);
    expect(seen).toEqual([1, 3]);
  });

  it("does not accept a result when the runner returns false", async () => {
    const queue = createLatestWinsQueue<string>();
    await expect(
      queue.enqueue("x", async () => false)
    ).resolves.toBe(false);
  });

  it("treats undefined runner results as success", async () => {
    const queue = createLatestWinsQueue<string>();
    await expect(
      queue.enqueue("x", async () => undefined)
    ).resolves.toBe(true);
  });

  it("invalidate drops a pending job and rejects an in-flight generation", async () => {
    const queue = createLatestWinsQueue<number>();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const inFlight = queue.enqueue(1, async () => {
      await gate;
      return true;
    });
    const pending = queue.enqueue(2, async () => true);

    expect(queue.hasPending()).toBe(true);
    queue.invalidate();
    expect(queue.hasPending()).toBe(false);
    release();

    await expect(inFlight).resolves.toBe(false);
    await expect(pending).resolves.toBe(false);
  });
});

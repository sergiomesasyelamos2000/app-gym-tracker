import {
  beginLocalEdit,
  currentLayoutEpoch,
  currentServerGeneration,
  enqueue,
  fail,
  markLayoutSaved,
  resetRoutineLayoutGateForTests,
  shouldApplyServerLayout,
} from "../routineLayoutGate";

describe("routineLayoutGate", () => {
  beforeEach(() => {
    resetRoutineLayoutGateForTests();
  });

  it("skips hydrate after a local edit bumps the epoch", () => {
    const epochAtFetchStart = currentLayoutEpoch();
    const genAtFetchStart = currentServerGeneration();
    beginLocalEdit();
    expect(
      shouldApplyServerLayout(epochAtFetchStart, genAtFetchStart)
    ).toBe(false);
  });

  it("allows hydrate when epoch and generation are unchanged", () => {
    expect(shouldApplyServerLayout(0, 0)).toBe(true);
  });

  it("skips hydrate when generation advanced after a save during the fetch", async () => {
    const editEpoch = beginLocalEdit();
    const fetchEpoch = currentLayoutEpoch();
    const fetchGen = currentServerGeneration();

    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const save = enqueue(async () => {
      await hold;
      markLayoutSaved(editEpoch);
    });

    expect(shouldApplyServerLayout(fetchEpoch, fetchGen)).toBe(false);
    release();
    await save;
    // Same epoch, but generation moved → still skip this in-flight GET.
    expect(shouldApplyServerLayout(fetchEpoch, fetchGen)).toBe(false);
    // A new fetch after save may hydrate.
    expect(
      shouldApplyServerLayout(
        currentLayoutEpoch(),
        currentServerGeneration()
      )
    ).toBe(true);
  });

  it("fail only returns true for the latest epoch", () => {
    const first = beginLocalEdit();
    const second = beginLocalEdit();
    expect(fail(first)).toBe(false);
    expect(fail(second)).toBe(true);
  });

  it("runs enqueued saves in order", async () => {
    const order: number[] = [];
    let resolveFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });

    const p1 = enqueue(async () => {
      await firstGate;
      order.push(1);
    });
    const p2 = enqueue(async () => {
      order.push(2);
    });

    resolveFirst();
    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });
});

import type { SetRequestDto } from "@sergiomesasyelamos2000/shared";
import {
  buildNextSetSummary,
  resolveNextSetPrescription,
} from "../workoutLiveHelpers";

const set = (
  partial: Partial<SetRequestDto> & { id: string; order: number }
): SetRequestDto =>
  ({
    completed: false,
    weight: 0,
    reps: 0,
    ...partial,
  }) as SetRequestDto;

describe("resolveNextSetPrescription", () => {
  it("uses typed weight and reps when present", () => {
    expect(
      resolveNextSetPrescription(
        set({ id: "s1", order: 1, weight: 40, reps: 8 }),
        { weight: 30, reps: 10 }
      )
    ).toBe("40 kg x 8");
  });

  it("falls back to template when workout placeholders are 0/0", () => {
    expect(
      resolveNextSetPrescription(set({ id: "s1", order: 1 }), {
        weight: 30,
        reps: 10,
      })
    ).toBe("30 kg x 10");
  });

  it("uses template weight with template reps range", () => {
    expect(
      resolveNextSetPrescription(set({ id: "s1", order: 1 }), {
        weight: 30,
        reps: 0,
        repsMin: 8,
        repsMax: 10,
      })
    ).toBe("30 kg x 8-10");
  });

  it("uses live-set range with template weight when no exact template reps", () => {
    expect(
      resolveNextSetPrescription(
        set({ id: "s1", order: 1, repsMin: 8, repsMax: 10 }),
        { weight: 30, reps: 0 }
      )
    ).toBe("30 kg x 8-10");
  });

  it("keeps bodyweight 0 kg when reps are typed", () => {
    expect(
      resolveNextSetPrescription(
        set({ id: "s1", order: 1, weight: 0, reps: 12 }),
        null
      )
    ).toBe("0 kg x 12");
  });

  it("returns null when nothing is known", () => {
    expect(resolveNextSetPrescription(set({ id: "s1", order: 1 }), null)).toBe(
      null
    );
  });
});

describe("buildNextSetSummary", () => {
  it("formats the next incomplete set from the routine template", () => {
    const list = [
      set({ id: "s1", order: 1, completed: true, weight: 40, reps: 8 }),
      set({ id: "s2", order: 2, weight: 0, reps: 0 }),
    ];
    expect(
      buildNextSetSummary(list, "s1", {
        getTemplatePrescription: (_set, index) =>
          index === 1
            ? { weight: 30, reps: 0, repsMin: 8, repsMax: 10 }
            : null,
      })
    ).toBe("Serie 2 de 2 (30 kg x 8-10)");
  });

  it("returns null after the last set of the exercise", () => {
    const list = [
      set({ id: "s1", order: 1, completed: true }),
      set({ id: "s2", order: 2, completed: true }),
    ];
    expect(buildNextSetSummary(list, "s2")).toBeNull();
  });

  it("does not emit 0kg x 0 reps for empty placeholders without template", () => {
    const list = [
      set({ id: "s1", order: 1, completed: true }),
      set({ id: "s2", order: 2, weight: 0, reps: 0 }),
    ];
    expect(buildNextSetSummary(list, "s1")).toBe("Serie 2 de 2");
  });
});

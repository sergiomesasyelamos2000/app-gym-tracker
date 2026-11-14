import { act, renderHook } from "@testing-library/react-native";
import type { SetRequestDto } from "@sergiomesasyelamos2000/shared";
import { useSetRowLogic } from "../useSetRowLogic";

const baseItem = {
  id: "s1",
  order: 1,
  weight: 0,
  reps: 0,
  completed: false,
} as SetRequestDto;

describe("useSetRowLogic complete autofill", () => {
  it("fills empty weight and reps from previous mark when checking the set", () => {
    const onUpdate = jest.fn();
    const { result } = renderHook(() =>
      useSetRowLogic({
        item: baseItem,
        onUpdate,
        repsType: "reps",
        started: true,
        previousMark: "90kg x 15",
      })
    );

    act(() => {
      result.current.handleToggleCompleted();
    });

    expect(onUpdate).toHaveBeenCalledWith("s1", "weight", 90);
    expect(onUpdate).toHaveBeenCalledWith("s1", "reps", 15);
    expect(onUpdate).toHaveBeenCalledWith("s1", "completed", true);
    expect(result.current.localWeight).toBe("90");
    expect(result.current.localReps).toBe("15");
  });

  it("only fills the empty field when the other was typed", () => {
    const onUpdate = jest.fn();
    const { result } = renderHook(() =>
      useSetRowLogic({
        item: { ...baseItem, weight: 100 } as SetRequestDto,
        onUpdate,
        repsType: "reps",
        started: true,
        previousMark: "90kg x 15",
      })
    );

    act(() => {
      result.current.handleToggleCompleted();
    });

    expect(onUpdate).not.toHaveBeenCalledWith("s1", "weight", expect.anything());
    expect(onUpdate).toHaveBeenCalledWith("s1", "reps", 15);
    expect(onUpdate).toHaveBeenCalledWith("s1", "completed", true);
  });

  it("does not overwrite when unchecking", () => {
    const onUpdate = jest.fn();
    const { result } = renderHook(() =>
      useSetRowLogic({
        item: { ...baseItem, completed: true, weight: 90, reps: 15 } as SetRequestDto,
        onUpdate,
        repsType: "reps",
        started: true,
        previousMark: "100kg x 12",
      })
    );

    act(() => {
      result.current.handleToggleCompleted();
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith("s1", "completed", false);
  });
});

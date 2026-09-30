import { useEffect, useState } from "react";

/**
 * Delays swapKey updates so typing filters live without remounting/animating
 * on every keystroke. Animation fires after the user pauses.
 */
export function useDebouncedSwapKey(
  value: string,
  delayMs = 350
): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

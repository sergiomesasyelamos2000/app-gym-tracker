export type ScreenHeaderMode = "back" | "close";

export function screenHeaderIconName(
  mode: ScreenHeaderMode,
  os: string
): "chevron-back" | "arrow-back" | "close" {
  if (mode === "close") return "close";
  return os === "ios" ? "chevron-back" : "arrow-back";
}

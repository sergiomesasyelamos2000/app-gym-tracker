import type { ReactNode } from "react";

export type ModalDismissReason = "backdrop" | "back" | "swipe" | "close";

export type AppDialogProps = {
  visible: boolean;
  onDismiss: (reason: ModalDismissReason) => void;
  children: ReactNode;
  title?: string;
  /** Default false — confirms must not close on accidental outside tap */
  dismissOnBackdrop?: boolean;
  /** Default true — Android back = cancel */
  dismissOnBack?: boolean;
  avoidKeyboard?: boolean;
  maxWidth?: number;
  scrollable?: boolean;
  /**
   * When true, the card is a View (not Pressable) so horizontal
   * pan gestures inside (e.g. CalendarList) are not stolen.
   * Backdrop dismiss still works via an absolute-fill Pressable.
   */
  releaseCardPress?: boolean;
  contentStyle?: object;
  testID?: string;
};

export type AppSheetProps = {
  visible: boolean;
  onDismiss: (reason: ModalDismissReason) => void;
  /** Fires after the close animation finishes */
  onDismissed?: () => void;
  children: ReactNode;
  title?: string;
  showHandle?: boolean;
  dismissOnBackdrop?: boolean;
  dismissOnBack?: boolean;
  swipeToDismiss?: boolean;
  avoidKeyboard?: boolean;
  maxHeightRatio?: number;
  scrollable?: boolean;
  contentStyle?: object;
  testID?: string;
};

export type BlockingOverlayProps = {
  visible: boolean;
  message?: string;
  testID?: string;
};

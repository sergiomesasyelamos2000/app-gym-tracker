import React from "react";

interface SyncProviderProps {
  children: React.ReactNode;
}

// Web fallback: disable native SQLite sync layer on web builds.
export function SyncProvider({ children }: SyncProviderProps) {
  return <>{children}</>;
}


export const parseTime = (
  timeStr: string
): { minutes: number; seconds: number } => {
  const [minStr, secStr] = timeStr.split(":");
  return {
    minutes: parseInt(minStr) || 0,
    seconds: parseInt(secStr) || 0,
  };
};

export const parseRestTime = (timeStr: string) => {
  const [minutes, seconds] = timeStr.split(":").map(Number);
  return {
    minutes: isNaN(minutes) ? 0 : minutes,
    seconds: isNaN(seconds) ? 0 : seconds,
  };
};

export const formatTime = ({
  minutes,
  seconds,
}: {
  minutes?: number;
  seconds?: number;
}) => {
  const timeParts: string[] = [];
  if (minutes !== undefined) {
    timeParts.push(minutes.toString().padStart(2, "0"));
  }
  if (seconds !== undefined) {
    timeParts.push(seconds.toString().padStart(2, "0"));
  }
  return timeParts.join(":");
};

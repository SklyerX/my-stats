export function chunks<T>(array: Array<T>, chunkSize: number) {
  const chunks = [] as Array<T[]>;
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    chunks.push(chunk);
  }

  return chunks;
}

export function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase());
}

export function formatFollowerCount(count: number): string {
  const f = Intl.NumberFormat(undefined, {
    notation: "compact",
  });

  return f.format(count);
}

export function timeDifference(timestamp: Date) {
  const currentTime = new Date();
  const timeDifferenceInMillis = currentTime.getTime() - timestamp.getTime();

  const seconds = Math.floor(timeDifferenceInMillis / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  return {
    days: days,
    hours: hours % 24,
    minutes: minutes % 60,
    seconds: seconds % 60,
  };
}

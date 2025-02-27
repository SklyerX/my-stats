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

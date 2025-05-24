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

export function convertTo12Hour(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";

  const hour12 = hour % 12 || 12;

  return `${hour12} ${period}`;
}

export function getUrl(type = "main"): string {
  const isDev = process.env.NODE_ENV === "development";
  const port = isDev ? ":3000" : "";
  const docsPort = isDev ? ":3001" : "";

  // For production
  if (!isDev) {
    if (type === "developer") {
      return "https://developer.stats.skylerx.ir";
    }
    if (type === "api") {
      return "https://api.stats.skylerx.ir";
    }
    if (type === "docs") {
      return "https://docs.stats.skylerx.ir";
    }

    return "https://stats.skylerx.ir";
  }

  // For development
  if (type === "developer") {
    // Developer portal ALWAYS uses the domain, never localhost
    return `http://developer.stats.skylerx.ir${port}`;
  }

  if (type === "api") {
    return `http://api.stats.skylerx.ir${port}`;
  }

  if (type === "docs") {
    return `http://localhost${docsPort}`;
  }

  // Main site uses localhost by default in dev, unless FORCE_DOMAINS is set
  if (process.env.FORCE_DOMAINS) {
    return `http://stats.skylerx.ir${port}`;
  }

  return `http://localhost${port}`;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const calculateTopGenres = (genres: string[]) =>
  Array.from(new Set(genres)).sort(
    (a, b) =>
      genres.filter((x) => x === b).length -
      genres.filter((x) => x === a).length,
  );

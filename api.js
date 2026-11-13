// TMDb data layer: shared request cache and normalized API helpers.
const API_KEY = "52a00342238189a79c137a328380b9d0";
export const IMAGE_BASE = "https://image.tmdb.org/t/p/";
const API_BASE = "https://api.themoviedb.org/3";
const responseCache = new Map();
const CACHE_LIMIT = 250;

function cacheSet(key, value) {
  if (responseCache.size >= CACHE_LIMIT) {
    responseCache.delete(responseCache.keys().next().value);
  }
  responseCache.set(key, value);
}

export async function request(path, { signal, cache = true } = {}) {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("api_key", API_KEY);
  const key = url.toString();

  if (cache && responseCache.has(key)) return responseCache.get(key);

  const response = await fetch(key, { signal });
  if (!response.ok) {
    const error = new Error(`TMDb request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  if (cache) cacheSet(key, data);
  return data;
}

export function searchMedia(query, kind, options = {}) {
  const endpoint = kind === "person" ? "person" : "movie";
  return request(`/search/${endpoint}?query=${encodeURIComponent(query)}&include_adult=false`, options);
}

export function getMediaDetails(id, kind, options = {}) {
  return request(`/${kind}/${id}`, options);
}

export function getPersonDetails(id, options = {}) {
  return request(`/person/${id}`, options);
}

export async function getPersonCredits(id, includeTV = false, options = {}) {
  const movie = await request(`/person/${id}/movie_credits`, options);
  const tv = includeTV
    ? await request(`/person/${id}/tv_credits`, options)
    : null;
  return [
    ...normalizeCredits(movie, "movie"),
    ...(includeTV ? normalizeCredits(tv, "tv") : [])
  ];
}

export async function getMovieCredits(id, options = {}) {
  const data = await request(`/movie/${id}/credits`, options);
  const people = new Map();

  for (const person of [...(data.cast || []), ...(data.crew || [])]) {
    const role = person.character || person.job || "Crew";
    if (!people.has(person.id)) people.set(person.id, { id: person.id, roles: [] });
    const entry = people.get(person.id);
    if (!entry.roles.includes(role)) entry.roles.push(role);
  }

  return [...people.values()].map(person => ({
    id: person.id,
    _role: person.roles.join(" / ")
  }));
}

function normalizeCredits(data, mediaType) {
  if (!data) return [];
  const credits = [];

  for (const person of [...(data.cast || []), ...(data.crew || [])]) {
    const date = mediaType === "movie" ? person.release_date : person.first_air_date;
    credits.push({
      media_type: mediaType,
      id: person.id,
      _role: person.character || person.job || "Crew",
      year: date ? Number(date.slice(0, 4)) : 0
    });
  }
  return credits;
}

export function clearRequestCache() {
  responseCache.clear();
}

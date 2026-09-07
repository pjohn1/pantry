import { coverFromUrl, imageLoads } from '../utils/image';

/**
 * Covers for saved ideas.
 *
 * Two halves, deliberately separate. `describeLink` is pure and instant: it
 * reads the source, the creator and a monogram straight out of the URL, which
 * is what lets a row paint the moment it is saved. `fetchCover` is the one
 * networked step, and it runs in the background afterwards.
 *
 * It only ever talks to the link's own source. A public reader proxy would
 * cover far more sites — it is the only way to read `og:image` off an ordinary
 * recipe page, since CORS blocks a browser from fetching that HTML — but it
 * would also mean sending saved links to a third party that is not the source,
 * and depending on a free tier staying up. Neither is worth an extra thumbnail
 * on a device-only ledger, so anything these four paths cannot serve keeps its
 * monogram, and the sheet's "Choose a cover" is the escape hatch.
 *
 * Instagram once had a fifth path. `api.instagram.com/oembed` was retired in
 * October 2020 and now redirects instead of returning JSON; its replacement
 * needs a Facebook app token, i.e. a server-side secret this app has nowhere
 * to keep. It was still being called on every Instagram save, which is why
 * every Instagram card was a placeholder.
 */

const OEMBED_TIMEOUT_MS = 5000;

export interface LinkDescription {
  /** 'TikTok', 'Instagram', 'YouTube', or the bare domain. */
  sourceLabel: string;
  /** '@gordonramsayofficial', where the URL carries one. */
  handle?: string;
  /** One character for the placeholder tile. */
  monogram: string;
}

/** Path segments that are route words, not usernames. */
const IG_ROUTES = new Set(['p', 'reel', 'reels', 'tv', 'explore', 'stories', 's']);

function hostOf(u: URL): string {
  return u.hostname.replace(/^(www|m|vm|vt)\./, '');
}

function segments(u: URL): string[] {
  return u.pathname.split('/').filter(Boolean);
}

function firstLetter(...candidates: (string | undefined)[]): string {
  for (const c of candidates) {
    const match = c?.trim().replace(/^@/, '').match(/\p{L}|\p{N}/u);
    if (match) return match[0].toUpperCase();
  }
  return '·';
}

/** Everything derivable from the link with no network at all. */
export function describeLink(url: string, title?: string): LinkDescription {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { sourceLabel: 'Link', monogram: firstLetter(title) };
  }

  const host = hostOf(parsed);
  const seg = segments(parsed);
  let sourceLabel = host;
  let handle: string | undefined;

  if (host.endsWith('tiktok.com')) {
    sourceLabel = 'TikTok';
    if (seg[0]?.startsWith('@')) handle = seg[0];
  } else if (host.endsWith('instagram.com')) {
    sourceLabel = 'Instagram';
    if (seg[0] && !IG_ROUTES.has(seg[0])) handle = `@${seg[0]}`;
  } else if (host.endsWith('youtube.com') || host === 'youtu.be') {
    sourceLabel = 'YouTube';
    if (seg[0]?.startsWith('@')) handle = seg[0];
  }

  return { sourceLabel, handle, monogram: firstLetter(handle, title, host) };
}

/** A cover address, and whether its host is worth asking for canvas access. */
interface Candidate {
  url: string;
  /** False for hosts that will never send CORS headers — skip the wasted load. */
  tryCanvas: boolean;
}

function youTubeId(u: URL): string | undefined {
  const host = hostOf(u);
  const seg = segments(u);
  if (host === 'youtu.be') return seg[0];
  const v = u.searchParams.get('v');
  if (v) return v;
  if (seg[0] === 'shorts' || seg[0] === 'embed' || seg[0] === 'live') return seg[1];
  return undefined;
}

function instagramCode(u: URL): string | undefined {
  const seg = segments(u);
  const i = seg.findIndex(s => s === 'p' || s === 'reel' || s === 'reels' || s === 'tv');
  return i === -1 ? undefined : seg[i + 1];
}

/** TikTok's oEmbed is open to browsers — it answers with `access-control-allow-origin: *`. */
async function tikTokThumbnail(url: string): Promise<string | undefined> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), OEMBED_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      { signal: abort.signal },
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    return (data.thumbnail_url as string) || undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function candidatesFor(url: string): Promise<Candidate[]> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return [];
  }

  const host = hostOf(parsed);

  if (/\.(jpe?g|png|webp|gif|avif)$/i.test(parsed.pathname)) {
    return [{ url, tryCanvas: true }];
  }

  if (host.endsWith('tiktok.com')) {
    const thumb = await tikTokThumbnail(url);
    return thumb ? [{ url: thumb, tryCanvas: true }] : [];
  }

  if (host.endsWith('youtube.com') || host === 'youtu.be') {
    const id = youTubeId(parsed);
    if (!id) return [];
    // maxres exists only for videos uploaded above 720p; hq always does.
    return [
      { url: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`, tryCanvas: true },
      { url: `https://img.youtube.com/vi/${id}/hqdefault.jpg`, tryCanvas: true },
    ];
  }

  if (host.endsWith('instagram.com')) {
    const code = instagramCode(parsed);
    if (!code) return [];
    // An `<img>` needs neither CORS nor a token, which is the only reason this
    // is reachable at all. Instagram sends most logged-out requests to a login
    // page now, so treat a hit as luck rather than as a feature — and never
    // ask for canvas access, which it will certainly refuse.
    return [{ url: `https://www.instagram.com/p/${code}/media/?size=l`, tryCanvas: false }];
  }

  return [];
}

/**
 * Resolves a cover for a saved link: a data URL when the host allows a canvas
 * read, the remote address when it only allows painting, and '' when the link
 * has no reachable cover at all. Never throws — a missing cover is a
 * placeholder, not an error.
 */
export async function fetchCover(url: string): Promise<string> {
  let candidates: Candidate[];
  try {
    candidates = await candidatesFor(url);
  } catch {
    return '';
  }

  for (const candidate of candidates) {
    if (candidate.tryCanvas) {
      try {
        return await coverFromUrl(candidate.url);
      } catch {
        // CORS refused, or the host served something too small to be a cover.
      }
    }
    if (await imageLoads(candidate.url)) return candidate.url;
  }

  return '';
}

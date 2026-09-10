export interface WikiContent {
  html: string;
  syncedAt: string;
  sourceUrl: string;
}

/**
 * The IC Promotion Wiki snapshot is a static asset (public/content/) refreshed by
 * `npm run sync-wiki`, fetched on demand so its ~70 KB never sits in a JS chunk.
 */
export async function loadWikiContent(signal?: AbortSignal): Promise<WikiContent> {
  const [htmlRes, metaRes] = await Promise.all([
    fetch('/content/guidelines-wiki.html', { signal }),
    fetch('/content/guidelines-wiki.meta.json', { signal }),
  ]);
  if (!htmlRes.ok) throw new Error(`Guidelines content unavailable (${htmlRes.status})`);
  const html = await htmlRes.text();
  const meta = metaRes.ok ? await metaRes.json() : {};
  return {
    html,
    syncedAt: typeof meta.syncedAt === 'string' ? meta.syncedAt : '',
    sourceUrl: typeof meta.sourceUrl === 'string' ? meta.sourceUrl : '',
  };
}

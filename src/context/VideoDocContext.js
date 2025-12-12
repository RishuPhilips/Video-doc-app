
import React, { createContext, useContext, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { YOUTUBE_API_KEY } from '../constant/constant';

const MOCK_VIDEOS = [
  { id: 'vid-1', title: 'React Native FlatList Basics', thumbnail: 'https://i.ytimg.com/vi/5VbAwhBBHsg/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=5VbAwhBBHsg' },
  { id: 'vid-2', title: 'Firebase Auth in RN', thumbnail: 'https://i.ytimg.com/vi/zQyrwxMPm88/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=zQyrwxMPm88' },
  { id: 'vid-3', title: 'Navigation Stack vs Tabs', thumbnail: 'https://i.ytimg.com/vi/WzQnPN8fTnQ/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=WzQnPN8fTnQ' },
];

export const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { idToken } = useContext(AuthContext);

  /**
   * Maps items from the YouTube search endpoint (search.list)
   * to a simplified structure used by the UI.
   */
  const mapYouTubeItems = (items) =>
    items
      .map((it) => {
        const videoId = it?.id?.videoId ?? it?.id;
        const thumbs = it?.snippet?.thumbnails ?? {};
        const thumb =
          thumbs?.high?.url ||
          thumbs?.medium?.url ||
          thumbs?.default?.url ||
          'https://via.placeholder.com/480x270.png?text=No+Thumbnail';

        return {
          id: String(videoId ?? Math.random().toString(36)),
          title: it?.snippet?.title ?? 'Untitled',
          thumbnail: thumb,
          url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
        };
      })
      .filter((v) => v.url); // ensure items have a valid URL

  /**
   * Maps GitHub-like JSON array (docs list) to a simplified structure.
   */
  const mapDocsItems = (jsonArray) =>
    (Array.isArray(jsonArray) ? jsonArray : [])
      .filter((f) => f?.type === 'file')
      .map((f) => {
        const name = f?.name ?? 'Untitled';
        const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : 'file';
        const sizeKB = f?.size ? `${Math.round(f.size / 1024)} KB` : '';
        return {
          id: String(f?.sha ?? f?.path ?? Math.random().toString(36)),
          name,
          type: ext,
          size: sizeKB,
          url: f?.download_url ?? f?.html_url ?? '',
        };
      });

  /**
   * Fallback: get "Most Popular" videos in a region.
   * Cheaper endpoint (videos.list?chart=mostPopular) → ~1 unit per call.
   */
  const getPopularVideos = async ({ regionCode = 'IN', pageSize = 10, pageToken } = {}) => {
    try {
      if (!YOUTUBE_API_KEY) {
        console.warn('[DataContext] Missing YOUTUBE_API_KEY, returning MOCK_VIDEOS from getPopularVideos.');
        return { ok: true, items: MOCK_VIDEOS, nextPageToken: null, hasMore: false, mock: true };
      }

      const url =
        `https://www.googleapis.com/youtube/v3/videos` +
        `?part=snippet` + // keep payload light; add more parts if needed
        `&chart=mostPopular` +
        `&regionCode=${regionCode}` +
        `&maxResults=${pageSize}` +
        (pageToken ? `&pageToken=${pageToken}` : '') +
        `&key=${YOUTUBE_API_KEY}`;

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        const reason = json?.error?.message || `HTTP ${res.status}`;
        console.warn('[DataContext] getPopularVideos failed:', res.status, reason);
        return { ok: false, items: MOCK_VIDEOS, nextPageToken: null, hasMore: false, mock: true, reason };
      }

      const items = Array.isArray(json?.items) ? json.items : [];
      const mapped = items
        .map((it) => {
          const videoId = it?.id;
          const thumbs = it?.snippet?.thumbnails ?? {};
          const thumb =
            thumbs?.high?.url ||
            thumbs?.medium?.url ||
            thumbs?.default?.url ||
            'https://via.placeholder.com/480x270.png?text=No+Thumbnail';
          return {
            id: String(videoId || Math.random().toString(36)),
            title: it?.snippet?.title ?? 'Untitled',
            thumbnail: thumb,
            url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
          };
        })
        .filter((v) => v.url);

      return {
        ok: true,
        items: mapped,
        nextPageToken: json?.nextPageToken ?? null,
        hasMore: Boolean(json?.nextPageToken),
      };
    } catch (e) {
      console.log('[DataContext] getPopularVideos error:', e?.message);
      return { ok: false, items: MOCK_VIDEOS, nextPageToken: null, hasMore: false, mock: true, reason: e?.message };
    }
  };

  /**
   * Primary: search YouTube videos (search.list).
   * When quota exceeded, falls back to getPopularVideos so the UI keeps working.
   */
  const getVideosFirstPage = async ({ query = 'react native tutorials', pageSize = 10 } = {}) => {
    try {
      if (!YOUTUBE_API_KEY) {
        console.warn('[DataContext] Missing YOUTUBE_API_KEY, returning MOCK_VIDEOS from getVideosFirstPage.');
        return { ok: true, items: MOCK_VIDEOS, nextPageToken: null, hasMore: false, mock: true };
      }

      const url =
        `https://www.googleapis.com/youtube/v3/search` +
        `?part=snippet&type=video` +
        `&maxResults=${pageSize}` +
        `&q=${encodeURIComponent(query)}` +
        `&regionCode=IN&relevanceLanguage=en` +
        `&fields=items(id/videoId,snippet/title,snippet/thumbnails),nextPageToken,error` +
        `&key=${YOUTUBE_API_KEY}`;

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        const reason = json?.error?.message || `HTTP ${res.status}`;
        console.warn('[DataContext] YouTube search failed:', res.status, reason);

        const isQuotaExceeded = res.status === 403 && String(reason).toLowerCase().includes('quota');
        if (isQuotaExceeded) {
          // Fallback to popular so user still sees videos
          const fallback = await getPopularVideos({ regionCode: 'IN', pageSize });
          return { ...fallback, reason: 'quota_exceeded_fallback_to_popular' };
        }

        return { ok: false, items: [], nextPageToken: null, hasMore: false, reason };
      }

      const items = Array.isArray(json?.items) ? json.items : [];
      const mapped = mapYouTubeItems(items);

      return {
        ok: true,
        items: mapped,
        nextPageToken: json?.nextPageToken ?? null,
        hasMore: Boolean(json?.nextPageToken),
      };
    } catch (e) {
      console.log('[DataContext] getVideosFirstPage error:', e?.message);
      // Last resort: show mock videos
      return { ok: false, items: MOCK_VIDEOS, nextPageToken: null, hasMore: false, mock: true, reason: e?.message };
    }
  };

  /**
   * Next page for YouTube search; on quota exceeded, falls back to popular first page (no pageToken).
   */
  const getVideosNextPage = async ({ query = 'react native tutorials', pageSize = 10, pageToken }) => {
    try {
      if (!YOUTUBE_API_KEY || !pageToken) {
        return { ok: true, items: [], nextPageToken: null, hasMore: false, mock: !YOUTUBE_API_KEY };
      }

      const url =
        `https://www.googleapis.com/youtube/v3/search` +
        `?part=snippet&type=video` +
        `&maxResults=${pageSize}` +
        `&q=${encodeURIComponent(query)}` +
        `&regionCode=IN&relevanceLanguage=en` +
        `&pageToken=${pageToken}` +
        `&fields=items(id/videoId,snippet/title,snippet/thumbnails),nextPageToken,error` +
        `&key=${YOUTUBE_API_KEY}`;

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        const reason = json?.error?.message || `HTTP ${res.status}`;
        console.warn('[DataContext] YouTube next page failed:', res.status, reason);

        const isQuotaExceeded = res.status === 403 && String(reason).toLowerCase().includes('quota');
        if (isQuotaExceeded) {
          // Popular endpoint doesn't use the same pageToken for search-based pagination.
          // Return first page of popular as a graceful fallback.
          const alt = await getPopularVideos({ regionCode: 'IN', pageSize, pageToken: undefined });
          return { ...alt, reason: 'quota_exceeded_fallback_to_popular' };
        }

        return { ok: false, items: [], nextPageToken: null, hasMore: false, reason };
      }

      const items = Array.isArray(json?.items) ? json.items : [];
      return {
        ok: true,
        items: mapYouTubeItems(items),
        nextPageToken: json?.nextPageToken ?? null,
        hasMore: Boolean(json?.nextPageToken),
      };
    } catch (e) {
      console.log('[DataContext] getVideosNextPage error:', e?.message);
      return { ok: false, items: [], nextPageToken: null, hasMore: false, reason: e?.message };
    }
  };

  /**
   * OpenAlex documents (unchanged, with basic error handling).
   */
  const OPENALEX_ENDPOINT = ({
    search = 'react native',
    perPage = 12,
    page = 1,
  } = {}) =>
    `https://api.openalex.org/works?search=${encodeURIComponent(search)}&filter=open_access.is_oa:true,has_fulltext:true&page=${page}&per_page=${perPage}&mailto=your-email@example.com`;

  const getDocsAll = async ({ query = 'react native', page = 1, pageSize = 12 } = {}) => {
    try {
      const url = OPENALEX_ENDPOINT({ search: query, perPage: pageSize, page });
      const res = await fetch(url);
      console.log('[DataContext] getDocsAll fetch URL:', url);

      if (!res.ok) {
        console.warn('[DataContext] OpenAlex fetch failed:', res.status);
        return { ok: false, items: [], mock: false, reason: `HTTP ${res.status}` };
      }

      const json = await res.json();
      const works = Array.isArray(json?.results) ? json.results : [];

      const items = works
        .map((w) => {
          const locs = [w?.primary_location, ...(w?.locations || [])].filter(Boolean);
          const pdfUrl =
            locs.find((l) => l?.pdf_url)?.pdf_url ||
            locs.find((l) => (l?.landing_page_url || '').toLowerCase().endsWith('.pdf'))?.landing_page_url ||
            '';

          const displayName = w?.display_name || 'Untitled';
          return {
            id: String(w?.id || Math.random().toString(36)),
            name: displayName.endsWith('.pdf') ? displayName : `${displayName}.pdf`,
            type: 'pdf',
            size: '',
            url: pdfUrl,
          };
        })
        .filter((f) => f.url && f.url.toLowerCase().endsWith('.pdf'));

      const hasMore = Boolean(json?.meta?.next_page);
      return { ok: true, items, mock: false, hasMore };
    } catch (e) {
      console.log('[DataContext] getDocsAll (OpenAlex) error:', e?.message);
      return { ok: false, items: [], mock: false, reason: e?.message };
    }
  };

  /**
   * Authorization headers helper (unchanged).
   */
  const withAuthHeaders = (extra = {}) => ({
    'Content-Type': 'application/json',
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    ...extra,
  });

  const value = useMemo(
    () => ({
      getVideosFirstPage,
      getVideosNextPage,
      getPopularVideos, // exposed in case you want to use it directly
      getDocsAll,
      mapYouTubeItems,
      mapDocsItems,
      withAuthHeaders,
    }),
    [idToken]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);


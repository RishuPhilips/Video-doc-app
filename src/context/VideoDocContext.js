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

  const mapYouTubeItems = (items) =>
    items.map((it) => {
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
        url: `https://www.youtube.com/watch?v=${videoId ?? ''}`,
      };
    });

  const mapDocsItems = (jsonArray) =>
    jsonArray
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

  const getVideosFirstPage = async ({ query = 'react native tutorials', pageSize = 10 } = {}) => {
    try {
      if (!YOUTUBE_API_KEY) {
        return { ok: true, items: MOCK_VIDEOS, nextPageToken: null, hasMore: false, mock: true };
      }
      const url =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${pageSize}` +
        `&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      return {
        ok: true,
        items: mapYouTubeItems(items),
        nextPageToken: json?.nextPageToken ?? null,
        hasMore: Boolean(json?.nextPageToken),
      };
    } catch (e) {
      console.log('[DataContext] getVideosFirstPage error:', e?.message);
      return { ok: true, items: MOCK_VIDEOS, nextPageToken: null, hasMore: false, mock: true };
    }
  };


  const getVideosNextPage = async ({ query = 'react native tutorials', pageSize = 10, pageToken }) => {
    try {
      if (!YOUTUBE_API_KEY || !pageToken) {
        return { ok: true, items: [], nextPageToken: null, hasMore: false, mock: !YOUTUBE_API_KEY };
      }
      const url =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${pageSize}` +
        `&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}&pageToken=${pageToken}`;
      const res = await fetch(url);
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      return {
        ok: true,
        items: mapYouTubeItems(items),
        nextPageToken: json?.nextPageToken ?? null,
        hasMore: Boolean(json?.nextPageToken),
      };
    } catch (e) {
      console.log('[DataContext] getVideosNextPage error:', e?.message);
      return { ok: false, items: [], nextPageToken: null, hasMore: false };
    }
  };

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

  const withAuthHeaders = (extra = {}) => ({
    'Content-Type': 'application/json',
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    ...extra,
  });

  const value = useMemo(
    () => ({
      getVideosFirstPage,
      getVideosNextPage,
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

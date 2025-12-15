import React, { createContext, useContext, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { YOUTUBE_API_KEY } from '../constant/constant';

export const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { idToken } = useContext(AuthContext);

  const mapYouTubeItems = (items) =>
    items.map((it) => {
      const videoId = (it && it.id && it.id.videoId) || it?.id;
      const thumbs = (it && it.snippet && it.snippet.thumbnails) || {};
      const thumb =
        (thumbs.high && thumbs.high.url) ||
        (thumbs.medium && thumbs.medium.url) ||
        (thumbs.default && thumbs.default.url) ||
        'https://via.placeholder.com/480x270.png?text=No+Thumbnail';

      return {
        id: String(videoId || Math.random().toString(36)),
        title: (it && it.snippet && it.snippet.title) || 'Untitled',
        thumbnail: thumb,
        url: `https://www.youtube.com/watch?v=${videoId || ''}`,
      };
    });

  const mapDocsItems = (jsonArray) =>
    (Array.isArray(jsonArray) ? jsonArray : [])
      .filter((f) => f && f.type === 'file')
      .map((f) => {
        const name = f && f.name ? f.name : 'Untitled';
        const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : 'file';
        const sizeKB = f && f.size ? `${Math.round(f.size / 1024)} KB` : '';
        return {
          id: String((f && (f.sha || f.path)) || Math.random().toString(36)),
          name,
          type: ext,
          size: sizeKB,
          url: (f && (f.download_url || f.html_url)) || '',
        };
      });

  const getVideosFirstPage = async ({ query = 'react native tutorials', pageSize = 10 } = {}) => {
    try {
      if (!YOUTUBE_API_KEY) {
        return {
          ok: false,
          items: [],
          nextPageToken: null,
          hasMore: false,
          reason: 'Missing YOUTUBE_API_KEY',
        };
      }

      const url =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${pageSize}` +
        `&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        return {
          ok: false,
          items: [],
          nextPageToken: null,
          hasMore: false,
          reason: `HTTP ${res.status}: ${json && json.error && json.error.message ? json.error.message : 'Unknown error'}`,
        };
      }

      const items = Array.isArray(json && json.items) ? json.items : [];
      return {
        ok: true,
        items: mapYouTubeItems(items),
        nextPageToken: (json && json.nextPageToken) || null,
        hasMore: Boolean(json && json.nextPageToken),
      };
    } catch (e) {
      return { ok: false, items: [], nextPageToken: null, hasMore: false, reason: e && e.message };
    }
  };

  const getVideosNextPage = async ({ query = 'react native tutorials', pageSize = 10, pageToken } = {}) => {
    try {
      if (!YOUTUBE_API_KEY) {
        return {
          ok: false,
          items: [],
          nextPageToken: null,
          hasMore: false,
          reason: 'Missing YOUTUBE_API_KEY',
        };
      }
      if (!pageToken) {
        return {
          ok: false,
          items: [],
          nextPageToken: null,
          hasMore: false,
          reason: 'Missing pageToken',
        };
      }

      const url =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${pageSize}` +
        `&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}&pageToken=${pageToken}`;

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        return {
          ok: false,
          items: [],
          nextPageToken: null,
          hasMore: false,
          reason: `HTTP ${res.status}: ${json && json.error && json.error.message ? json.error.message : 'Unknown error'}`,
        };
      }

      const items = Array.isArray(json && json.items) ? json.items : [];
      return {
        ok: true,
        items: mapYouTubeItems(items),
        nextPageToken: (json && json.nextPageToken) || null,
        hasMore: Boolean(json && json.nextPageToken),
      };
    } catch (e) {
      return { ok: false, items: [], nextPageToken: null, hasMore: false, reason: e && e.message };
    }
  };

  const OPENALEX_ENDPOINT = function ({
    search = 'react native',
    perPage = 12,
    page = 1,
  } = {}) {
    return `https://api.openalex.org/works?search=${encodeURIComponent(search)}&filter=open_access.is_oa:true,has_fulltext:true&page=${page}&per_page=${perPage}&mailto=your-email@example.com`;
  };

  const getDocsAll = async ({ query = 'react native', page = 1, pageSize = 12 } = {}) => {
    try {
      const url = OPENALEX_ENDPOINT({ search: query, perPage: pageSize, page });
      const res = await fetch(url);

      if (!res.ok) {
        return { ok: false, items: [], mock: false, reason: `HTTP ${res.status}` };
      }

      const json = await res.json();
      const works = Array.isArray(json && json.results) ? json.results : [];

      const items = works
        .map((w) => {
          const primary = w && w.primary_location;
          const locations = (w && w.locations) || [];
          const locs = [primary].concat(locations).filter(Boolean);

          const pdfUrl =
            (locs.find((l) => l && l.pdf_url) || {}).pdf_url ||
            (locs.find((l) => {
              const u = (l && l.landing_page_url) || '';
              return typeof u === 'string' && u.toLowerCase().endsWith('.pdf');
            }) || {}).landing_page_url ||
            '';

          const displayName = (w && w.display_name) || 'Untitled';
          return {
            id: String((w && w.id) || Math.random().toString(36)),
            name: displayName.endsWith('.pdf') ? displayName : displayName + '.pdf',
            type: 'pdf',
            size: '',
            url: pdfUrl,
          };
        })
        .filter((f) => f.url && typeof f.url === 'string' && f.url.toLowerCase().endsWith('.pdf'));

      const hasMore = Boolean(json && json.meta && json.meta.next_page);
      return { ok: true, items, mock: false, hasMore };
    } catch (e) {
      return { ok: false, items: [], mock: false, reason: e && e.message };
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

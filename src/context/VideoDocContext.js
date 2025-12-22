
import React, { createContext, useContext, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { PEXELS_API_KEY } from '../constant/constant';

export const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { idToken } = useContext(AuthContext);

  const mapPexelsItems = (videos = []) =>
    videos.map((v) => {
      const files = Array.isArray(v?.video_files) ? v.video_files : [];
      const best =
        files.find(
          (f) =>
            f.file_type === 'video/mp4' &&
            (f.quality === 'hd' || (typeof f.width === 'number' && f.width >= 1280))
        ) ||
        files.find((f) => f.file_type === 'video/mp4') ||
        files[0];

      const thumb =
        v?.image ||
        (Array.isArray(v?.video_pictures) && v.video_pictures[0]?.picture) ||
        'https://via.placeholder.com/480x270.png?text=No+Thumbnail';

      const title =
        (v?.user?.name && `Video by ${v.user.name}`) ||
        (typeof v?.id !== 'undefined' ? `Video #${v.id}` : 'Untitled');

      return {
        id: String(v?.id ?? Math.random().toString(36)),
        title,
        thumbnail: thumb,
        url: best?.link || v?.url || '',
      };
    });

  /**
   * Documents mapping (unchanged)
   */
  const mapDocsItems = (jsonArray) =>
    (Array.isArray(jsonArray) ? jsonArray : [])
      .filter((f) => f && f.type === 'file')
      .map((f) => {
        const name = f?.name ? f.name : 'Untitled';
        const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : 'file';
        const sizeKB = f?.size ? `${Math.round(f.size / 1024)} KB` : '';
        return {
          id: String(f?.sha || f?.path || Math.random().toString(36)),
          name,
          type: ext,
          size: sizeKB,
          url: f?.download_url || f?.html_url || '',
        };
      });

  /**
   * Pexels first page:
   * - Uses /videos/search with page=1 and per_page=pageSize
   * - We compute hasMore via total_results or by whether items === pageSize
   * - nextPageToken = '2' (string) if there are more results
   */
  const getVideosFirstPage = async ({ query = 'react native', pageSize = 10 } = {}) => {
    try {
      if (!PEXELS_API_KEY) {
        return {
          ok: false,
          items: [],
          nextPageToken: null,
          hasMore: false,
          reason: 'Missing PEXELS_API_KEY',
        };
      }

      const page = 1;
      const url =
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}` +
        `&per_page=${pageSize}&page=${page}`;
        console.log('Fetching Pexels videos from URL:', url);

      const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
      const json = await res.json();

      if (!res.ok) {
        return {
          ok: false,
          items: [],
          nextPageToken: null,
          hasMore: false,
          reason: `HTTP ${res.status}: ${json?.error || 'Unknown error'}`,
        };
      }

      const videos = Array.isArray(json?.videos) ? json.videos : [];
      const items = mapPexelsItems(videos);

      const total = typeof json?.total_results === 'number' ? json.total_results : null;
      const hasMore =
        total != null ? page * pageSize < total : items.length === pageSize;

      return {
        ok: true,
        items,
        nextPageToken: hasMore ? String(page + 1) : null, // token is the next page number
        hasMore,
      };
    } catch (e) {
      return { ok: false, items: [], nextPageToken: null, hasMore: false, reason: e?.message };
    }
  };

  /**
   * Pexels next page:
   * - Accepts pageToken (string/number) and treats it as the next `page`
   * - Same endpoint as first page, with the provided page number
   */
  const getVideosNextPage = async ({
    query = 'react native',
    pageSize = 10,
    pageToken,
  } = {}) => {
    try {
      if (!PEXELS_API_KEY) {
        return {
          ok: false,
          items: [],
          nextPageToken: null,
          hasMore: false,
          reason: 'Missing PEXELS_API_KEY',
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

      const page = Number(pageToken) || 2;
      const url =
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}` +
        `&per_page=${pageSize}&page=${page}`;

      const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
      const json = await res.json();

      if (!res.ok) {
        return {
          ok: false,
          items: [],
          nextPageToken: null,
          hasMore: false,
          reason: `HTTP ${res.status}: ${json?.error || 'Unknown error'}`,
        };
      }

      const videos = Array.isArray(json?.videos) ? json.videos : [];
      const items = mapPexelsItems(videos);

      const total = typeof json?.total_results === 'number' ? json.total_results : null;
      const hasMore =
        total != null ? page * pageSize < total : items.length === pageSize;

      return {
        ok: true,
        items,
        nextPageToken: hasMore ? String(page + 1) : null,
        hasMore,
      };
    } catch (e) {
      return { ok: false, items: [], nextPageToken: null, hasMore: false, reason: e?.message };
    }
  };

  /**
   * (Unchanged) OpenAlex endpoint & docs retrieval
   */
  const OPENALEX_ENDPOINT = function ({
    search = 'react native',
    perPage = 12,
    page = 1,
  } = {}) {
    return `https://api.openalex.org/works?search=${encodeURIComponent(
      search
    )}&filter=open_access.is_oa:true,has_fulltext:true&page=${page}&per_page=${perPage}&mailto=your-email@example.com`;
  };

  const getDocsAll = async ({ query = 'react native', page = 1, pageSize = 12 } = {}) => {
    try {
      const url = OPENALEX_ENDPOINT({ search: query, perPage: pageSize, page });
      const res = await fetch(url);

      if (!res.ok) {
        return { ok: false, items: [], mock: false, reason: `HTTP ${res.status}` };
      }

      const json = await res.json();
      const works = Array.isArray(json?.results) ? json.results : [];

      const items = works
        .map((w) => {
          const primary = w?.primary_location;
          const locations = w?.locations || [];
          const locs = [primary].concat(locations).filter(Boolean);

          const pdfUrl =
            (locs.find((l) => l?.pdf_url) || {}).pdf_url ||
            (locs.find((l) => {
              const u = l?.landing_page_url || '';
              return typeof u === 'string' && u.toLowerCase().endsWith('.pdf');
            }) || {}).landing_page_url ||
            '';

          const displayName = w?.display_name || 'Untitled';
          return {
            id: String(w?.id || Math.random().toString(36)),
            name: displayName.endsWith('.pdf') ? displayName : displayName + '.pdf',
            type: 'pdf',
            size: '',
            url: pdfUrl,
          };
        })
        .filter((f) => f.url && typeof f.url === 'string' && f.url.toLowerCase().endsWith('.pdf'));

      const hasMore = Boolean(json?.meta?.next_page);
      return { ok: true, items, mock: false, hasMore };
    } catch (e) {
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
      mapPexelsItems, // exposed for custom uses
      mapDocsItems,
      withAuthHeaders,
    }),
    [idToken]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);

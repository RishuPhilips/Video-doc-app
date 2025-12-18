
// helpers/youtubeResolver.js
import ytdl from 'react-native-ytdl';

/** Extract 11-char YouTube ID from URL or raw ID */
export function extractYoutubeId(idOrUrl) {
  if (!idOrUrl) return null;
  const s = String(idOrUrl);
  if (/^[\w-]{11}$/.test(s)) return s;
  const m1 = s.match(/[?&]v=([^&]+)/);
  const m2 = s.match(/youtu\.be\/([^?]+)/);
  return (m1 && m1[1]) || (m2 && m2[1]) || null;
}

function isHls(fmt) {
  return (
    fmt?.isHLS === true ||
    String(fmt?.mimeType || '').includes('application/x-mpegURL') ||
    String(fmt?.url || '').includes('.m3u8')
  );
}
function isMp4(fmt) {
  return String(fmt?.mimeType || '').includes('video/mp4');
}
function hasAudio(fmt) {
  // YouTube progressive formats have audio+video. Adaptive may be video-only or audio-only.
  // Some fields: audioChannels, audioQuality; presence implies audio track.
  return fmt?.audioChannels > 0 || !!fmt?.audioQuality || fmt?.hasAudio === true;
}
function hasVideo(fmt) {
  return fmt?.qualityLabel || fmt?.width || fmt?.height || fmt?.hasVideo === true;
}
function getHeight(fmt) {
  // Try height or parse from qualityLabel "720p"
  if (fmt?.height) return fmt.height;
  const m = String(fmt?.qualityLabel || '').match(/(\d+)p/);
  return m ? Number(m[1]) : 0;
}

/**
 * Pick the best audio+video format. Strategy:
 * 1) Prefer HLS with audio+video if requested (good for ExoPlayer/AVPlayer).
 * 2) Prefer MP4 progressive (itag 22/18 etc.) with audio+video, highest height.
 * 3) Fallback to ytdl.chooseFormat('audioandvideo').
 */
function chooseBestPlayable(formats, { preferHls = true, minHeight = 360 }) {
  const muxed = formats.filter((f) => hasAudio(f) && hasVideo(f));

  // Prefer HLS (if available) at/above minHeight
  if (preferHls) {
    const hlsSorted = muxed
      .filter((f) => isHls(f) && getHeight(f) >= minHeight)
      .sort((a, b) => getHeight(b) - getHeight(a));
    if (hlsSorted[0]) return hlsSorted[0];
  }

  // Prefer MP4 progressive (muxed)
  const mp4Sorted = muxed
    .filter((f) => isMp4(f))
    .sort((a, b) => getHeight(b) - getHeight(a));
  if (mp4Sorted[0]) return mp4Sorted[0];

  // Fallback: any muxed
  const anyMuxedSorted = muxed.sort((a, b) => getHeight(b) - getHeight(a));
  if (anyMuxedSorted[0]) return anyMuxedSorted[0];

  // Absolute fallback: let ytdl pick the highest muxed format
  const picked =
    ytdl.chooseFormat(formats, {
      quality: 'highest',
      filter: 'audioandvideo',
    }) ||
    ytdl.chooseFormat(formats, {
      quality: 'highest',
      filter: 'videoandaudio',
    });

  return picked || null;
}

/**
 * Resolve a playable stream for react-native-video
 * Returns: { url, isHls, height, mimeType, itag }
 */
export async function resolveYoutubeStream(idOrUrl, options = {}) {
  const { preferHls = true, minHeight = 360 } = options;
  const id = extractYoutubeId(idOrUrl);
  if (!id) throw new Error('INVALID_YOUTUBE_ID');

  // Fetch video info (react-native-ytdl handles deciphering signatureCipher internally)
  const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
  const formats = info?.formats || [];
  if (!formats.length) throw new Error('NO_FORMATS');

  // First pass
  let fmt = chooseBestPlayable(formats, { preferHls, minHeight });

  // If chosen fmt has no direct URL (rare), attempt alternative passes
  if (!fmt?.url) {
    // Try with different preferences
    fmt = chooseBestPlayable(formats, { preferHls: !preferHls, minHeight: 144 });
  }
  if (!fmt?.url) throw new Error('NO_PLAYABLE_FORMAT');

  return {
    url: fmt.url,
    isHls: isHls(fmt),
    height: getHeight(fmt),
    mimeType: fmt.mimeType,
    itag: fmt.itag,
  };
}
``

import ytdl from 'react-native-ytdl';

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
  return fmt?.audioChannels > 0 || !!fmt?.audioQuality || fmt?.hasAudio === true;
}
function hasVideo(fmt) {
  return fmt?.qualityLabel || fmt?.width || fmt?.height || fmt?.hasVideo === true;
}
function getHeight(fmt) {
  if (fmt?.height) return fmt.height;
  const m = String(fmt?.qualityLabel || '').match(/(\d+)p/);
  return m ? Number(m[1]) : 0;
}

function chooseBestPlayable(formats, { preferHls = true, minHeight = 360 }) {
  const muxed = formats.filter((f) => hasAudio(f) && hasVideo(f));

 
  if (preferHls) {
    const hlsSorted = muxed
      .filter((f) => isHls(f) && getHeight(f) >= minHeight)
      .sort((a, b) => getHeight(b) - getHeight(a));
    if (hlsSorted[0]) return hlsSorted[0];
  }

  const mp4Sorted = muxed
    .filter((f) => isMp4(f))
    .sort((a, b) => getHeight(b) - getHeight(a));
  if (mp4Sorted[0]) return mp4Sorted[0];

  const anyMuxedSorted = muxed.sort((a, b) => getHeight(b) - getHeight(a));
  if (anyMuxedSorted[0]) return anyMuxedSorted[0];

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

export async function resolveYoutubeStream(idOrUrl, options = {}) {
  const { preferHls = true, minHeight = 360 } = options;
  const id = extractYoutubeId(idOrUrl);
  if (!id) throw new Error('INVALID_YOUTUBE_ID');

  const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
  const formats = info?.formats || [];
  if (!formats.length) throw new Error('NO_FORMATS');

  let fmt = chooseBestPlayable(formats, { preferHls, minHeight });

  if (!fmt?.url) {
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


// Vercel Serverless Function: High-Speed YouTube Playlist Tracks Resolver
const playlistMemCache = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing playlist id' });
  }

  const playlistId = id.trim();
  const browseId = playlistId.startsWith('VL') ? playlistId : 'VL' + playlistId;

  // 1. Fast in-memory edge cache lookup
  if (playlistMemCache.has(playlistId)) {
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json(playlistMemCache.get(playlistId));
  }

  try {
    const ytRes = await fetch('https://www.youtube.com/youtubei/v1/browse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': '2.20240101.00.00'
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.00.00',
            hl: 'en',
            gl: 'US'
          }
        },
        browseId
      })
    });

    if (!ytRes.ok) {
      return res.status(500).json({ error: 'Failed to fetch playlist' });
    }

    const json = await ytRes.json();
    
    // Extract Header metadata
    const header = json.header?.playlistHeaderRenderer;
    const title = header?.title?.simpleText || json.metadata?.playlistMetadataRenderer?.title || 'YouTube Playlist';
    const author = header?.ownerText?.runs?.[0]?.text || 'YouTube Music';
    const trackCount = header?.numVideosText?.runs?.[0]?.text || '';
    const thumb = header?.playlistHeaderBanner?.sources?.slice(-1)[0]?.url ||
                  header?.heroDetails?.imageBannerViewModel?.image?.sources?.slice(-1)[0]?.url ||
                  `https://i.ytimg.com/vi/${playlistId}/hqdefault.jpg`;

    // Deep extractor to collect all video/track items regardless of YouTube nesting
    const extractItems = (obj, collected = [], seen = new Set()) => {
      if (!obj || typeof obj !== 'object') return collected;
      if (obj.lockupViewModel && obj.lockupViewModel.contentId && obj.lockupViewModel.contentId.length === 11) {
        if (!seen.has(obj.lockupViewModel.contentId)) {
          seen.add(obj.lockupViewModel.contentId);
          collected.push({ lockupViewModel: obj.lockupViewModel });
        }
        return collected;
      }
      if (obj.playlistVideoRenderer && obj.playlistVideoRenderer.videoId && obj.playlistVideoRenderer.videoId.length === 11) {
        if (!seen.has(obj.playlistVideoRenderer.videoId)) {
          seen.add(obj.playlistVideoRenderer.videoId);
          collected.push({ playlistVideoRenderer: obj.playlistVideoRenderer });
        }
        return collected;
      }
      if (Array.isArray(obj)) {
        for (const el of obj) extractItems(el, collected, seen);
      } else {
        for (const k of Object.keys(obj)) {
          if (k !== 'responseContext' && k !== 'frameworkUpdates' && k !== 'topbar') {
            extractItems(obj[k], collected, seen);
          }
        }
      }
      return collected;
    };

    const rawItems = extractItems(json.contents);

    const songs = [];
    for (const it of rawItems) {
      // 1. Lockup view model (modern format)
      if (it.lockupViewModel) {
        const m = it.lockupViewModel;
        const videoId = m.contentId;
        if (videoId && videoId.length === 11) {
          const meta = m.metadata?.lockupMetadataViewModel;
          const sTitle = meta?.title?.content || 'Track';
          const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];
          const artist = rows[0]?.metadataParts?.[0]?.text?.content || author || 'Artist';
          const durBadge = m.contentImage?.thumbnailViewModel?.overlays?.[0]?.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.text;
          const durText = rows[1]?.metadataParts?.[0]?.text?.content;
          const dur = (durBadge && durBadge.includes(':')) ? durBadge : ((durText && durText.includes(':')) ? durText : '');
          const sThumb = m.contentImage?.thumbnailViewModel?.image?.sources?.slice(-1)[0]?.url ||
                         m.contentImage?.thumbnail?.sources?.slice(-1)[0]?.url ||
                         `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

          songs.push({
            type: 'SONG',
            videoId,
            name: sTitle,
            artist: { name: artist },
            duration: dur,
            views: '',
            thumbnails: [{ url: sThumb }]
          });
        }
      } 
      // 2. Playlist video renderer (classic format)
      else if (it.playlistVideoRenderer) {
        const v = it.playlistVideoRenderer;
        if (v.videoId && v.videoId.length === 11) {
          const sTitle = v.title?.runs?.map((r) => r.text).join('') || v.title?.simpleText || 'Track';
          const artist = v.shortBylineText?.runs?.map((r) => r.text).join('') || author || 'Artist';
          const dur = v.lengthText?.simpleText || '';
          const sThumb = v.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

          songs.push({
            type: 'SONG',
            videoId: v.videoId,
            name: sTitle,
            artist: { name: artist },
            duration: dur,
            views: '',
            thumbnails: [{ url: sThumb }]
          });
        }
      }
    }

    const payload = {
      playlist: {
        id: playlistId,
        title,
        author,
        trackCount: trackCount || `${songs.length} tracks`,
        thumbnail: songs[0]?.thumbnails?.[0]?.url || thumb,
        songs
      }
    };

    if (songs.length > 0) {
      if (playlistMemCache.size > 200) {
        playlistMemCache.clear();
      }
      playlistMemCache.set(playlistId, payload);
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json(payload);
  } catch (err) {
    console.error('Playlist resolve error:', err);
    return res.status(500).json({ error: 'Failed to resolve playlist' });
  }
}

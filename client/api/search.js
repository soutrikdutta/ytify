// Vercel Serverless Function: High-Speed Innertube YouTube & YouTube Music Search
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing search query' });
  }

  const query = q.trim();

  const searchYouTube = async (searchQuery) => {
    try {
      const innertubeRes = await fetch('https://www.youtube.com/youtubei/v1/search', {
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
          query: searchQuery
        })
      });

      if (!innertubeRes.ok) return [];
      const json = await innertubeRes.json();
      const sections =
        json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

      const songs = [];
      for (const section of sections) {
        const items = section?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const v = item.videoRenderer;
          // Strictly verify 11-character valid YouTube Video ID
          if (v && v.videoId && v.videoId.length === 11) {
            const title =
              v.title?.runs?.map((r) => r.text).join('') || v.title?.simpleText || 'Unknown Title';
            const artist =
              v.ownerText?.runs?.[0]?.text ||
              v.longBylineText?.runs?.[0]?.text ||
              'Artist';
            const duration = v.lengthText?.simpleText || '';
            const views = v.viewCountText?.simpleText || v.shortViewCountText?.simpleText || '';
            const thumb =
              v.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
              `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

            const isLongMix = () => {
              if (!duration) return false;
              const parts = duration.split(':');
              return parts.length > 2 || parseInt(parts[0], 10) > 10;
            };

            const isExplicitLongSearch = query.toLowerCase().includes('mix') || 
                                          query.toLowerCase().includes('podcast') || 
                                          query.toLowerCase().includes('album') || 
                                          query.toLowerCase().includes('setlist');

            // If user did not specifically search for a mix/podcast/album, skip multi-hour compilations
            if (isLongMix() && !isExplicitLongSearch) {
              continue;
            }

            songs.push({
              type: 'SONG',
              videoId: v.videoId,
              name: title,
              artist: { name: artist },
              duration: duration,
              views: views,
              thumbnails: [{ url: thumb }]
            });
          }
        }
      }
      return songs;
    } catch {
      return [];
    }
  };

  const searchPlaylists = async (searchQuery) => {
    try {
      const innertubeRes = await fetch('https://www.youtube.com/youtubei/v1/search', {
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
          query: searchQuery,
          params: 'EgIQAw%3D%3D' // Filter specifically for pure YouTube playlists
        })
      });

      if (!innertubeRes.ok) return [];
      const json = await innertubeRes.json();
      const sections =
        json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

      const playlists = [];
      const seen = new Set();

      for (const section of sections) {
        const items = section?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          // Format 1: lockupViewModel
          if (item.lockupViewModel) {
            const l = item.lockupViewModel;
            const id = l.contentId;
            if (!id || seen.has(id)) continue;

            const title = l.metadata?.lockupMetadataViewModel?.title?.content;
            const rows = l.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
            const author = rows[0]?.metadataParts?.[0]?.text?.content || 'YouTube';
            const badge = l.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.overlays?.[0]?.thumbnailOverlayBadgeViewModel?.thumbnailBadges?.[0]?.thumbnailBadgeViewModel?.text;
            const trackCount = badge || 'Playlist';
            const thumb = l.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources?.slice(-1)[0]?.url ||
                          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

            if (title) {
              seen.add(id);
              playlists.push({
                type: 'PLAYLIST',
                id,
                title,
                author,
                trackCount,
                thumbnail: thumb
              });
            }
          }
          // Format 2: playlistRenderer
          else if (item.playlistRenderer) {
            const p = item.playlistRenderer;
            const id = p.playlistId;
            if (!id || seen.has(id)) continue;

            const title = p.title?.simpleText || p.title?.runs?.map((r) => r.text).join('');
            const author = p.longBylineText?.runs?.map((r) => r.text).join('') || p.shortBylineText?.runs?.map((r) => r.text).join('') || 'YouTube';
            const trackCount = p.videoCount || (p.videoCountText?.runs?.map((r) => r.text).join('')) || 'Playlist';
            const thumb = p.thumbnails?.[0]?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

            if (title) {
              seen.add(id);
              playlists.push({
                type: 'PLAYLIST',
                id,
                title,
                author,
                trackCount: trackCount.includes('video') ? trackCount : `${trackCount} tracks`,
                thumbnail: thumb
              });
            }
          }
        }
      }
      return playlists;
    } catch {
      return [];
    }
  };

  // 1. Fetch both songs and real YouTube playlists simultaneously
  let [songs, playlists] = await Promise.all([
    searchYouTube(query),
    searchPlaylists(query)
  ]);

  // 2. If songs empty, retry with relaxed search
  if (songs.length === 0) {
    songs = await searchYouTube(`${query} music`);
  }
  if (songs.length === 0) {
    songs = await searchYouTube(`${query} song`);
  }

  // 3. If playlists empty, retry with query + playlist
  if (playlists.length === 0) {
    playlists = await searchPlaylists(`${query} songs playlist`);
  }

  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
  return res.status(200).json({ songs, playlists });
}

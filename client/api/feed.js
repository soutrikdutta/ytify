// Vercel Serverless Function: Ultra-Fast Personalized YouTube Music Feed Generator

// Server-side in-memory cache for ultra-low latency (<20ms)
const moodCache = new Map();
const MOOD_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const MOOD_QUERIES = {
  'Romance': 'Bollywood Romantic Hindi songs',
  'Feel good': 'Feel good upbeat Hindi songs',
  'Party': 'Bollywood party dance songs',
  'Relax': 'Relaxing acoustic Hindi songs',
  'Commute': 'Travel road trip Hindi songs',
  'Sad': 'Sad emotional Hindi songs',
  'Sleep': 'Peaceful sleep calm acoustic songs',
  'Energize': 'Energetic gym workout pump up songs',
  'Workout': 'Gym workout motivation songs'
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { artists, mood } = req.query;

  // Ultra-fast YouTube Music official search (returns genuine individual song tracks, 0 jukeboxes)
  const searchYTM = async (query, limit = 12) => {
    try {
      const resp = await fetch('https://music.youtube.com/youtubei/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'X-YouTube-Client-Name': '67',
          'X-YouTube-Client-Version': '1.20240101.00.00'
        },
        body: JSON.stringify({
          context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20240101.00.00', hl: 'en', gl: 'IN' } },
          query,
          params: 'Eg-KAQwIARAAGAAgACgAMABqChAEEAMQCRAFEAo%3D' // Strictly SONGS only
        })
      });
      if (!resp.ok) return [];
      const json = await resp.json();
      const shelf = json.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer?.contents || [];
      const songs = [];
      for (const item of shelf) {
        if (songs.length >= limit) break;
        const r = item.musicResponsiveListItemRenderer;
        if (!r) continue;
        const titleRuns = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const title = titleRuns.map(x => x.text).join('') || 'Unknown';
        const artistRuns = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const artist = artistRuns[0]?.text || 'Artist';
        const videoId = r.playlistItemData?.videoId || r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
        if (!videoId || videoId.length !== 11) continue;
        
        const thumb = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        const duration = artistRuns.find(x => x.text && x.text.includes(':'))?.text?.trim() || '3:30';
        songs.push({
          type: 'SONG',
          videoId,
          name: title,
          artist: { name: artist },
          duration,
          thumbnails: [{ url: thumb }]
        });
      }
      return songs;
    } catch {
      return [];
    }
  };

  const fetchBrowsePlaylist = async (browseId, limit = 10) => {
    try {
      const resp = await fetch('https://www.youtube.com/youtubei/v1/browse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'X-YouTube-Client-Name': '1',
          'X-YouTube-Client-Version': '2.20240101.00.00'
        },
        body: JSON.stringify({
          context: { client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'en', gl: 'US' } },
          browseId
        })
      });
      if (!resp.ok) return [];
      const json = await resp.json();
      const rawItems = json.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
      const songs = [];
      for (const it of rawItems) {
        if (songs.length >= limit) break;
        if (it.lockupViewModel) {
          const m = it.lockupViewModel;
          const videoId = m.contentId;
          if (videoId && videoId.length === 11) {
            const meta = m.metadata?.lockupMetadataViewModel;
            const title = meta?.title?.content || 'Track';
            const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];
            const artist = rows[0]?.metadataParts?.[0]?.text?.content || 'Artist';
            const thumb = m.contentImage?.thumbnail?.sources?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            songs.push({
              type: 'SONG',
              videoId,
              name: title,
              artist: { name: artist },
              duration: '3:30',
              views: '',
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

  const searchInnertube = async (query, limit = 8) => {
    try {
      const resp = await fetch('https://www.youtube.com/youtubei/v1/search', {
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
              gl: 'IN'
            }
          },
          query,
          params: query.toLowerCase().includes('podcast') ? undefined : 'EgIQAQ%3D%3D'
        })
      });

      if (!resp.ok) return [];
      const json = await resp.json();
      const sections =
        json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

      const songs = [];
      const isPodcastQuery = query.toLowerCase().includes('podcast');

      for (const section of sections) {
        const items = section?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const v = item.videoRenderer;
          if (v && v.videoId && v.videoId.length === 11 && songs.length < limit) {
            const duration = v.lengthText?.simpleText || '';
            const title =
              v.title?.runs?.map((r) => r.text).join('') || v.title?.simpleText || 'Unknown';
            const lowerTitle = title.toLowerCase();

            // Intelligent song filtering: bypass continuous jukeboxes & multi-hour mixes
            if (!isPodcastQuery) {
              if (
                lowerTitle.includes('jukebox') ||
                lowerTitle.includes('non stop') ||
                lowerTitle.includes('full album') ||
                lowerTitle.includes('playlist')
              ) {
                continue;
              }
              if (duration) {
                const parts = duration.split(':');
                if (parts.length > 2 || parseInt(parts[0], 10) > 10) {
                  continue;
                }
              }
            }

            const artist =
              v.ownerText?.runs?.[0]?.text ||
              v.longBylineText?.runs?.[0]?.text ||
              'Artist';
            const views = v.viewCountText?.simpleText || v.shortViewCountText?.simpleText || '';
            const thumb =
              v.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
              `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

            songs.push({
              type: 'SONG',
              videoId: v.videoId,
              name: title,
              artist: { name: artist },
              duration,
              views,
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

  // 1. Mood specific category requested
  if (mood && mood !== 'All') {
    // Check in-memory cache
    const cached = moodCache.get(mood);
    if (cached && Date.now() - cached.timestamp < MOOD_CACHE_TTL) {
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json(cached.data);
    }

    let songs = [];
    if (mood === 'Podcasts') {
      songs = await searchInnertube('Popular Music Podcasts', 12);
    } else {
      const q = MOOD_QUERIES[mood] || `${mood} songs`;
      songs = await searchYTM(q, 12);
      // Fallback if searchYTM returned nothing
      if (!songs || songs.length === 0) {
        songs = await searchInnertube(`${q} official video`, 12);
      }
    }

    const payload = {
      sections: [
        {
          title: `${mood} Highlights`,
          items: songs
        }
      ]
    };

    if (songs.length > 0) {
      moodCache.set(mood, { timestamp: Date.now(), data: payload });
    }

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(payload);
  }

  // 2. Personalized Feed based on user artist seeds
  let artistList = [];
  if (typeof artists === 'string' && artists.trim()) {
    artistList = artists.split(',').map((a) => a.trim()).filter(Boolean);
  }

  if (artistList.length > 0) {
    const a1 = artistList[0];
    const a2 = artistList[1] || artistList[0];
    const a3 = artistList[2] || artistList[0];

    // Parallel fetch with sub-second resolution
    const [quickPicks, shelf1, shelf2] = await Promise.all([
      searchInnertube(`${artistList.slice(0, 3).join(' ')} official audio`, 8),
      searchInnertube(`${a1} official audio`, 8),
      searchInnertube(`${a2} song`, 8)
    ]);

    const sections = [];
    if (quickPicks.length > 0) {
      sections.push({
        title: 'Quick Picks: Mixed For You',
        items: quickPicks
      });
    }
    if (shelf1.length > 0) {
      sections.push({
        title: `Inspired by ${a1}`,
        items: shelf1
      });
    }
    if (shelf2.length > 0) {
      sections.push({
        title: `More from ${a2}`,
        items: shelf2
      });
    }

    if (sections.length > 0) {
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ sections });
    }
  }

  // 3. Fallback: Official Global Music Charts from YouTube Music
  const [globalTrending, globalTop50] = await Promise.all([
    fetchBrowsePlaylist('VLPL4fGSI1pDJn6t3TXLGiiJdD-sZbrG3tG0', 10),
    fetchBrowsePlaylist('VLPLrEnWoR732-BHrPp_Pm8_VleD68f9n14-', 10)
  ]);

  const fallbackSections = [
    {
      title: 'Quick Picks: Global Hits',
      items: globalTrending.length > 0 ? globalTrending : await searchInnertube('Popular hit songs music video', 8)
    },
    {
      title: 'Worldwide Top 50',
      items: globalTop50.length > 0 ? globalTop50 : await searchInnertube('Today Top Hits official video', 8)
    }
  ];

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).json({ sections: fallbackSections });
}
// Vercel Serverless Function: Ultra-Fast Personalized YouTube Music Feed Generator
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { artists, mood } = req.query;

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
              gl: 'US'
            }
          },
          query
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
    const query = mood === 'Podcasts' ? 'Popular Music Podcasts' : `${mood} Hits Songs Music`;
    const songs = await searchInnertube(query, 12);
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      sections: [
        {
          title: `${mood} Highlights`,
          items: songs
        }
      ]
    });
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

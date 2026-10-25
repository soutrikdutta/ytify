// Vercel Serverless Function: Official Live YouTube Music Trending & Charts
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { chart } = req.query;
  const chartType = chart || 'trending';

  // Map category IDs to YouTube's official live Charts playlists
  const playlistMap = {
    trending: 'VLPL4fGSI1pDJn6t3TXLGiiJdD-sZbrG3tG0', // Daily Top Music Videos - Global (Live Trending)
    charts: 'VLPL4fGSI1pDJn5kI81J1fYWK5eZRl1zJ5kM',   // Top 100 Music Videos Global
    global50: 'VLPLrEnWoR732-BHrPp_Pm8_VleD68f9n14-', // Global Top 50 Hits
    new: 'VLPL4fGSI1pDJn69On1f-8NAvX_CYlx7QyZc',       // New Music Releases Global
  };

  const browseId = playlistMap[chartType];

  try {
    if (browseId) {
      const ytRes = await fetch('https://www.youtube.com/youtubei/v1/browse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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

      if (ytRes.ok) {
        const json = await ytRes.json();
        const rawItems = json.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

        const songs = [];
        for (const item of rawItems) {
          // Handle modern lockupViewModel
          if (item.lockupViewModel) {
            const m = item.lockupViewModel;
            const videoId = m.contentId;
            if (videoId && videoId.length === 11) {
              const meta = m.metadata?.lockupMetadataViewModel;
              const title = meta?.title?.content || 'Trending Song';
              const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];
              const artist = rows[0]?.metadataParts?.[0]?.text?.content || 'YouTube Music';
              const views = rows[1]?.metadataParts?.[0]?.text?.content || '';

              // Extract duration from accessibility label e.g. "3 minutes, 37 seconds"
              const accLabel = m.rendererContext?.accessibilityContext?.label || '';
              const durMatch = accLabel.match(/(\d+)\s+minutes?,\s+(\d+)\s+seconds?/);
              let duration = '';
              if (durMatch) {
                duration = `${durMatch[1]}:${durMatch[2].padStart(2, '0')}`;
              }

              songs.push({
                type: 'SONG',
                videoId,
                name: title,
                artist: { name: artist },
                duration,
                views,
                thumbnails: [
                  { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` },
                  { url: `https://i.ytimg.com/vi/${videoId}/hq720.jpg` }
                ]
              });
            }
          } else if (item.playlistVideoRenderer) {
            const v = item.playlistVideoRenderer;
            if (v.videoId && v.videoId.length === 11) {
              const title = v.title?.runs?.map(r => r.text).join('') || v.title?.simpleText || 'Trending Song';
              const artist = v.shortBylineText?.runs?.map(r => r.text).join('') || 'YouTube Music';
              const duration = v.lengthText?.simpleText || '';
              songs.push({
                type: 'SONG',
                videoId: v.videoId,
                name: title,
                artist: { name: artist },
                duration,
                views: '',
                thumbnails: [{ url: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` }]
              });
            }
          }
        }

        if (songs.length > 0) {
          res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
          return res.status(200).json({ chart: chartType, songs });
        }
      }
    }

    // Fallback: Query live YouTube search for trending/charts
    const fallbackQueries = {
      trending: 'Trending Music Videos official audio',
      charts: 'Top 100 Music Videos Global Charts',
      global50: 'Top 50 Songs Global Hits',
      new: 'New Music Releases Official Video 2026',
      podcasts: 'Popular Music Podcasts Full Episodes'
    };
    const searchQuery = fallbackQueries[chartType] || 'Trending Music';

    const searchRes = await fetch('https://www.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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

    if (searchRes.ok) {
      const json = await searchRes.json();
      const sections = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      const songs = [];
      for (const sec of sections) {
        const items = sec?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const v = item.videoRenderer;
          if (v && v.videoId && v.videoId.length === 11 && songs.length < 50) {
            const title = v.title?.runs?.map(r => r.text).join('') || v.title?.simpleText || 'Trending Song';
            const artist = v.ownerText?.runs?.[0]?.text || 'YouTube Music';
            const duration = v.lengthText?.simpleText || '';
            const views = v.viewCountText?.simpleText || '';
            songs.push({
              type: 'SONG',
              videoId: v.videoId,
              name: title,
              artist: { name: artist },
              duration,
              views,
              thumbnails: [{ url: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` }]
            });
          }
        }
      }
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ chart: chartType, songs });
    }

    res.status(200).json({ chart: chartType, songs: [] });
  } catch (err) {
    console.error('Trending fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch live YouTube charts', songs: [] });
  }
}

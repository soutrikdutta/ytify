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

  // 1. Direct search with exact query
  let songs = await searchYouTube(query);

  // 2. If uncommon query returns 0 results, retry with relaxed music search
  if (songs.length === 0) {
    songs = await searchYouTube(`${query} music`);
  }

  // 3. Fallback to broad search if still empty
  if (songs.length === 0) {
    songs = await searchYouTube(`${query} song`);
  }

  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
  return res.status(200).json({ songs });
}

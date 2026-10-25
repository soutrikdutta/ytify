// Vercel Serverless Function: High-Speed Innertube YouTube Watch-Next / Related Songs Engine
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { videoId } = req.query;
  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'Missing videoId' });
  }

  const cleanVideoId = videoId.trim();

  try {
    const innertubeRes = await fetch('https://www.youtube.com/youtubei/v1/next', {
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
        videoId: cleanVideoId
      })
    });

    if (!innertubeRes.ok) {
      return res.status(200).json({ songs: [] });
    }

    const data = await innertubeRes.json();
    const results = data.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results || [];

    const songs = [];
    const seen = new Set([cleanVideoId]);

    for (const r of results) {
      let vid = '';
      let name = '';
      let artist = '';
      let thumb = '';
      let duration = '';

      if (r.compactVideoRenderer) {
        const cv = r.compactVideoRenderer;
        vid = cv.videoId;
        name = cv.title?.simpleText || cv.title?.runs?.[0]?.text;
        artist = cv.shortBylineText?.runs?.[0]?.text || 'Artist';
        thumb = cv.thumbnail?.thumbnails?.slice(-1)[0]?.url;
        duration = cv.lengthText?.simpleText || '';
      } else if (r.lockupViewModel) {
        const lm = r.lockupViewModel;
        vid = lm.contentId;
        name = lm.metadata?.lockupMetadataViewModel?.title?.content;
        artist = lm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || 'Artist';
        thumb = lm.contentImage?.thumbnailViewModel?.image?.sources?.slice(-1)[0]?.url;
      }

      // Skip invalid IDs, duplicate songs, or YouTube playlist mixes (e.g. RD...)
      if (vid && vid.length === 11 && !vid.startsWith('RD') && name && !seen.has(vid)) {
        seen.add(vid);

        // Filter out excessively long DJ sets / mixes (> 12 minutes)
        if (duration) {
          const parts = duration.split(':');
          if (parts.length > 2 || parseInt(parts[0], 10) > 12) {
            continue;
          }
        }

        songs.push({
          type: 'SONG',
          videoId: vid,
          name: name.replace(/&amp;/g, '&'),
          artist: { name: artist.replace(/&amp;/g, '&') },
          thumbnails: [{ url: thumb || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` }],
          duration: duration || '3:30'
        });
      }
    }

    // Cache header: cache for 15 minutes, stale while revalidate 1 hour
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({ songs });
  } catch (err) {
    console.error('Error fetching related tracks:', err);
    return res.status(200).json({ songs: [] });
  }
}

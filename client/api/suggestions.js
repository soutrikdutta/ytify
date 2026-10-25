// Vercel Serverless Function: Official YouTube Search Autocomplete & Suggestions Engine
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q || typeof q !== 'string' || !q.trim()) {
    return res.status(200).json({ query: '', suggestions: [] });
  }

  const query = q.trim();

  try {
    // Official YouTube Suggest Queries endpoint (same algorithm as YouTube and Google Search)
    const ytUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
    const ytRes = await fetch(ytUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (ytRes.ok) {
      const data = await ytRes.json();
      const rawSuggestions = Array.isArray(data[1]) ? data[1] : [];
      return res.status(200).json({
        query,
        suggestions: rawSuggestions.slice(0, 10)
      });
    }

    // Fallback: innertube autocomplete if suggestqueries fails
    const innerRes = await fetch(`https://clients1.google.com/complete/search?client=youtube&hl=en&gl=US&q=${encodeURIComponent(query)}`);
    if (innerRes.ok) {
      const text = await innerRes.text();
      // Parse window.google.ac.h(["query",[["sug1",0],["sug2",0]...]])
      const match = text.match(/\[.*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const items = Array.isArray(parsed[1]) ? parsed[1].map(item => Array.isArray(item) ? item[0] : item) : [];
        return res.status(200).json({
          query,
          suggestions: items.slice(0, 10)
        });
      }
    }

    return res.status(200).json({ query, suggestions: [] });
  } catch (err) {
    console.warn('Suggestions error:', err);
    return res.status(200).json({ query, suggestions: [] });
  }
}

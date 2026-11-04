// Returns BBJake's latest YouTube uploads as JSON, from the channel's public feed.
// Vercel caches the answer for 30 minutes, so the site stays fresh without any edits.
const CHANNEL_ID = 'UCpw4OrnmSuXHmkbDOf-W2Yw';
const FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID;

function decode(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}
function pick(block, re) {
  const m = block.match(re);
  return m ? m[1] : '';
}

module.exports = async (req, res) => {
  try {
    const r = await fetch(FEED, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'BBJake.com video feed' } });
    if (!r.ok) throw new Error('feed ' + r.status);
    const xml = await r.text();
    let videos = (xml.match(/<entry>[\s\S]*?<\/entry>/g) || []).map((b) => ({
      id: pick(b, /<yt:videoId>([^<]+)<\/yt:videoId>/),
      title: decode(pick(b, /<title>([^<]*)<\/title>/)),
      short: /\/shorts\//.test(pick(b, /<link rel="alternate" href="([^"]+)"/)),
      published: pick(b, /<published>([^<]+)<\/published>/),
      views: parseInt(pick(b, /<media:statistics views="(\d+)"/), 10) || 0,
    })).filter((v) => v.id && v.title && !v.short).map(({ short, ...v }) => v); // Shorts links contain /shorts/
    if (!videos.length) throw new Error('no videos');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(JSON.stringify({ videos }));
  } catch (e) {
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(502).json({ error: 'feed unavailable' });
  }
};

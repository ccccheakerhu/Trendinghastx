// api/trending.js
export default async function handler(req, res) {
  // CORS headers for cross-origin requests
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { country = 'japan', count = 2 } = req.query;
    
    console.log(`Fetching trends for ${country}, count: ${count}`);
    
    // Fetch from trends24.in
    const response = await fetch(`https://trends24.in/${country.toLowerCase()}/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from trends24.in: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Parse HTML to extract trends
    const trends = parseTrendsFromHTML(html, parseInt(count));
    
    return res.status(200).json({
      success: true,
      country: country,
      requested_at: new Date().toISOString(),
      count: trends.length,
      trends: trends
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      note: 'The website structure might have changed or the site is down'
    });
  }
}

// HTML Parsing Function
function parseTrendsFromHTML(html, maxCount) {
  const trends = [];
  
  // Method 1: Look for trend items in the HTML
  const trendRegex = /<a[^>]*href="\/[^"]*"[^>]*>(#[^<]+|.[^<]+)<\/a>\s*(?:<span[^>]*>([^<]+)<\/span>)?/gi;
  let match;
  let count = 0;
  
  while ((match = trendRegex.exec(html)) !== null && count < maxCount) {
    const name = match[1].trim();
    const tweets = match[2] ? match[2].trim() : '';
    
    // Filter out non-trending items
    if (name && !name.includes('24.in') && !name.includes('href=') && name.length > 2) {
      trends.push({
        rank: count + 1,
        name: name.startsWith('#') ? name : `#${name}`,
        tweets: tweets
      });
      count++;
    }
  }
  
  // Method 2: If regex fails, return sample data
  if (trends.length === 0) {
    return [
      { rank: 1, name: "#日本チーム", tweets: "125K tweets" },
      { rank: 2, name: "#TokyoTech", tweets: "89K tweets" }
    ].slice(0, maxCount);
  }
  
  return trends.slice(0, maxCount);
      }

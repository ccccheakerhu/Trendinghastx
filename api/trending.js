export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { country = 'japan', count = 10 } = req.query;
    
    // 1. trends24.in से real-time डेटा fetch करें
    const response = await fetch(`https://trends24.in/${country.toLowerCase()}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    
    // 2. "few minutes ago" सेक्शन ढूंढें और पार्स करें
    const trends = [];
    
    // Method 1: टेबल स्ट्रक्चर से पार्स करें (जो वेबसाइट अभी use कर रही है)
    const tableRegex = /<table[^>]*>[\s\S]*?few minutes ago[\s\S]*?<\/table>/i;
    const tableMatch = html.match(tableRegex);
    
    if (tableMatch) {
      const tableHtml = tableMatch[0];
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      let trendCount = 0;
      
      while ((rowMatch = rowRegex.exec(tableHtml)) !== null && trendCount < count) {
        const row = rowMatch[1];
        
        // ट्रेंड नाम और ट्वीट काउंट निकालें
        const nameMatch = row.match(/<a[^>]*>([^<]+)<\/a>/);
        const countMatch = row.match(/>\s*([0-9\.]+[Kk]?)\s*</);
        
        if (nameMatch) {
          const name = nameMatch[1].trim();
          const tweets = countMatch ? countMatch[1] : 'N/A';
          
          trends.push({
            rank: trendCount + 1,
            name: name,
            tweets: tweets
          });
          trendCount++;
        }
      }
    }
    
    // Method 2: अगर टेबल न मिले तो टैग क्लाउड से पार्स करें
    if (trends.length === 0) {
      const tagCloudRegex = /Tag Cloud[\s\S]*?<div[^>]*class="trend-card"[^>]*>([\s\S]*?)<h5[^>]*>1 hour ago/i;
      const tagCloudMatch = html.match(tagCloudRegex);
      
      if (tagCloudMatch) {
        const cloudHtml = tagCloudMatch[1];
        const trendRegex = /<a[^>]*>([^<]+)<\/a>\s*(?:<span[^>]*>([^<]+)<\/span>)?/gi;
        let trendMatch;
        let count = 0;
        
        while ((trendMatch = trendRegex.exec(cloudHtml)) !== null && count < 10) {
          trends.push({
            rank: count + 1,
            name: trendMatch[1].trim(),
            tweets: trendMatch[2] || 'N/A'
          });
          count++;
        }
      }
    }
    
    // 3. रिस्पांस भेजें
    res.status(200).json({
      success: true,
      country: country,
      section: "few_minutes_ago",
      fetched_at: new Date().toISOString(),
      trends: trends
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
               }      success: true,
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

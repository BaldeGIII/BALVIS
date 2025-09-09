require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const axios = require('axios');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { parse, format } = require('date-fns');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const upload = multer({ 
  dest: 'uploads/', 
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
   },
});

const app = express();
const port = 3001; // Changed from 5000 to 3001 to match frontend expectations

// YouTube API key from .env file
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

app.use(cors({
  origin: 'http://localhost:5173', // React app URL
  credentials: false // Simplified - no sessions needed
}));
app.use(express.json());

// API Routes start here

/*
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/auth/failed' }),
  function(req, res) {
    // Redirect to completion page which then redirects to frontend
    res.redirect('/auth/complete');
  }
);

app.get('/auth/complete', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Authentication Successful</title>
        <script>
          window.onload = function() {
            window.location.href = "http://localhost:5173";
          }
        </script>
      </head>
      <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f5f5f5;">
        <div style="text-align: center; padding: 2rem; background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2>Authentication Successful!</h2>
          <p>Redirecting to BALVIS application...</p>
        </div>
      </body>
    </html>
  `);
});

app.get('/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ 
      authenticated: true, 
      user: {
        name: req.user.displayName,
        email: req.user.email,
        picture: req.user.picture,
      } 
    });
  } else {
    res.json({ authenticated: false });
  }
});

app.get('/', (req, res) => {
  res.send('BALVIS API server is running. Please go to the frontend at http://localhost:5173');
});
*/

// Root route
app.get('/', (req, res) => {
  res.send('BALVIS API server is running. Please go to the frontend at http://localhost:5173');
});

/*
app.get('/auth/logout', (req, res) => {
  req.logout(function(err) => {
    if (err) { 
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Error during logout' }); 
    }
    res.redirect('http://localhost:5173');
  });
});
app.get('/auth/failed', (req, res) => {
  res.status(401).json({ error: 'Authentication failed' });
}); 
*/

/*
// Add this function to handle token refresh and verification
async function verifyAndRefreshToken(req) {
  if (!req || !req.user || !req.user.accessToken) {
    return false;
  }
  
  try {
    // First, test if the current token works
    try {
      const testResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: { part: 'snippet', mine: true },
        headers: { Authorization: `Bearer ${req.user.accessToken}` }
      });
      
      if (testResponse.status === 200) {
        console.log('Access token is valid');
        return true;
      }
    } catch (error) {
      console.log('Access token appears to be invalid or expired, attempting refresh');
    }
    
    // If we have a refresh token, try to get a new access token
    if (req.user.refreshToken) {
      console.log('Attempting to refresh access token...');
      
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: req.user.refreshToken,
        grant_type: 'refresh_token'
      });
      
      if (tokenResponse.data && tokenResponse.data.access_token) {
        // Update the user's token in the session
        req.user.accessToken = tokenResponse.data.access_token;
        req.user.tokenExpiry = Date.now() + (tokenResponse.data.expires_in * 1000);
        console.log('Access token refreshed successfully');
        return true;
      }
    }
    
    console.log('Could not refresh the token');
    return false;
  } catch (error) {
    console.error('Error during token verification/refresh:', error.message);
    return false;
  }
}
*/

// Simple YouTube API search function
async function searchYouTubeWithAPI(query, maxResults = 5) {
  try {
    console.log(`🔍 Searching YouTube API for: "${query}"`);
    
    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API key is not configured');
    }
    
    // Search for videos
    const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        maxResults: maxResults * 2, // Get more results to filter out shorts
        type: 'video',
        videoEmbeddable: 'true',
        videoDuration: 'medium', // Exclude shorts (videos under 4 minutes)
        key: YOUTUBE_API_KEY
      }
    });
    
    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      console.log('❌ No videos found');
      return [];
    }
    
    console.log(`✅ Found ${searchResponse.data.items.length} videos`);
    
    // Get video IDs for additional details
    const videoIds = searchResponse.data.items.map(item => item.id.videoId);
    
    // Get detailed video information including statistics
    const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,statistics,contentDetails',
        id: videoIds.join(','),
        key: YOUTUBE_API_KEY
      }
    });
    
    const videos = detailsResponse.data.items
      .filter(video => {
        // Filter out shorts and very short videos
        if (video.contentDetails && video.contentDetails.duration) {
          const duration = video.contentDetails.duration;
          // Parse ISO 8601 duration (e.g., PT1M30S = 1 minute 30 seconds)
          const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (match) {
            const hours = parseInt(match[1] || '0');
            const minutes = parseInt(match[2] || '0');
            const seconds = parseInt(match[3] || '0');
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            
            // Exclude videos shorter than 2 minutes (120 seconds)
            if (totalSeconds < 120) {
              console.log(`Filtering out short video: ${video.snippet.title} (${duration})`);
              return false;
            }
          }
        }
        return true;
      })
      .slice(0, maxResults) // Limit to requested number after filtering
      .map(video => ({
        id: video.id,
        title: video.snippet.title,
        channelTitle: video.snippet.channelTitle,
        description: video.snippet.description,
        publishedAt: video.snippet.publishedAt,
        thumbnails: video.snippet.thumbnails,
        viewCount: video.statistics.viewCount || '0',
        likeCount: video.statistics.likeCount || '0',
        duration: video.contentDetails.duration,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        embedUrl: `https://www.youtube.com/embed/${video.id}`
      }));
    
    // Save to CSV
    await saveVideosToCSV(query, videos);
    
    return videos;
    
  } catch (error) {
    console.error('❌ YouTube API Error:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return [];
  }
}

// Function to save videos to CSV
async function saveVideosToCSV(query, videos) {
  try {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const csvPath = path.join(dataDir, 'test_search.csv');
    let csvContent = '';
    
    // Create header if file doesn't exist
    if (!fs.existsSync(csvPath)) {
      csvContent = 'TIMESTAMP,QUERY,VIDEO_ID,VIDEO_TITLE,CHANNEL_TITLE,VIEW_COUNT\n';
    }
    
    // Add data rows
    const timestamp = new Date().toISOString();
    if (videos && videos.length > 0) {
      videos.forEach(video => {
        const title = (video.title || '').replace(/"/g, '""');
        const channel = (video.channelTitle || '').replace(/"/g, '""');
        csvContent += `${timestamp},"${query}","${video.id}","${title}","${channel}","${video.viewCount}"\n`;
      });
      console.log(`📝 Saved ${videos.length} videos to CSV`);
    } else {
      csvContent += `${timestamp},"${query}",,,,"No results"\n`;
      console.log('📝 Logged "no results" to CSV');
    }
    
    // Append to CSV file
    fs.appendFileSync(csvPath, csvContent);
    return true;
  } catch (error) {
    console.error('Error saving to CSV:', error);
    return false;
  }
}

// Improved function to search YouTube videos
async function searchYouTubeVideos(query, maxResults = 7, req = null) {
  try {
    console.log(`Searching YouTube for: "${query}"`);
    
    // Set up search parameters for educational content
    const params = {
      part: 'snippet',
      q: `${query} education tutorial`,
      maxResults: maxResults,
      type: 'video',
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      relevanceLanguage: 'en',
      safeSearch: 'strict',
    };
    
    // Get access token if user is authenticated
    let config = {};
    let accessToken = null;

    // Try to get token from authenticated user
    if (req && req.isAuthenticated && req.isAuthenticated() 
      && req.user && req.user.accessToken) {
      accessToken = req.user.accessToken;
      config = {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      };
      console.log('Using access token from authenticated user');
    } else {
      console.log('No authenticated user or access token found');
    }
    // Try multiple search strategies for better results
    const searchStrategies = [
      { type: 'education', q: `${query} education tutorial` },
      { type: 'general', q: query }
    ];
    
    let allResults = [];
    
    // Try each search strategy until we get usable results
    for (const strategy of searchStrategies) {
      try {
        params.q = strategy.q;
        console.log(`Trying ${strategy.type} search strategy: ${params.q}`);
        
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', { params });
        
        if (response.data && response.data.items && response.data.items.length > 0) {
          console.log(`Found ${response.data.items.length} results with ${strategy.type} strategy`);
          
          // Parse the search results
        const parsedVideos = parseYouTubeResponse(response.data);
        console.log(`Found ${parsedVideos.length} parseable videos with ${strategy.type} strategy`);
          
        if (parsedVideos.length > 0) {
          // Get the video IDs to fetch details
          const videoIds = parsedVideos.map(video => video.id);
          
          // Get detailed video information
          const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
              part: 'snippet,contentDetails,statistics,status',
              id: videoIds.join(',')
            },
            ...config
          });
            
            if (detailsResponse.data && detailsResponse.data.items) {
              // Only keep embeddable videos
              const embeddableVideos = detailsResponse.data.items.filter(video => 
                video.status && video.status.embeddable === true
              );
              
              if (embeddableVideos.length > 0) {
                allResults = [...allResults, ...embeddableVideos];
                // If we have enough results, break the loop
                if (allResults.length >= 5) break;
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error with ${strategy.type} search:`, error.message);
        // Continue to next strategy on error
      }
    }
    
    if (allResults.length === 0) {
      console.log('No videos found across all search strategies');
      return [];
    }
    
    // Rank videos by relevance score (combination of view count, like ratio, and freshness)
    return allResults.sort((a, b) => {
      const aViews = parseInt(a.statistics.viewCount) || 0;
      const bViews = parseInt(b.statistics.viewCount) || 0;
      const aLikes = parseInt(a.statistics.likeCount) || 0;
      const bLikes = parseInt(b.statistics.likeCount) || 0;
      
      // Calculate a relevance score
      const aPublishedAt = new Date(a.snippet.publishedAt);
      const bPublishedAt = new Date(b.snippet.publishedAt);
      const currentDate = new Date();
      
      // Fresher content gets a boost (but not too much)
      const aFreshness = Math.max(0, 1 - ((currentDate - aPublishedAt) / (1000 * 60 * 60 * 24 * 365))); // Decay over 1 year
      const bFreshness = Math.max(0, 1 - ((currentDate - bPublishedAt) / (1000 * 60 * 60 * 24 * 365)));
      
      // Calculate engagement rate
      const aEngagement = aLikes / Math.max(aViews, 1);
      const bEngagement = bLikes / Math.max(bViews, 1);
      
      // Final score combines views, engagement, and freshness
      const aScore = (Math.log10(aViews + 1) * 0.6) + (aEngagement * 0.3) + (aFreshness * 0.1);
      const bScore = (Math.log10(bViews + 1) * 0.6) + (bEngagement * 0.3) + (bFreshness * 0.1);
      
      return bScore - aScore;
    });
  } catch (error) {
    console.error('YouTube API Error:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    return [];
  }
}

// Enhanced function to get detailed video information
async function getVideoDetails(videoId, req=null) {
  try {

    // Set config based on authentication
     let config = {};
     if (req && req.isAuthenticated && req.isAuthenticated() 
      && req.user && req.user.accessToken)  {
       config = {
         headers: {
           'Authorization': `Bearer ${req.user.accessToken}`
         }
       };
     }
     
     const params = {
       part: 'snippet,contentDetails,statistics,status',
       id: videoId,
     };
     
     const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
       params,
       ...config
     }); 
    
    if (!response.data.items || response.data.items.length === 0) {
      console.log(`No details found for video ID ${videoId}`);
      return null;
    }
    
    // Parse duration into a readable format
    const video = response.data.items[0];
    if (video.contentDetails && video.contentDetails.duration) {
      video.formattedDuration = formatIsoDuration(video.contentDetails.duration);
    }
    
    return video;
  } catch (error) {
    console.error('Error getting video details:', error.message);
    return null;
  }
}

// Helper function to format ISO 8601 duration to human-readable format
function formatIsoDuration(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;
  
  const hours = match[1] ? `${match[1]} hour${match[1] > 1 ? 's' : ''} ` : '';
  const minutes = match[2] ? `${match[2]} minute${match[2] > 1 ? 's' : ''} ` : '';
  const seconds = match[3] ? `${match[3]} second${match[3] > 1 ? 's' : ''}` : '';
  
  return (hours + minutes + seconds).trim() || 'unknown duration';
}

// Helper function to parse YouTube API response data
function parseYouTubeResponse(responseData) {
  try {
    if (!responseData || !responseData.items || !Array.isArray(responseData.items)) {
      console.log('Invalid YouTube response format');
      return [];
    }
    
    return responseData.items
      .filter(item => {
        // Ensure the item has a valid video ID
        return item && 
               item.id && 
               ((item.id.kind === 'youtube#video' && item.id.videoId) || 
               (typeof item.id === 'string'));
      })
      .map(item => {
        // Extract video ID from either format
        const videoId = typeof item.id === 'string' ? item.id : item.id.videoId;
        
        return {
          id: videoId,
          title: item.snippet?.title || 'Unknown title',
          channelId: item.snippet?.channelId,
          channelTitle: item.snippet?.channelTitle || 'Unknown channel',
          description: item.snippet?.description || '',
          publishedAt: item.snippet?.publishedAt,
          thumbnails: item.snippet?.thumbnails || {},
          url: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: `https://www.youtube.com/embed/${videoId}`
        };
      });
    } catch (error) {
      console.error('Error parsing YouTube response:', error);
      return [];
    }
  }

// Function to log video searches to CSV
async function logVideoSearchToCSV(query, videos, req) {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const csvPath = path.join(dataDir, 'video_searches.csv');
    let csvContent = '';
    
    // Create header if file doesn't exist
    if (!fs.existsSync(csvPath)) {
      csvContent = 'TIMESTAMP,QUERY,VIDEO_ID,VIDEO_TITLE,CHANNEL_TITLE,VIEW_COUNT\n';
    }
    
    // Add data rows
    const timestamp = new Date().toISOString();
    if (videos && videos.length > 0) {
      videos.forEach(video => {
        const videoId = video.id || '';
        const title = (video.snippet?.title || '').replace(/"/g, '""');
        const channel = (video.snippet?.channelTitle || '').replace(/"/g, '""');
        const views = video.statistics?.viewCount || '';
        csvContent += `${timestamp},"${query}","${videoId}","${title}","${channel}","${views}"\n`;
      });
    } else {
      csvContent += `${timestamp},"${query}",,,,"No results"\n`;
    }
    
    // Append to CSV file
    fs.appendFileSync(csvPath, csvContent);
    console.log('Search logged to CSV');
    return true;
  } catch (error) {
    console.error('Error logging to CSV:', error);
    return false;
  }
}

// Helper function to convert LaTeX mathematical notation to Unicode symbols
function convertLatexToUnicode(text) {
  if (!text || typeof text !== 'string') return text;
  
  let converted = text;
  
  // Convert LaTeX square roots: \(\sqrt{number}\) → √number
  converted = converted.replace(/\\?\\\(\s*\\sqrt\{([^}]+)\}\s*\\?\\\)/g, '√$1');
  
  // Convert LaTeX fractions: \(\frac{a}{b}\) → a/b
  converted = converted.replace(/\\?\\\(\s*\\frac\{([^}]+)\}\{([^}]+)\}\s*\\?\\\)/g, '$1/$2');
  
  // Convert LaTeX superscripts in parentheses: \(x^2\) → x², \(3^2\) → 3², etc.
  converted = converted.replace(/\\?\\\(\s*([^\\)]*)\^(\d+)\s*\\?\\\)/g, '$1$2');
  
  // Convert more complex expressions: \(3\sqrt{2}\) → 3√2
  converted = converted.replace(/\\?\\\(\s*(\d+)\\sqrt\{([^}]+)\}\s*\\?\\\)/g, '$1√$2');
  
  // Convert LaTeX mathematical expressions in parentheses: \(expression\) → expression
  // This should be done AFTER more specific patterns
  converted = converted.replace(/\\?\\\(\s*([^\\)]+)\s*\\?\\\)/g, '$1');
  
  // Convert common mathematical symbols
  converted = converted.replace(/\\times/g, '×');
  converted = converted.replace(/\\div/g, '÷');
  converted = converted.replace(/\\pm/g, '±');
  converted = converted.replace(/\\mp/g, '∓');
  converted = converted.replace(/\\cdot/g, '·');
  converted = converted.replace(/\\approx/g, '≈');
  converted = converted.replace(/\\neq/g, '≠');
  converted = converted.replace(/\\leq/g, '≤');
  converted = converted.replace(/\\geq/g, '≥');
  converted = converted.replace(/\\infty/g, '∞');
  converted = converted.replace(/\\pi/g, 'π');
  converted = converted.replace(/\\theta/g, 'θ');
  converted = converted.replace(/\\alpha/g, 'α');
  converted = converted.replace(/\\beta/g, 'β');
  converted = converted.replace(/\\gamma/g, 'γ');
  converted = converted.replace(/\\delta/g, 'δ');
  converted = converted.replace(/\\sum/g, '∑');
  converted = converted.replace(/\\int/g, '∫');
  
  // Convert standalone superscripts: ^2 → ², ^3 → ³, etc.
  converted = converted.replace(/\^2\b/g, '²');
  converted = converted.replace(/\^3\b/g, '³');
  converted = converted.replace(/\^4\b/g, '⁴');
  converted = converted.replace(/\^5\b/g, '⁵');
  converted = converted.replace(/\^6\b/g, '⁶');
  converted = converted.replace(/\^7\b/g, '⁷');
  converted = converted.replace(/\^8\b/g, '⁸');
  converted = converted.replace(/\^9\b/g, '⁹');
  
  // Convert subscripts: _1 → ₁, _2 → ₂, etc.
  converted = converted.replace(/_0\b/g, '₀');
  converted = converted.replace(/_1\b/g, '₁');
  converted = converted.replace(/_2\b/g, '₂');
  converted = converted.replace(/_3\b/g, '₃');
  converted = converted.replace(/_4\b/g, '₄');
  converted = converted.replace(/_5\b/g, '₅');
  converted = converted.replace(/_6\b/g, '₆');
  converted = converted.replace(/_7\b/g, '₇');
  converted = converted.replace(/_8\b/g, '₈');
  converted = converted.replace(/_9\b/g, '₉');
  
  // Map numbers to their superscript Unicode equivalents
  const superscriptMap = {
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹'
  };
  
  // Apply superscript conversion
  for (const [num, sup] of Object.entries(superscriptMap)) {
    const regex = new RegExp(`([a-zA-Z0-9])\\^${num}`, 'g');
    converted = converted.replace(regex, `$1${sup}`);
  }
  
  return converted;
}

app.post('/api/chat', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  try {
    const { message } = req.body;
    console.log('📨 Processing chat request:', message);
    const isVideoRequest = message.toLowerCase().includes('find a video') || 
                          message.toLowerCase().includes('show me a video') ||
                          message.toLowerCase().includes('video about') ||
                          message.toLowerCase().includes('find videos') ||
                          message.toLowerCase().includes('find educational videos') ||
                          message.toLowerCase().includes('educational videos about') ||
                          message.toLowerCase().includes('search for video') ||
                          message.toLowerCase().startsWith('find educational videos about:');

    console.log('🔍 Video request check:', isVideoRequest, 'for message:', message);

    // Handle video requests with YouTube API
    if (isVideoRequest) {
      console.log('🎥 Video search detected, using YouTube API...');
      
      // Extract the topic the user is asking about
      let videoTopic;
      
      // Handle the new multi-topic format
      if (message.includes('Find educational videos about:')) {
        videoTopic = message.replace('Find educational videos about:', '').trim();
      } else {
        const videoTopicRegex = /(?:find|show|get|search for)?\s*(?:a|me a|some)?\s*videos?(?:\s+about|\s+on|\s+for|\s+related to|\s+regarding)?\s*(.*?)(?:\?|$|\.)/i;
        const topicMatch = message.match(videoTopicRegex);
        videoTopic = topicMatch ? topicMatch[1].trim() : message.replace(/find a video|show me a video|video about|find videos|search for video/gi, '').trim();
      }
      
      console.log('Extracted video topic:', videoTopic);
      
      try {
        const videos = await searchYouTubeWithAPI(videoTopic);
        
        if (videos && videos.length > 0) {
          // Handle multiple topic queries more concisely
          const isMultiTopic = videoTopic.includes(',') || videoTopic.includes('Find educational videos about:');
          let responseIntro = isMultiTopic 
            ? `Here are educational videos for the topics discussed:\n\n`
            : `Educational videos about "${videoTopic}":\n\n`;
          
          let videoResponse = responseIntro;
          
          videos.slice(0, 5).forEach((video, index) => {
            videoResponse += `${index + 1}. ${video.title}\n`;
            videoResponse += `   ${video.channelTitle} • ${parseInt(video.viewCount).toLocaleString()} views\n`;
            videoResponse += `   ${video.url}\n\n`;
          });
          
          console.log('✅ Successfully found videos, sending response and returning early');
          return res.json({ 
            reply: videoResponse,
            videos: videos.slice(0, 5),
            type: 'video_search'
          });
        } else {
          const fallbackMessage = `I couldn't find any videos for "${videoTopic}". This might be because:\n\n1. The YouTube API quota has been exceeded\n2. The search term was too specific\n3. There was a temporary connection issue\n\nTry:\n- Using broader search terms\n- Checking your internet connection\n- Trying again in a few minutes`;
          
          return res.json({ 
            reply: fallbackMessage,
            type: 'error'
          });
        }
      } catch (error) {
        console.error('YouTube API error:', error);
        
        // Provide a helpful fallback response
        const fallbackPrompt = `The user asked for a video about "${videoTopic}" but I couldn't access YouTube right now. Please provide:
          1. A brief explanation of the topic (2-3 sentences)
          2. An acknowledgment that specific videos couldn't be found
          3. A suggestion for alternative search terms they might try
          4. Do NOT include any video links since we couldn't find any`;
          
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: fallbackPrompt }],
          max_tokens: 800,
          temperature: 0.7
        });
        
        res.json({ reply: completion.choices[0].message.content });
      }
    } else {
      // Handle regular non-video requests
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: message }],
        max_tokens: 800,
        temperature: 0.7
      });
      
      // Convert LaTeX formatting to Unicode symbols
      const convertedReply = convertLatexToUnicode(completion.choices[0].message.content);
      res.json({ reply: convertedReply });
    }
  } catch (error) {
    console.error('Error:', error);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Endpoint to extract text from a PDF file
app.post('/api/extract-pdf', upload.single('file'), async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded' });
  }
  
  try {
    const pdfFile = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfFile);
    
    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ text: pdfData.text });
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    res.status(500).json({ error: 'Failed to extract text from PDF' });
  }
});

// Endpoint to summarize text
app.post('/api/summarize', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }
  
  const { text } = req.body;
  
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'Valid text is required for summarization' });
  }
  
  try {
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    const prompt = `Please provide a concise summary of the following text, capturing the key information and main points:

${text}

Summary:`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.5
    });
    
    const summary = completion.choices[0].message.content;
    res.json({ summary });
  } catch (error) {
    console.error('Error summarizing text:', error);
    res.status(500).json({ error: 'Failed to summarize text' });
  }
});

// Enhance the log-video-search endpoint
app.post('/api/log-video-search', async (req, res) => {
  const { query } = req.body;
  const apiKey = req.headers['x-api-key'];
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  try {
    // Instead of YouTube API, just log the search query
    const logged = await logVideoSearchToCSV(query, null, req);
    
    if (logged) {
      return res.json({ 
        success: true, 
        message: 'Search logged successfully without video result',
        videoFound: false
      });
    } else {
      return res.status(500).json({ error: 'Failed to log search' });
    }
  } catch (error) {
    console.error('Error logging video search:', error);
    res.status(500).json({ error: 'Failed to log search: ' + error.message });
  }
});

// Update the web-search endpoint to better handle video requests

app.post('/api/web-search', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const { query, user_location, search_context_size } = req.body;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Detect if this is a video search request
  const isVideoRequest = query.toLowerCase().includes('find a video') || 
                        query.toLowerCase().includes('youtube') ||
                        query.toLowerCase().includes('watch') ||
                        query.toLowerCase().includes('video about');

  const openai = new OpenAI({ apiKey });

  try {
    // Since responses.create is not available, we'll use regular chat completion
    // with a prompt that provides helpful video recommendations without fake URLs
    const enhancedQuery = isVideoRequest 
      ? `I need you to help find YouTube videos about: "${query}". 
         
         Please provide a response that includes:
         1. A brief explanation of the topic (2-3 sentences)
         2. A list of 5 realistic YouTube video recommendations with well-known creators who actually make content about this topic
         
         Format each recommendation like this:
         [Video Title] by [Channel Name]
         - Brief description of what this video covers
         
         IMPORTANT: Do NOT include any YouTube URLs or video IDs. Only provide the titles, channel names, and descriptions. Users will search for these videos themselves on YouTube.
         
         Make sure all the video titles and channel names are realistic and from actual content creators who would cover this topic.`
      : query;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: 'user', content: enhancedQuery }],
      max_tokens: 1000,
      temperature: 0.7
    });

    const response = completion.choices[0].message.content;
    
    // Format the response to match what the frontend expects
    res.json({ output_text: response });
  } catch (error) {
    console.error('Web search error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to perform web search' });
  }
});

// Direct YouTube video search endpoint (no authentication required)
app.post('/api/video-search', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    console.log(`🎥 Direct YouTube search for: "${query}"`);
    const videos = await searchYouTubeWithAPI(query, 5);
    
    res.json({ 
      videos: videos,
      query: query,
      count: videos.length 
    });
  } catch (error) {
    console.error('YouTube search error:', error.message);
    res.status(500).json({ error: 'Failed to search YouTube videos' });
  }
});

// Whiteboard drawing analysis endpoint
app.post('/api/analyze-whiteboard', async (req, res) => {
  try {
    const { imageData, apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }
    
    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    console.log('🎨 Analyzing whiteboard drawing...');

    const openai = new OpenAI({ apiKey: apiKey });
    
    // Create analysis prompt for the drawing
    const analysisPrompt = `You are BALVIS, an advanced AI study assistant analyzing a student's whiteboard drawing. Focus on mathematical content and symbols.

IMPORTANT: Look carefully for MATHEMATICAL SYMBOLS and EXPRESSIONS, not geometric shapes unless clearly intended as geometry problems.

Please analyze this drawing and provide a clear, well-formatted response with the following sections:

🔍 What I can see:
[Focus on identifying mathematical symbols, equations, numbers, and expressions. If you see what looks like a square root symbol (√) with a number, that's likely a mathematical expression, NOT a geometric shape.]

📚 Subject area:
[Identify the mathematical field - algebra, arithmetic, geometry, calculus, etc.]

💡 Explanation:
[Explain the mathematical concepts. Use proper Unicode mathematical symbols: √, ², ³, ∞, π, ±, ≈, ≤, ≥, ∑, ∫, α, β, θ, etc.]

📖 Study tips:
[Provide relevant mathematical study tips]

🎯 Next steps:
[Suggest mathematical concepts to study next]

CRITICAL SYMBOL RECOGNITION RULES:
- If you see a checkmark-like symbol with a horizontal line and a number underneath, it's likely √ (square root)
- Focus on mathematical interpretation before geometric interpretation
- A rough drawing of √10 should be interpreted as "square root of 10", not as separate geometric shapes
- Look for mathematical context clues like numbers, equals signs, operations
- If unsure between mathematical symbol vs geometric shape, choose mathematical interpretation

CRITICAL FORMATTING RULES - ABSOLUTELY NO LATEX:
- NEVER EVER use LaTeX formatting like \\(anything\\) or \\[anything\\] 
- NEVER use backslashes: NO \\sqrt, NO \\times, NO \\pi, NO \\frac
- ALWAYS use Unicode symbols directly: √18, 3², π, ×, ÷, ∞
- Write math as: "18 = 2 × 3²" NOT "\\(18 = 2 \\times 3^2\\)"
- Write square roots as: "√18 = 3√2" NOT "\\(\\sqrt{18} = 3\\sqrt{2}\\)"
- Write fractions as: "1/2" or "one half" NOT "\\(\\frac{1}{2}\\)"
- Examples GOOD: √18 ≈ 4.24, x² + y² = z², π ≈ 3.14159, 2 × 3 = 6
- Examples BAD: \\(\\sqrt{18}\\), \\(x^2\\), \\(\\pi\\), \\(\\times\\)

ABSOLUTELY FORBIDDEN:
- Any text containing \\( or \\)
- Any text containing \\[ or \\]
- Any backslash followed by letters like \\sqrt, \\frac, \\times, \\pi
- Any LaTeX syntax whatsoever

Use only plain text with Unicode mathematical symbols. This is critical for proper display.

Be thorough but friendly, focusing on the mathematical content the student is working on.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Use the current vision-enabled model
      messages: [
        {
          role: "system",
          content: "You are BALVIS, an advanced AI study assistant with visual analysis capabilities. Help students understand their drawings, diagrams, and handwritten work."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: analysisPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: imageData,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const analysis = completion.choices[0]?.message?.content || 'Unable to analyze the drawing.';

    // Convert LaTeX formatting to Unicode symbols
    const convertedAnalysis = convertLatexToUnicode(analysis);

    console.log('✅ Whiteboard analysis completed');

    res.json({
      analysis: convertedAnalysis,
      type: 'whiteboard_analysis',
      suggestions: [
        "Find related videos",
        "Explain concepts further", 
        "Generate practice problems",
        "Create study guide"
      ]
    });

  } catch (error) {
    console.error('Whiteboard analysis error:', error);
    if (error.message?.includes('billing')) {
      res.status(402).json({ error: 'OpenAI API quota exceeded. Please check your billing.' });
    } else {
      res.status(500).json({ error: 'Failed to analyze whiteboard drawing' });
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
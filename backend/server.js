require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const axios = require('axios');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const upload = multer({ 
  dest: 'uploads/', 
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
   },
});

const app = express();
const port = 5000;

// YouTube API key from .env file
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

app.use(cors());
app.use(express.json());

// Trusted educational channels - add more as needed
const TRUSTED_CHANNELS = [
  {id: 'UCEWpbFLzoYGPfuWUMFPSaoA', name: 'Khan Academy'},
  {id: 'UCX6b17PVsYBQ0ip5gyeme-Q', name: 'CrashCourse'},
  {id: 'UCsooa4yRKGN_zEE8iknghZA', name: 'TED-Ed'},
  {id: 'UC7_gcs09iThXybpVgjHZ_7g', name: 'PBS SpaceTime'},
  {id: 'UCUHW94eEFW7hkUMVaZz4eDg', name: 'Minute Physics'},
  {id: 'UCsXVk37bltHxD1rDPwtNM8Q', name: 'Kurzgesagt'},
  {id: 'UC9-y-6csu5WGm29I7JiwpnA', name: 'Computerphile'},
  {id: 'UCHnyfMqiRRG1u-2MsSQLbXA', name: 'Veritasium'},
  {id: 'UC0uTPqBCFIpZxlz_Lv1tk_g', name: 'Practical Engineering'},
  {id: 'UCBa659QWEk1AI4Tg--mrJ2A', name: 'Tom Scott'}
];

// Improved function to search YouTube videos
async function searchYouTubeVideos(query, maxResults = 7) {
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
      videoCategoryId: '27', // Education category
      relevanceLanguage: 'en',
      safeSearch: 'strict',
      key: YOUTUBE_API_KEY
    };
    
    // Try multiple search strategies for better results
    const searchStrategies = [
      { type: 'trusted', q: `${query} (${TRUSTED_CHANNELS.map(channel => `channel:${channel.name}`).join(' | ')})` },
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
              id: videoIds.join(','),
              key: YOUTUBE_API_KEY
            }
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
async function getVideoDetails(videoId) {
  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: 'snippet,contentDetails,statistics,status',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
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

app.post('/api/chat', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  try {
    console.log('Processing request...');
    const { message } = req.body;
    const isVideoRequest = message.toLowerCase().includes('find a video') || 
                          message.toLowerCase().includes('show me a video') ||
                          message.toLowerCase().includes('video about');

    // Handle video requests differently
    if (isVideoRequest && YOUTUBE_API_KEY) {
      // Extract the topic the user is asking about using regex
      const videoTopicRegex = /(?:find|show|get|search for)?\s*(?:a|me a|some)?\s*videos?(?:\s+about|\s+on|\s+for|\s+related to|\s+regarding)?\s*(.*?)(?:\?|$|\.)/i;
      const topicMatch = message.match(videoTopicRegex);
      const videoTopic = topicMatch ? topicMatch[1].trim() : message.replace(/find a video|show me a video|video about/gi, '').trim();
      
      console.log('Extracted video topic:', videoTopic);
      
      // Get videos from YouTube API
      const videos = await searchYouTubeVideos(videoTopic);
      
      if (videos && videos.length > 0) {
        // Get the top 3 videos to give ChatGPT options
        const topVideos = videos.slice(0, 3);
        
        console.log(`Found ${topVideos.length} relevant videos`, 
          topVideos.map(v => ({ 
            id: v.id, 
            title: v.snippet.title, 
            channel: v.snippet.channelTitle,
            views: v.statistics.viewCount
          })));
        
        // Create detailed information about each video for analysis
        const videoDescriptions = await Promise.all(topVideos.map(async (video) => {
          return {
            id: video.id,
            title: video.snippet.title,
            channelTitle: video.snippet.channelTitle,
            description: video.snippet.description.substring(0, 500) + (video.snippet.description.length > 500 ? '...' : ''),
            viewCount: parseInt(video.statistics.viewCount || '0').toLocaleString(),
            likeCount: (video.statistics.likeCount ? parseInt(video.statistics.likeCount).toLocaleString() : 'N/A'),
            publishedAt: new Date(video.snippet.publishedAt).toLocaleDateString(),
            duration: video.formattedDuration || formatIsoDuration(video.contentDetails.duration)
          };
        }));
        
        // Have ChatGPT analyze the videos and pick the most relevant one
        const videoPrompt = `
        The user asked for a video about: "${videoTopic}"
        
        I've searched YouTube and found these top educational videos. Please CAREFULLY analyze each video and select the ONE that best matches the user's specific query.
        
        Video 1:
        - Title: "${videoDescriptions[0].title}"
        - Channel: ${videoDescriptions[0].channelTitle}
        - Views: ${videoDescriptions[0].viewCount}
        - Published: ${videoDescriptions[0].publishedAt}
        - Duration: ${videoDescriptions[0].duration}
        - Description: "${videoDescriptions[0].description}"
        
        ${videoDescriptions[1] ? `Video 2:
        - Title: "${videoDescriptions[1].title}"
        - Channel: ${videoDescriptions[1].channelTitle}
        - Views: ${videoDescriptions[1].viewCount}
        - Published: ${videoDescriptions[1].publishedAt}
        - Duration: ${videoDescriptions[1].duration}
        - Description: "${videoDescriptions[1].description}"` : ''}
        
        ${videoDescriptions[2] ? `Video 3:
        - Title: "${videoDescriptions[2].title}"
        - Channel: ${videoDescriptions[2].channelTitle}
        - Views: ${videoDescriptions[2].viewCount}
        - Published: ${videoDescriptions[2].publishedAt}
        - Duration: ${videoDescriptions[2].duration}
        - Description: "${videoDescriptions[2].description}"` : ''}
        
        Based on a careful analysis of these videos, choose the ONE video that most precisely matches what the user is looking for.
        Consider:
        1. How directly the content addresses the specific topic
        2. The reputation of the channel
        3. How recent and up-to-date the information is
        4. The level of detail and clarity
        
        Format your response EXACTLY like this:
        
        Brief Explanation: [Write 2-3 sentences explaining ${videoTopic} in clear, educational terms]
        
        Recommended Video: [EXACT VIDEO TITLE](https://www.youtube.com/watch?v=[VIDEO ID])
        
        Why This Video: [Provide a detailed explanation of why this specific video is the best match for the user's query. Mention specific aspects of the video that make it relevant.]
        
        IMPORTANT: Do NOT change the format. In the Recommended Video line, replace [EXACT VIDEO TITLE] with the full video title and [VIDEO ID] with the actual video ID. The format must be exactly as shown, with square brackets for the title and parentheses for the URL. This specific format is required for proper embedding.
        
        Video IDs:
        Video 1: ${videoDescriptions[0].id}
        ${videoDescriptions[1] ? `Video 2: ${videoDescriptions[1].id}` : ''}
        ${videoDescriptions[2] ? `Video 3: ${videoDescriptions[2].id}` : ''}
        `;
          
        console.log('Asking ChatGPT to analyze videos...');
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: videoPrompt }],
          max_tokens: 800,
          temperature: 0.5
        });
        
        console.log('ChatGPT analysis complete, sending response');
        res.json({ reply: completion.choices[0].message.content });
      } else {
        // Fallback if no videos found
        console.log('No videos found, using fallback response');
        const fallbackPrompt = `The user asked for a video about "${videoTopic}" but my search didn't return any good matches. Please provide:
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
      
      res.json({ reply: completion.choices[0].message.content });
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
      model: 'gpt-4o',
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
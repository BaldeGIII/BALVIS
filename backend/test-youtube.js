require('dotenv').config();
const axios = require('axios');

// Function to test YouTube API directly
async function testYouTubeAPI() {
  try {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    
    if (!YOUTUBE_API_KEY) {
      console.error('❌ YouTube API key not found in .env file');
      return;
    }
    
    console.log('🔍 Testing YouTube API with your key...');
    
    // Make a sample request
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: 'javascript tutorial',
        maxResults: 3,
        type: 'video',
        key: YOUTUBE_API_KEY
      }
    });
    
    if (response.data && response.data.items && response.data.items.length > 0) {
      console.log('✅ SUCCESS! Your YouTube API key is working.');
      console.log('\nFound videos:');
      
      response.data.items.forEach((item, index) => {
        const videoId = item.id.videoId;
        const title = item.snippet.title;
        const channel = item.snippet.channelTitle;
        
        console.log(`\n${index + 1}. "${title}"`);
        console.log(`   Channel: ${channel}`);
        console.log(`   Video ID: ${videoId}`);
        console.log(`   Watch URL: https://www.youtube.com/watch?v=${videoId}`);
        console.log(`   Embed URL: https://www.youtube.com/embed/${videoId}`);
      });
      
      console.log('\n📋 JSON example for the first video:');
      console.log(JSON.stringify(response.data.items[0], null, 2));
      
      return true;
    } else {
      console.error('❌ API returned no video results');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing YouTube API:');
    if (error.response && error.response.data) {
      console.error('API error response:', error.response.data);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Run the test
testYouTubeAPI();
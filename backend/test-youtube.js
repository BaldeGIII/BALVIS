require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// This script tests YouTube API search using OAuth credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Function to save search results to CSV for testing
function saveToCSV(query, videos) {
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
        csvContent += `${timestamp},"${query}",${video.id},${video.title},${video.channelTitle},${video.viewCount}\n`;
      });
    } else {
      csvContent += `${timestamp},"${query}",,,,"No results"\n`;
    }
    
    // Append to CSV file
    fs.appendFileSync(csvPath, csvContent);
    console.log(`✅ Search results saved to: ${csvPath}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving to CSV:', error);
    return false;
  }
}

// Test YouTube API with a direct search
async function testYouTubeApiSearch(query) {
  try {
    console.log(`🔍 Searching YouTube for: "${query}"...`);
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        maxResults: 5,
        type: 'video',
        videoEmbeddable: 'true'
      },
      headers: {
        Authorization: `Bearer ${process.env.TEST_ACCESS_TOKEN}`
      }
    });
    
    if (response.data && response.data.items && response.data.items.length > 0) {
      console.log(`✅ Found ${response.data.items.length} videos for "${query}"`);
      
      const videos = response.data.items.map(item => {
        return {
          id: item.id.videoId,
          title: item.snippet.title.replace(/,/g, ' '),
          channelTitle: item.snippet.channelTitle.replace(/,/g, ' '),
          publishedAt: item.snippet.publishedAt,
          viewCount: 'N/A' // Need details API for this
        };
      });
      
      // Save to CSV
      saveToCSV(query, videos);
      
      // Show results
      console.log('\nTop results:');
      videos.forEach((video, index) => {
        console.log(`\n${index + 1}. ${video.title}`);
        console.log(`   Channel: ${video.channelTitle}`);
        console.log(`   URL: https://www.youtube.com/watch?v=${video.id}`);
      });
      
      return true;
    } else {
      console.log(`❌ No videos found for "${query}"`);
      saveToCSV(query, []);
      return false;
    }
  } catch (error) {
    console.error('❌ YouTube API Error:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    saveToCSV(query, []);
    return false;
  }
}

// Setup readline interface for CLI input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Run the test with user input
rl.question('Enter a search query: ', async (query) => {
  await testYouTubeApiSearch(query);
  rl.close();
});
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const apiKey = req.headers['x-api-key'];

  console.log('Received request with API key:', apiKey);

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  try {
    console.log('Sending request to ChatGPT...');
    const { message } = req.body;

    // Enhanced prompt for more accurate video recommendations
    const prompt = message.toLowerCase().includes('find a video')
      ? `You are tasked with recommending a high-quality educational video about "${message}". 
         Please follow these strict guidelines:

         1. First, provide a concise explanation of the topic (2-3 sentences)
         2. Then recommend ONE specific YouTube video that meets these criteria:
            - Must be from a reputable educational channel
            - Must have high view count and positive ratings
            - Must be recent (preferably within last 2 years)
            - Must be in English
            - Must be appropriate for all audiences
         3. Explain in 1-2 sentences why this specific video is the best choice
         4. Always verify the video exists before recommending it

         Format your response exactly like this:
         
         Brief Explanation: [Your explanation here]

         Recommended Video: [EXACT_VIDEO_TITLE](https://www.youtube.com/watch?v=[VIDEO_ID])

         Why This Video: [Your reason here]

         Note: Do not recommend videos you're not completely certain exist.`
      : message;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ 
        role: 'user', 
        content: prompt 
      }],
      max_tokens: 800,
      temperature: 0.7 // Slightly lower temperature for more focused responses
    });

    console.log('Received response from ChatGPT:', completion.choices[0].message.content);

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to get response from ChatGPT' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
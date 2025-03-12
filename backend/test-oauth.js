require('dotenv').config();
const axios = require('axios');

// This is just to test your credentials without the full app
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

console.log('Checking OAuth configuration:');
console.log(`Client ID: ${GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`Client Secret: ${GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`Redirect URI: ${REDIRECT_URI ? '✅ Set' : '❌ Missing'}`);

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && REDIRECT_URI) {
  console.log('\nYour OAuth configuration appears to be set correctly.');
  console.log('Make sure your credentials are properly configured in Google Cloud Console:');
  console.log('- Authorized JavaScript origins: http://localhost:5000');
  console.log('- Authorized redirect URIs: http://localhost:5000/auth/google/callback');
} else {
  console.log('\n❌ Missing some required OAuth configuration. Please check your .env file.');
}
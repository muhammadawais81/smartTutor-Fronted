// Agora Video Configuration
// Get your Agora App ID from: https://console.agora.io/

export const AGORA_BACKEND_APP_ID = 'Your Agora App id here'; // Replace with your Agora App ID

export const AGORA_CONFIG = {
  appId: AGORA_BACKEND_APP_ID,
  enableLog: __DEV__,
};

// Instructions:
// 1. Go to https://console.agora.io/
// 2. Sign up/Login
// 3. Create a project
// 4. Copy the App ID
// 5. Paste it in AGORA_BACKEND_APP_ID
// 6. The backend already handles token generation

export default AGORA_CONFIG;

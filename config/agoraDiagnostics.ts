// Agora Diagnostic Helper
// Run this to verify your configuration

import AGORA_CONFIG, {AGORA_BACKEND_APP_ID} from './agoraConfig';

export const diagnoseAgoraSetup = () => {
  console.log('=== AGORA CONFIGURATION DIAGNOSTICS ===');
  console.log('App ID:', AGORA_CONFIG.appId);
  console.log('Backend App ID:', AGORA_BACKEND_APP_ID);
  console.log('App ID Length:', AGORA_CONFIG.appId.length);
  console.log('App ID Valid Format:', /^[a-f0-9]{32}$/.test(AGORA_CONFIG.appId));
  console.log('App ID Matches Backend:', AGORA_CONFIG.appId === AGORA_BACKEND_APP_ID);
  console.log('Enable Log:', AGORA_CONFIG.enableLog);
  console.log('DEV Mode:', __DEV__);
  console.log('=====================================');
  
  // Validation checks
  const issues = [];
  
  if (!AGORA_CONFIG.appId || AGORA_CONFIG.appId.trim() === '') {
    issues.push('❌ App ID is empty');
  } else if (AGORA_CONFIG.appId.length !== 32) {
    issues.push('⚠️  App ID should be 32 characters');
  } else if (AGORA_CONFIG.appId !== AGORA_CONFIG.appId) {
    issues.push('⚠️  Frontend App ID does not match backend App ID');
  } else if (!/^[a-f0-9]{32}$/.test(AGORA_CONFIG.appId)) {
    issues.push('⚠️  App ID should only contain lowercase hex characters (a-f, 0-9)');
  } else {
    issues.push('✅ App ID format looks valid');
  }
  
  console.log('\\nValidation Results:');
  issues.forEach(issue => console.log(issue));
  console.log('\\n');
  
  return {
    appId: AGORA_CONFIG.appId,
    isValid: issues.length === 1 && issues[0].startsWith('✅'),
    issues
  };
};

export default diagnoseAgoraSetup;

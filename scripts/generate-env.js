const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 1. Helper function to URL-encode Base64
function base64url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// 2. Helper function to sign HS256 JWT
function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
    
  return `${signatureInput}.${signature}`;
}

// 3. Main execution
function main() {
  const secret = 'super-secret-jwt-key-with-at-least-32-characters';
  const payload = {
    role: 'anon',
    iss: 'supabase'
  };

  console.log('Generating JWT for local Supabase simulation...');
  const token = signJWT(payload, secret);
  
  const envContent = `# Local Simulated Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_ANON_KEY=${token}
`;

  const projectRoot = path.join(__dirname, '..');
  const envPath = path.join(projectRoot, '.env');
  const envLocalPath = path.join(projectRoot, '.env.local');

  fs.writeFileSync(envPath, envContent, 'utf8');
  fs.writeFileSync(envLocalPath, envContent, 'utf8');

  console.log(`\nSuccess! JWT Generated successfully.`);
  console.log(`- Token: ${token.substring(0, 15)}...${token.substring(token.length - 15)}`);
  console.log(`- Written to: ${envPath}`);
  console.log(`- Written to: ${envLocalPath}`);
}

main();

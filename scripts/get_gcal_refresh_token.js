/*
Usage:
1. Create a Google OAuth client (Desktop) in Google Cloud Console. Download credentials.json and place it in project root.
2. Run: node scripts/get_gcal_refresh_token.js
3. The script will print an auth URL; open it in your browser, grant access, then paste the returned code into the terminal.
4. The script will exchange the code and print a JSON with access_token and refresh_token. Copy the refresh_token and set environment variables:
   GCAL_CLIENT_ID, GCAL_CLIENT_SECRET, GCAL_REFRESH_TOKEN
*/

const fs = require('fs');
const path = require('path');
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials.json');

async function main() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('credentials.json not found in project root. Create OAuth client (Desktop) and save credentials.json.');
    process.exit(1);
  }

  const keys = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const key = keys.installed || keys.web;
  const oAuth2Client = new google.auth.OAuth2(
    key.client_id,
    key.client_secret,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('\n1) Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n2) After granting access, you will get a code. Paste it here:');

  process.stdout.write('Code: ');
  process.stdin.setEncoding('utf8');
  process.stdin.once('data', async (code) => {
    code = code.toString().trim();
    try {
      const r = await oAuth2Client.getToken(code);
      console.log('\n--- TOKEN ---\n');
      console.log(JSON.stringify(r.tokens, null, 2));
      console.log('\nCopy the `refresh_token` value and set it as GCAL_REFRESH_TOKEN.');
      console.log('Also set GCAL_CLIENT_ID and GCAL_CLIENT_SECRET (from credentials.json).');
      process.exit(0);
    } catch (err) {
      console.error('Error retrieving access token', err);
      process.exit(1);
    }
  });
}

main();

# Firebase Service Account Setup for Render

## Overview
Your app uses Firebase Admin SDK for authentication and Firestore. The service account credentials must be passed via the `FIREBASE_SERVICE_ACCOUNT` environment variable on Render.

---

## Step 1: Get Firebase Service Account JSON

### Local Development
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → **Project Settings** (gear icon)
3. Click **Service Accounts** tab
4. Click **Generate New Private Key** → Save as `serviceAccountKey.json`
5. Place in your project root (⚠️ **DO NOT commit to Git**)

### .gitignore (Already Protected?)
```gitignore
serviceAccountKey.json
.env
.env.local
```

---

## Step 2: Convert JSON to Environment Variable

Your service account JSON looks like:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### Option A: Single-line JSON (Recommended for Render)

**On Windows PowerShell:**
```powershell
# Read the file and convert to single-line JSON
$json = Get-Content "serviceAccountKey.json" -Raw
$json | jq -c . | Set-Clipboard
```

**On Mac/Linux:**
```bash
cat serviceAccountKey.json | jq -c . | pbcopy  # Mac
cat serviceAccountKey.json | jq -c . | xclip -selection clipboard  # Linux
```

**Manual (if no jq):**
1. Open `serviceAccountKey.json`
2. Copy ALL content
3. Go to [jsoncrush.com](https://jsoncrush.com)
4. Paste JSON → minify → copy result

---

## Step 3: Add to Render Environment Variables

### Via Render Dashboard

1. Go to your Render service → **Environment**
2. Click **Add Environment Variable**
3. **Key**: `FIREBASE_SERVICE_ACCOUNT`
4. **Value**: Paste your minified JSON (one long line)
5. Click **Save Changes**

### Via render.yaml (if using native Node runtime)

```yaml
envVars:
  - key: FIREBASE_SERVICE_ACCOUNT
    value: '{"type":"service_account","project_id":"your-project","private_key":"-----BEGIN...","client_email":"...","..."}'
```

⚠️ **IMPORTANT**: Keep this minified (no newlines) and properly escaped!

---

## Step 4: Test Firebase Connection

### Check Server Logs on Render
1. Render dashboard → Your service → **Logs**
2. On restart, look for:

```
✅ Firebase Admin initialized
```

or

```
⚠️ Firebase credentials not found - Firebase features disabled
```

### Local Test
```bash
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","..."}'
npm start
```

---

## Step 5: Verify Health Endpoint

Once deployed, test the health endpoint:

```bash
curl https://your-app.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Server is running",
  "firebase": "enabled"
}
```

If `firebase` is `"disabled"`, Firebase credentials weren't loaded.

---

## Troubleshooting

### Firebase disabled in logs
- [ ] Check render.yaml: `FIREBASE_SERVICE_ACCOUNT` is set
- [ ] Verify JSON is valid (minified, no newlines)
- [ ] Check private_key has proper `\n` escaping

### JSON parse error
```
❌ Firebase initialization error: SyntaxError: Unexpected token...
```
- JSON contains unescaped newlines
- Use `jq -c` to minify properly
- Test parsing locally:
  ```bash
  echo '{"your":"json"}' | node -e "console.log(JSON.parse(require('fs').readFileSync(0, 'utf8')))"
  ```

### "Permission denied" errors in Firestore
- Service account email needs **Firestore Editor** role in Firebase
- Go to Firebase Console → IAM & Admin → Roles
- Assign `Firebase Admin` role to the service account email

---

## Security Best Practices

✅ **DO:**
- [ ] Rotate service account keys regularly
- [ ] Use Render's encrypted env vars (✅ they do this by default)
- [ ] Never commit `serviceAccountKey.json` to Git
- [ ] Use separate service accounts for dev/prod

❌ **DON'T:**
- [ ] Expose service account in logs
- [ ] Share JSON in Slack/email
- [ ] Use "Editor" role - use "Firebase Admin" only
- [ ] Keep old keys - delete unused ones

---

## Need Help?

1. **Firebase docs**: https://firebase.google.com/docs/admin/setup
2. **Render docs**: https://render.com/docs/environment-variables
3. **PostgreSQL + Firebase**: Check `server.js` lines 50-65 and 200-230


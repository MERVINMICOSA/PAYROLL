# 🚀 Render Deployment Checklist

## Quick Start (2-3 minutes)

### Step 1: Commit All Changes
```bash
git add .
git commit -m "Prepare for Render deployment - JWT sessions and Node.js endpoints"
git push origin main
```

### Step 2: Create PostgreSQL Database on Render
1. Go to https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Fill in:
   - Name: `philtech-payroll-db`
   - Database: `payroll_db`
   - User: `payroll_user`
   - Region: Your nearest region
4. Click "Create Database"
5. ⏳ Wait 2-3 minutes for database to initialize
6. **Copy the "External Database URL"** (save for next step)

### Step 3: Create Web Service on Render
1. Click "New +" → "Web Service"
2. Connect GitHub account if not already done
3. Select repository: `PAYROLL`
4. Fill in:
   - **Name:** `philtech-payroll`
   - **Runtime:** Node (auto-selected)
   - **Build Command:** `npm install` (pre-filled from render.yaml)
   - **Start Command:** `node server.js` (pre-filled from render.yaml)
   - **Plan:** Choose "Free" or paid tier
5. Click "Advanced" and add Environment Variables:
   ```
   DATABASE_URL = [paste PostgreSQL URL from Step 2]
   JWT_SECRET = [Click "Generate"] (generates random value)
   SESSION_SECRET = [Click "Generate"] (generates random value)
   NODE_ENV = production
   FIREBASE_SERVICE_ACCOUNT = {} (leave empty if not using Firebase)
   ```
6. Click "Create Web Service"

### Step 4: Wait for Deploy (5-10 minutes)
- Watch the logs for:
  - ✅ `npm install` completing
  - ✅ `✅ Server running at http://...`
  - ✅ `✅ Users table ready`
  - ✅ `✅ Employees table ready`

### Step 5: Test Login
1. Click on your service name to open it
2. Go to the URL shown (e.g., `https://philtech-payroll.onrender.com`)
3. Test credentials:
   - Username: `accountant`
   - Password: `admin123`
4. Should redirect to dashboard ✅

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **❌ Build fails - "Cannot find module"** | Push `package-lock.json` to git: `git add package-lock.json && git commit -m "add lock" && git push` |
| **❌ "Unauthorized" login** | Check logs. Database might not be initialized. Redeploy service. |
| **❌ "Cannot connect to database"** | Check `DATABASE_URL` is correct. Verify PostgreSQL status (green) in Render. |
| **❌ Service won't start** | Check logs for errors. Verify all env vars are set. Redeploy. |
| **❌ Login redirects back to login page** | Check browser DevTools. Look for auth cookie. Check `/api/auth/session` response. |

## Important Notes

- **Default Passwords:** Change immediately after first login!
  - accountant: `admin123`
  - superadmin: `superadmin123`
  - teacher: `teacher123`

- **SSL/HTTPS:** Render provides this automatically

- **Auto-Deployment:** Render auto-deploys when you push to main branch

- **Logs:** Always check Render dashboard logs if something fails

- **Database Backup:** Enable Render's backup feature in PostgreSQL settings

## Render Dashboard Links

After deployment:
- App: https://dashboard.render.com/services
- Databases: https://dashboard.render.com/databases
- Logs: Click service → "Logs" tab
- Environment Vars: Click service → "Environment" tab

## Next Steps (After Deployment Works)

1. ✅ **Change default passwords** (critical!)
2. ✅ **Enable database auto-backups** (in PostgreSQL settings)
3. ✅ **Monitor logs** (set up email alerts in Render)
4. ✅ **Update JWT_SECRET** to use strong random value
5. ✅ **Test all dashboard pages** to ensure full functionality

---

Need Help?
- Render Docs: https://docs.render.com/
- Database Issues: Check PostgreSQL status in Render
- App Issues: Check server logs in Render dashboard

# 🚀 Upload Instructions

## ✅ Files Ready for Deployment

Your `deploy` folder contains **3 production-ready files**:

```
deploy/
├── index.html              (4.6 KB) - Landing page
├── student-supabase.html   (11 KB)  - Student canvas
└── teacher-supabase.html   (24 KB)  - Teacher dashboard
```

**Total: 39.6 KB** | All files configured and ready to upload!

---

## 📤 What to Upload

### **Upload ONLY these 3 files:**

1. ✅ `index.html`
2. ✅ `student-supabase.html`
3. ✅ `teacher-supabase.html`

**That's it!** No other files, folders, or dependencies needed.

---

## 🌐 Deployment Options

### **Option 1: GitHub Pages (Recommended)**

1. **Create a new repo:**
   ```bash
   cd /Users/etdadmin/Desktop/Live\ Drawing\ Tool\ v2/min/deploy
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub:**
   - Create a new repo at https://github.com/new
   - Name it: `live-drawing-tool` (or any name)
   - Copy the commands GitHub shows you:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/live-drawing-tool.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to repo Settings → Pages
   - Source: Deploy from branch `main` → `/root`
   - Click Save
   - Wait 1-2 minutes

4. **Access your app:**
   ```
   https://YOUR_USERNAME.github.io/live-drawing-tool/
   ```

---

### **Option 2: Netlify Drop (Fastest - 30 seconds)**

1. Go to: https://app.netlify.com/drop
2. Sign in (or create free account)
3. **Drag the `deploy` folder** onto the drop zone
4. Done! Instant URL like: `https://random-name-123.netlify.app`
5. (Optional) Change the URL in Site Settings

---

### **Option 3: Vercel (Also Fast)**

1. Install Vercel CLI (one-time):
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   cd /Users/etdadmin/Desktop/Live\ Drawing\ Tool\ v2/min/deploy
   vercel
   ```

3. Follow prompts (press Enter to accept defaults)
4. Get instant URL like: `https://live-drawing-tool.vercel.app`

---

## 🧪 Test After Deploy

### 1. **Open Landing Page**
   ```
   https://your-url.com/
   ```
   ✅ Should see purple gradient with two buttons

### 2. **Open Teacher Dashboard**
   ```
   https://your-url.com/teacher-supabase.html
   ```
   ✅ Should connect automatically to session TEST123
   ✅ Status should show "Connected" (green)
   ✅ Should show "Waiting for students..." message

### 3. **Open Student Canvas (in new tab)**
   ```
   https://your-url.com/student-supabase.html
   ```
   ✅ Enter any name
   ✅ Click "Join Session"
   ✅ Should see "Connected as [Your Name]"
   ✅ Draw with Apple Pencil (black ink)
   ✅ Check teacher dashboard - student card should appear

### 4. **Test Annotations**
   - On teacher dashboard, click "Annotate" on student card
   - Draw with Apple Pencil (red ink)
   - Check student canvas - red annotations should appear
   - Close modal - annotations should persist on preview card

---

## 🔧 Configuration Details

### ✅ Supabase Config (Already Configured)

Your files contain:
```javascript
window.SUPABASE_URL = "https://eytswszeopdxmtxxbkrb.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**This is safe to deploy publicly!** The `ANON_KEY` is designed for client-side use.

### ✅ Session Code (Hardcoded for Testing)

Default: `TEST123`

To change it:
1. Edit both `student-supabase.html` and `teacher-supabase.html`
2. Find: `value="TEST123"`
3. Replace with your code: `value="YOURCODE"`

---

## 📱 Share With Students

After deploying, share these links:

**Teacher:**
```
https://your-url.com/teacher-supabase.html
```

**Students:**
```
https://your-url.com/student-supabase.html
Session Code: TEST123
```

Or just share the landing page and let them click:
```
https://your-url.com/
```

---

## ✨ Features Included

✅ **Stylus-only mode** - Palm rejection (Apple Pencil)  
✅ **Smooth writing** - Quadratic curve interpolation  
✅ **Real-time sync** - Instant updates via Supabase  
✅ **Teacher annotations** - Red ink feedback  
✅ **Multi-student support** - Responsive grid layout  
✅ **Session persistence** - Annotations saved during session  
✅ **Modern UI** - Gradient themes and animations  

---

## 🔒 Security & Privacy

✅ **No database writes** - Only ephemeral broadcasts  
✅ **No personal data stored** - Names temporary (session only)  
✅ **Safe keys** - ANON_KEY designed for public use  
✅ **No authentication** - Simple session codes  
✅ **Data cleared on refresh** - Nothing persists  

---

## 🎯 Quick Checklist

Before sharing:
- [ ] Upload 3 files to hosting
- [ ] Test landing page loads
- [ ] Test teacher connects (see green "Connected")
- [ ] Test student joins (appears on teacher dashboard)
- [ ] Test drawing works (black ink on student side)
- [ ] Test annotations work (red ink on teacher side)
- [ ] Test with Apple Pencil (palm rejection works)
- [ ] Test on mobile/tablet (responsive layout)

---

## 🆘 Troubleshooting

### "Connection error" or "Not connected"
- Wait 5-10 seconds (Supabase can be slow on first connect)
- Refresh the page
- Check browser console for errors
- Verify Supabase project is active

### "ERROR: Supabase keys missing"
- This shouldn't happen in deploy files
- Check if config script is present in HTML

### Student doesn't appear on teacher dashboard
- Make sure session codes match exactly
- Both must use `TEST123` (case-sensitive)
- Try refreshing teacher page first, then student

### Annotations don't appear
- Verify you're using Apple Pencil/stylus (palm touches ignored)
- Check student name matches exactly
- Refresh both pages and try again

---

## 🎉 You're Ready!

Your app is:
- ✅ 40 KB total (incredibly lightweight)
- ✅ Zero dependencies (except Supabase CDN)
- ✅ Production-ready
- ✅ Mobile-optimized
- ✅ Multi-student capable

**Just upload and share!** 🚀

---

## 📊 File Structure After Upload

Your hosting should look like:
```
your-site/
├── index.html              ← Landing page (root)
├── student-supabase.html   ← Student interface
└── teacher-supabase.html   ← Teacher dashboard
```

No folders, no build process, no package.json. Just pure HTML! 🎨

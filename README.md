# Live Drawing Tool

A real-time collaborative drawing app where students can draw and teachers can provide instant visual feedback through annotations.

---

## 🎯 What It Does

**Students** draw on a canvas using their stylus or mouse.

**Teachers** view all students' work in real-time and can annotate directly on their drawings to provide feedback.

**Everything syncs instantly** - no delays, no refresh needed.

---

## 🚀 Quick Start

### 1. Setup Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **Project Settings** → **API**
4. Copy your **Project URL** and **anon/public key**
5. Create a `.env` file in the project root:
   ```
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   ```

### 2. Run the Server

```bash
npm install
npm start
```

The app will be available at http://localhost:3000

### 3. Open the App

- **Landing Page:** http://localhost:3000/min/
- **Student:** http://localhost:3000/min/student-supabase.html
- **Teacher:** http://localhost:3000/min/teacher-supabase.html

---

## 👥 How to Use

### For Teachers:

1. Open the **teacher page**
2. Click **"Start Session"** (or use hardcoded session code `TEST123`)
3. Share the session code with students
4. Wait for students to join (they'll appear as cards)
5. Click **"View & Annotate"** on any student to provide feedback
6. Use the toolbar to:
   - Choose colors (Red, Purple, Teal)
   - Draw annotations
   - Erase annotations
   - Undo/Redo
   - Adjust brush size

### For Students:

1. Open the **student page**
2. Enter your name
3. Enter the session code (provided by teacher)
4. Click **"Login"**
5. Start drawing! Use the toolbar to:
   - Choose colors (Black, Blue, Green)
   - Draw strokes
   - Erase strokes
   - Undo/Redo
   - Adjust brush size
   - Toggle stylus-only mode

---

## ✨ Key Features

### Drawing
- **Smooth curves** using quadratic interpolation
- **Dots** with single tap
- **Color palette** (different for student/teacher)
- **Variable brush size** (1-20px)
- **Stylus mode** with palm rejection

### Eraser
- **Real-time feedback** - strokes disappear as you drag
- **Smart detection** - finds strokes along entire path
- **Undo-friendly** - all erasures can be undone

### Undo/Redo
- **Full history** of all actions (draw, erase, clear)
- **Group undo** - erase multiple strokes, undo brings all back
- **Syncs across users** - teachers see student undo/redo and vice versa

### Robustness
- **Auto-save** - work saved after every action
- **Auto-restore** - page refresh doesn't lose work
- **Per-user storage** - multiple students on same browser
- **No data loss** - session storage protects against crashes

### Real-Time Sync
- **Instant updates** - see changes as they happen
- **Bidirectional** - student ↔ teacher
- **All actions sync** - draw, erase, undo, redo, clear
- **No duplicates** - smart ID-based synchronization

---

## 🎨 Toolbar Guide

### Student Toolbar
```
[Black] [Blue] [Green]  |  [Pen] [Eraser]  |  [Size: ■■■■□ 8]  |  [Undo] [Redo] [Clear]  |  [Stylus: ON]
```

### Teacher Toolbar
```
[Red] [Purple] [Teal]  |  [Pen] [Eraser]  |  [Size: ■■■■□ 8]  |  [Undo] [Redo] [Clear]  |  [Stylus: ON]
```

**Stylus Mode:**
- ON = Only pen/stylus input works (palm rejection active)
- OFF = All input devices work

---

## 🛠️ Technical Details

### Architecture
- **Frontend:** Pure HTML/CSS/JavaScript (no frameworks)
- **Backend:** Supabase Realtime (broadcast channels)
- **Storage:** SessionStorage (browser-local, temporary)
- **Rendering:** HTML5 Canvas

### Data Flow
```
Student draws → Store locally → Broadcast to Supabase
                                    ↓
Teacher receives ← Subscribe to Supabase ← Store in memory
```

### Coordinate System
- Base canvas: 800×600 (logical pixels)
- Display canvas: Responsive (scales to fit)
- Strokes stored in base coordinates
- Scaled for display using CSS

### History System
- Immutable stroke array
- History pointer (`historyStep`)
- Undo = move pointer backward
- Redo = move pointer forward
- Erase actions stored as objects with deleted IDs

---

## 📦 Deployment

### Static Hosting (GitHub Pages, Netlify, Vercel)

1. **Hardcode Supabase credentials** in the HTML files:
   ```javascript
   const SUPABASE_URL = 'your_url_here';
   const SUPABASE_ANON_KEY = 'your_key_here';
   ```

2. **Remove** the `/config.js` dependency

3. **Upload** these files:
   - `index.html`
   - `student-supabase.html`
   - `teacher-supabase.html`

4. **Done!** Your app is live.

### With Node Server (Heroku, Railway, Render)

1. Keep `.env` file with Supabase credentials
2. Deploy the entire project
3. Server will serve from `/public` directory
4. `/config.js` endpoint provides credentials securely

---

## 🧪 Testing

### Quick Test (2 minutes)
1. Open student in one window
2. Open teacher in another window
3. Student draws → Teacher should see it
4. Student undoes → Teacher should see it disappear
5. Teacher annotates → Student should see it
6. Refresh student page → Work should restore

### Full Test
See `FINAL-CHECKLIST.md` for comprehensive test scenarios.

---

## 💡 Tips & Tricks

### For Best Experience:
- Use a stylus/pen for smooth drawing
- Enable stylus mode to prevent accidental touches
- Adjust brush size before drawing
- Save work by keeping tab open (session storage)

### For Teachers:
- Open annotation modal on large screen for best view
- Use different colors to highlight different concepts
- Undo is your friend - experiment freely!

### For Students:
- Refresh page anytime - work is saved
- Use dots (single tap) for precise marking
- Colors are preserved when teacher views your work

---

## 🐛 Troubleshooting

**"Student not appearing on teacher side"**
- Check session codes match
- Wait 5-10 seconds for connection
- Check browser console for errors

**"Eraser not working"**
- Switch to Pen tool then back to Eraser
- Make sure you're dragging across strokes
- Eraser radius is 30px minimum

**"Work disappeared after refresh"**
- Only works if you logged in with same username
- Session storage is per-user per-browser
- If you cleared browser data, work is lost

**"Annotations not syncing"**
- Check Supabase connection (console logs)
- Ensure both users have same session code
- Check internet connection

---

## 📄 License

This project is for educational use. Modify as needed!

---

## 🎉 That's It!

You now have a fully functional real-time collaborative drawing tool. Enjoy!

**Questions?** Check the console logs (F12) for debugging info.


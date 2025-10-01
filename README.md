# Live Drawing Tool

A real-time collaborative drawing app where students can draw and teachers can provide instant visual feedback through annotations.

---

## 🎯 What It Does

**Students** draw on a canvas using their stylus or mouse.

**Teachers** view all students' work in real-time and can annotate directly on their drawings to provide feedback.

**Everything syncs instantly** - no delays, no refresh needed.

---

## 🚀 Quick Start

### 1. Supabase Setup

The student and teacher pages ship with the live classroom project's Supabase
credentials inlined for convenience. If you need to use your own project,
update the small `<script>` block near the top of both
`student-supabase.html` and `teacher-supabase.html` with your project's URL and
anon key.

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

1. **Upload** these files:
   - `index.html`
   - `student-supabase.html`
   - `teacher-supabase.html`

2. **Optional:** tweak the inline Supabase credentials in each HTML file if you
   want to point to a different project.

3. **Done!** Your app is live.

### With Node Server (Heroku, Railway, Render)

1. Update the inline Supabase credentials in both HTML files if needed.
2. Deploy the entire project — no extra config files required.

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


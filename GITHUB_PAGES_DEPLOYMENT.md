# GitHub Pages Deployment Guide

## 🌐 **Live Demo**

**URL:** https://swipswaps.github.io/DockerOCR/

---

## ✅ **What Works on GitHub Pages**

- ✅ **Frontend UI** - Full React app with all features
- ✅ **Gemini Vision API** - Works perfectly (cloud-based)
- ✅ **File upload** - HEIC, PNG, JPG, JPEG support
- ✅ **Image filters** - Brightness, contrast, sharpness
- ✅ **Text editing** - Full editor with overlay
- ✅ **Export** - Copy, download TXT, export XLSX

---

## ✅ **What Works on GitHub Pages**

- ✅ **Frontend UI** - Full React app with all features
- ✅ **Gemini Vision API** - Works perfectly (cloud-based)
- ✅ **PaddleOCR** - ✨ **NEW: Works if you run Docker locally!**
- ✅ **Automatic Rotation Detection** - Works with local Docker
- ✅ **File upload** - HEIC, PNG, JPG, JPEG support
- ✅ **Image filters** - Brightness, contrast, sharpness
- ✅ **Text editing** - Full editor with overlay
- ✅ **Export** - Copy, download TXT, export XLSX

---

## 🐳 **Using PaddleOCR with GitHub Pages**

**Yes, PaddleOCR DOES work on GitHub Pages!** Here's how:

### **How It Works**

1. **GitHub Pages serves the UI** (static HTML/CSS/JS from GitHub)
2. **Your browser connects to `http://localhost:5000`** (your local machine)
3. **Docker container runs locally** on your machine
4. **OCR processing happens locally** for complete privacy
5. **Results sent back to browser** and displayed in the UI

This gives you:
- ✅ **Latest UI** from GitHub Pages (always up-to-date)
- ✅ **Local processing** for privacy-sensitive documents
- ✅ **No `npm install` needed** - just run Docker
- ✅ **Automatic rotation detection** with Tesseract
- ✅ **Works on any device** on your local network

---

## 🎯 **Recommended Usage**

### **Option 1: GitHub Pages + Local Docker (Best of Both Worlds)**
Get the latest UI from GitHub Pages with local PaddleOCR processing:

1. **Clone and start Docker on your machine:**
   ```bash
   git clone https://github.com/swipswaps/DockerOCR.git
   cd DockerOCR
   docker compose up -d
   ```

2. **Visit GitHub Pages:**
   ```
   https://swipswaps.github.io/DockerOCR/
   ```

3. **Select PaddleOCR engine** - it connects to your local Docker!

**Benefits:**
- ✅ No need to run `npm install` or `npm run dev`
- ✅ Always get the latest UI updates
- ✅ Local OCR processing for privacy
- ✅ Automatic rotation detection works

### **Option 2: GitHub Pages (Gemini Only)**
Perfect for quick demos without any setup:
1. Visit https://swipswaps.github.io/DockerOCR/
2. Select **"Gemini Vision"** as OCR engine
3. Upload image and extract text
4. ✅ Works instantly, no setup required

### **Option 3: Local Development (Full Control)**
For development and debugging:
```bash
git clone https://github.com/swipswaps/DockerOCR.git
cd DockerOCR
npm install
docker compose up -d
npm run dev
```
Then visit `http://localhost:3000`

---

## 🚀 **Deployment Process**

### **Automatic Deployment (Recommended)**
Every push to `main` branch automatically deploys to GitHub Pages via GitHub Actions.

**Workflow:** `.github/workflows/deploy.yml`
1. Checkout code
2. Install dependencies (`npm ci`)
3. Build app (`npm run build`)
4. Deploy to GitHub Pages

**Status:** Check the "Actions" tab on GitHub

### **Manual Deployment (Alternative)**
```bash
npm run build
# Manually upload dist/ folder to GitHub Pages
```

---

## ⚙️ **Configuration**

### **vite.config.ts**
```typescript
export default defineConfig({
  base: '/DockerOCR/',  // GitHub Pages base path
  // ... other config
});
```

**Important:** The `base` path must match your repository name for GitHub Pages to work correctly.

---

## 🔧 **GitHub Pages Settings**

1. Go to **Settings** → **Pages**
2. **Source:** GitHub Actions
3. **Branch:** main
4. **URL:** https://swipswaps.github.io/DockerOCR/

---

## 🔧 **Troubleshooting GitHub Pages + Docker**

### **PaddleOCR not working on GitHub Pages?**

**Check Docker is running:**
```bash
docker ps | grep paddleocr
# Should show: paddleocr-server container running
```

**Verify container health:**
```bash
curl http://localhost:5000/health
# Should return: {"status":"healthy","service":"PaddleOCR"}
```

**Check browser console (F12):**
- Look for CORS errors
- Look for "Mixed Content" warnings
- Look for connection errors to localhost:5000

**Common issues:**

1. **Mixed Content Policy (HTTPS → HTTP blocked)**
   - **Problem**: Some browsers block HTTPS pages from accessing HTTP endpoints
   - **Solution**: Use `http://localhost:3000` instead (local dev server)
   - **Alternative**: Use Gemini Vision API (cloud-based, works everywhere)

2. **CORS errors**
   - **Problem**: Flask server not allowing GitHub Pages origin
   - **Solution**: Rebuild Docker container with updated CORS config:
     ```bash
     docker compose down
     docker compose build --no-cache
     docker compose up -d
     ```

3. **Container not running**
   - **Problem**: Docker container stopped or not started
   - **Solution**: Start the container:
     ```bash
     docker compose up -d
     ```

4. **Port 5000 in use**
   - **Problem**: Another service using port 5000
   - **Solution**: Stop the conflicting service or change port in `docker-compose.yml`

---

## 📊 **Comparison**

| Feature | GitHub Pages + Docker | GitHub Pages Only | Local Development |
|---------|----------------------|-------------------|-------------------|
| **Gemini Vision** | ✅ Works | ✅ Works | ✅ Works |
| **PaddleOCR** | ✅ Works (local) | ❌ Not available | ✅ Works |
| **Auto-rotation** | ✅ Works (Tesseract) | ❌ Not available | ✅ Works |
| **Setup time** | ~1 minute (Docker) | 0 seconds | ~2 minutes |
| **Internet required** | Yes (UI + Gemini) | Yes (UI + Gemini) | Optional |
| **Docker required** | Yes | No | Yes (for PaddleOCR) |
| **npm install needed** | No | No | Yes |
| **UI updates** | Automatic | Automatic | Manual |
| **Cost** | Free | Free | Free |
| **Best for** | Production use | Quick demos | Development |

---

## 🎯 **Use Cases**

### **GitHub Pages + Local Docker is perfect for:**
- ✅ Production use with latest UI
- ✅ Privacy-sensitive documents (local processing)
- ✅ No need to maintain frontend code
- ✅ Automatic UI updates from GitHub
- ✅ Full PaddleOCR + Tesseract features
- ✅ Quick setup (just Docker, no npm)

### **GitHub Pages Only (Gemini) is perfect for:**
- ✅ Quick demos to clients
- ✅ Testing UI/UX changes
- ✅ Sharing with non-technical users
- ✅ Mobile device testing
- ✅ Zero setup required

### **Local development is better for:**
- ✅ Frontend development
- ✅ Debugging and testing
- ✅ Offline development (no internet)
- ✅ Custom modifications to UI

---

## 🔐 **API Key Management**

**Important:** The Gemini API key is **NOT** included in the deployed app for security.

Users must:
1. Visit https://swipswaps.github.io/DockerOCR/
2. Click **"⚙️ Settings"**
3. Enter their own Gemini API key
4. Key is stored in browser localStorage (never sent to server)

**Get a free API key:** https://aistudio.google.com/apikey

---

## 📈 **Performance**

| Metric | GitHub Pages | Local Dev |
|--------|--------------|-----------|
| **Load time** | ~1-2s | ~0.5s |
| **OCR speed (Gemini)** | 2-5s | 2-5s |
| **OCR speed (PaddleOCR)** | N/A | 1-3s |
| **Uptime** | 99.9% | Depends on you |

---

## 🎉 **Summary**

✅ **GitHub Pages deployment is live and fully functional!**
- ✅ Frontend works perfectly
- ✅ Gemini Vision API fully functional
- ✅ **PaddleOCR works with local Docker** (connects to localhost:5000)
- ✅ **Automatic rotation detection works** (Tesseract in Docker)
- ✅ Automatic deployment on every push
- ✅ CORS configured to allow GitHub Pages origin

**Try it now:** https://swipswaps.github.io/DockerOCR/

**For PaddleOCR:**
1. Clone repo and run `docker compose up -d`
2. Visit GitHub Pages
3. Select PaddleOCR engine
4. ✅ Works!


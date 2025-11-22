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

## ⚠️ **What Doesn't Work on GitHub Pages**

- ❌ **PaddleOCR** - Requires Docker backend server
- ❌ **Docker container** - Cannot run on static hosting

**Why?** GitHub Pages only hosts static files (HTML, CSS, JS). It cannot run:
- Docker containers
- Backend servers (Flask, Node.js, etc.)
- Database servers

---

## 🎯 **Recommended Usage**

### **Option 1: GitHub Pages (Gemini Only)**
Perfect for quick demos and testing without Docker:
1. Visit https://swipswaps.github.io/DockerOCR/
2. Select **"Gemini Vision"** as OCR engine
3. Upload image and extract text
4. ✅ Works instantly, no setup required

### **Option 2: Local Development (Full Features)**
For PaddleOCR support with Docker:
```bash
git clone https://github.com/swipswaps/DockerOCR.git
cd DockerOCR
npm install
docker compose up -d
npm run dev
```
Then select **"PaddleOCR"** engine for offline processing.

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

## 📊 **Comparison**

| Feature | GitHub Pages | Local Development |
|---------|--------------|-------------------|
| **Gemini Vision** | ✅ Works | ✅ Works |
| **PaddleOCR** | ❌ Not available | ✅ Works |
| **Setup time** | 0 seconds | ~2 minutes |
| **Internet required** | Yes (Gemini API) | Optional |
| **Docker required** | No | Yes (for PaddleOCR) |
| **Cost** | Free | Free |
| **Best for** | Quick demos | Full features |

---

## 🎯 **Use Cases**

### **GitHub Pages is perfect for:**
- ✅ Quick demos to clients
- ✅ Testing UI/UX changes
- ✅ Sharing with non-technical users
- ✅ Mobile device testing
- ✅ Cloud-based OCR (Gemini)

### **Local development is better for:**
- ✅ Offline OCR processing
- ✅ Privacy-sensitive documents
- ✅ Testing PaddleOCR features
- ✅ Development and debugging
- ✅ Full Docker integration

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

✅ **GitHub Pages deployment is live!**
- Frontend works perfectly
- Gemini Vision API fully functional
- PaddleOCR requires local Docker setup
- Automatic deployment on every push

**Try it now:** https://swipswaps.github.io/DockerOCR/


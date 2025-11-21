# 🪟 Windows PowerShell Setup Guide

Quick guide for running DockerOCR on Windows.

---

## ✅ What Works on Windows

| Feature | Status | Notes |
|---------|--------|-------|
| `npm install` | ✅ Works | Node.js is cross-platform |
| `npm run dev` | ✅ Works | Vite runs on Windows |
| Gemini OCR | ✅ Works | Cloud API, platform-independent |
| HEIC Conversion | ✅ Works | Browser-based (heic2any) |
| Image Editing | ✅ Works | Canvas API works everywhere |
| PaddleOCR | ⚠️ Requires Docker Desktop | Needs WSL2 or Hyper-V |

---

## 🚀 Quick Start (Without Docker)

### Option 1: Gemini Only (Fastest)

```powershell
# Clone the repo
git clone https://github.com/swipswaps/DockerOCR.git
cd DockerOCR

# Create .env.local file
New-Item -Path .env.local -ItemType File
Add-Content -Path .env.local -Value "GEMINI_API_KEY=your_actual_api_key_here"

# Install dependencies
npm install

# Run the app
npm run dev
```

**Result:** App works with Gemini OCR engine (cloud-based, high accuracy)

---

## 🐳 Full Setup (With PaddleOCR)

### Prerequisites
1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Git for Windows** - [Download](https://git-scm.com/download/win)
3. **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)

### Step 1: Install Docker Desktop
1. Download Docker Desktop for Windows
2. Install and restart your computer
3. Open Docker Desktop
4. Go to Settings → General
5. Enable "Use WSL 2 based engine" (recommended)
6. Click "Apply & Restart"

### Step 2: Clone and Setup
```powershell
# Clone the repo
git clone https://github.com/swipswaps/DockerOCR.git
cd DockerOCR

# Create .env.local
New-Item -Path .env.local -ItemType File
notepad .env.local
# Add: GEMINI_API_KEY=your_key_here

# Install dependencies
npm install
```

### Step 3: Start PaddleOCR Container
```powershell
# Start Docker container
docker compose up -d

# Wait 60 seconds for initialization
Start-Sleep -Seconds 60

# Check container status
docker logs paddleocr-server

# Should see: "PaddleOCR initialized successfully"
```

### Step 4: Run the App
```powershell
npm run dev
```

Open browser to `http://localhost:3000`

---

## 🔧 Self-Healing Features

The app now **automatically detects and fixes** Docker issues!

### What Happens When Docker Isn't Running

1. **You select PaddleOCR engine**
2. **Click "Start Extraction"**
3. **App detects Docker is not running**
4. **Shows "Setup Docker" modal with:**
   - ✅ Real-time health status
   - ✅ Platform-specific instructions
   - ✅ Copy-paste commands
   - ✅ "Wait for Container" button
   - ✅ Link to Docker installation

5. **You run:** `docker compose up -d`
6. **Click "Wait for Container"**
7. **App automatically retries every 5 seconds**
8. **✅ Processing succeeds!**

### Automatic Fallback

If Docker is unavailable, the app **automatically falls back to Gemini**:
- ⚠️ Shows warning in logs
- 🔄 Switches to Gemini Vision API
- ✅ Processing continues without interruption

---

## ⚠️ Common Windows Issues

### Issue 1: PowerShell `&&` Not Supported

**Problem:** PowerShell 5.1 doesn't support `&&` operator

```powershell
# ❌ This fails in PowerShell 5.1
git clone https://github.com/swipswaps/DockerOCR.git && cd DockerOCR && npm install

# ✅ Use semicolons instead
git clone https://github.com/swipswaps/DockerOCR.git; cd DockerOCR; npm install

# ✅ Or run separately
git clone https://github.com/swipswaps/DockerOCR.git
cd DockerOCR
npm install
```

### Issue 2: Execution Policy Error

**Problem:** "cannot be loaded because running scripts is disabled"

```powershell
# Fix: Allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue 3: Docker Not Running

**Problem:** "Cannot connect to the Docker daemon"

**Solution:**
1. Open Docker Desktop manually
2. Wait for it to fully start (whale icon in system tray)
3. Retry: `docker compose up -d`

### Issue 4: Port 3000 Already in Use

**Problem:** Another app is using port 3000

```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

### Issue 5: Port 5000 Already in Use

**Problem:** Another app is using port 5000 (PaddleOCR)

```powershell
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
# Change "5000:5000" to "5001:5000"
```

---

## 🎯 Recommended Windows Workflow

### Daily Use
```powershell
# 1. Start Docker Desktop (if using PaddleOCR)
# 2. Open PowerShell in project directory
cd C:\path\to\DockerOCR

# 3. Start PaddleOCR (if needed)
docker compose up -d

# 4. Run the app
npm run dev

# 5. Open browser to http://localhost:3000
```

### Shutdown
```powershell
# Stop the dev server (Ctrl+C in terminal)

# Stop Docker container (optional)
docker compose down
```

---

## 📊 Performance on Windows

| Metric | Performance | Notes |
|--------|-------------|-------|
| Initial Load | ~500ms | Same as Linux/macOS |
| HEIC Conversion | 2-5s | Browser-based, platform-independent |
| Gemini OCR | 10-30s | Cloud API, network-dependent |
| PaddleOCR | 15-60s | Docker overhead on Windows |
| Image Filters | 60fps | Canvas API, hardware-accelerated |

**Note:** PaddleOCR is slightly slower on Windows due to Docker Desktop virtualization overhead. For best performance, use WSL2 backend.

---

## ✅ Success Checklist

- [ ] Node.js installed (`node --version`)
- [ ] Git installed (`git --version`)
- [ ] Docker Desktop installed (if using PaddleOCR)
- [ ] WSL2 enabled in Docker Desktop
- [ ] `.env.local` created with Gemini API key
- [ ] `npm install` completed successfully
- [ ] `npm run dev` starts without errors
- [ ] Browser opens to `http://localhost:3000`
- [ ] Can upload and process images

---

## 🆘 Getting Help

### In-App Help
- Click **"Setup Docker"** button in Process tab
- Shows real-time health status
- Platform-specific instructions
- Copy-paste commands

### Documentation
- [SELF_HEALING_GUIDE.md](SELF_HEALING_GUIDE.md) - Auto-healing features
- [AUDIT_SUMMARY.md](AUDIT_SUMMARY.md) - Code quality overview
- [IMPROVEMENT_GUIDE.md](IMPROVEMENT_GUIDE.md) - Enhancement guide

### Troubleshooting
```powershell
# Check Docker status
docker --version
docker ps

# Check container logs
docker logs paddleocr-server

# Rebuild container
docker compose down
docker compose up -d --build

# Check Node.js
node --version
npm --version
```

---

**The app now works seamlessly on Windows with automatic Docker setup!** 🎉


# 🥗 Food Label AI

**An AI-native health co-pilot that decodes food ingredient lists at the moment decisions matter.**

Instead of overwhelming users with raw nutritional data, Food Label AI provides ingredient-level reasoning, clear health insights, and honest uncertainty—making informed food choices accessible to everyone.

![Food Label AI Demo](https://img.shields.io/badge/Status-Local%20Prototype-green?style=for-the-badge)


---

## 🎯 **Why This Matters**

Standing in a grocery aisle, trying to decode "maltodextrin" or "natural flavors" is cognitively exhausting. Food Label AI acts as your real-time nutritional advisor, explaining:
- What each ingredient actually is
- How it impacts your health
- Whether you should be concerned

**Key Principle:** AI is the interface, not an add-on. The system reasons about ingredients, not just displays them.

---

## ✨ **Features**

### 🤖 **AI-Native Experience**
- **Intent-first interaction**: Paste ingredients or snap a photo—no setup, no filters
- **Reasoning-driven**: Explains *why* ingredients matter, not just *what* they are
- **Uncertainty-aware**: Honest about what it knows and doesn't know

### 📊 **Smart Analysis**
- **Individual ingredient scoring**: Each ingredient gets a health score (0-100) with detailed reasoning
- **Overall health assessment**: Quick visual summary of the entire product
- **Context-aware insights**: Differentiates between "consume in moderation" vs "limit or avoid"

### 📸 **Flexible Input Methods**
- **Text Mode**: Paste ingredient lists directly
- **Photo Mode**: Camera capture or image upload with OCR
- **Auto-extraction**: Tesseract.js extracts text from label photos

### 🎨 **Beautiful, Functional UI**
- Dark mode design optimized for readability
- Color-coded health scores (green/yellow/red)
- Responsive layout for mobile and desktop
- Real-time loading indicators

---

## 🏗️ **Architecture**

This is a **local-first prototype** designed to prioritize experience quality and privacy over deployment complexity.

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           React Frontend (Port 3000)                 │  │
│  │  • Text/Camera input                                 │  │
│  │  • OCR with Tesseract.js                            │  │
│  │  • Result visualization                              │  │
│  └──────────────────┬──────────────────────────────────┘  │
└─────────────────────┼──────────────────────────────────────┘
                      │ HTTP POST
                      │ /webhook/analyze-label
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              AI REASONING LAYER                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │            n8n Workflow (Port 5678)                  │  │
│  │  • Webhook receiver                                  │  │
│  │  • Prompt engineering                                │  │
│  │  • Response formatting                               │  │
│  └──────────────────┬──────────────────────────────────┘  │
└─────────────────────┼──────────────────────────────────────┘
                      │ Ollama API
                      │ POST /api/generate
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   LLM INFERENCE                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │          Ollama (Local LLM Runtime)                  │  │
│  │  • Model: llama3 / mistral / etc.                   │  │
│  │  • Local inference (no external APIs)               │  │
│  │  • Privacy-preserving                                │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 **Getting Started**

### **Prerequisites**

Before running Food Label AI, ensure you have:

| Requirement | Version | Download |
|------------|---------|----------|
| **Node.js** | ≥ 18.x | [nodejs.org](https://nodejs.org) |
| **npm** | ≥ 9.x | (comes with Node.js) |
| **Docker** | Latest | [docker.com](https://www.docker.com/products/docker-desktop) |
| **Ollama** | Latest | [ollama.com](https://ollama.com) |

---

### **Step 1: Set Up Ollama (LLM Runtime)**

Ollama runs the local AI model that analyzes ingredients.

#### 1.1 Install Ollama
```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download installer from https://ollama.com/download
```

#### 1.2 Pull an LLM Model
```bash
# Recommended: Llama 3 (7B parameters, good balance)
ollama pull llama3

# Alternative: Mistral (lighter, faster)
ollama pull mistral

# Alternative: Llama 3.2 (latest version)
ollama pull llama3.2
```

#### 1.3 Verify Installation
```bash
ollama list
# Should show your downloaded model

ollama run llama3
# Interactive test - type "hello" and press Enter
# Press Ctrl+D to exit
```

**Keep Ollama running** in the background. It will serve requests on `http://localhost:11434`.

---

### **Step 2: Set Up n8n (AI Orchestration)**

n8n handles the workflow between your frontend and Ollama.

#### 2.1 Start n8n with Docker
```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

#### 2.2 Access n8n Interface
Open your browser to **http://localhost:5678**

#### 2.3 Import the Workflow

1. Click **"Workflows"** in the left sidebar
2. Click **"Import from File"**
3. Select `n8n/Label_Analyzer.json` from this repository
4. The workflow will appear in your canvas

#### 2.4 Configure Ollama Connection

1. Click on the **"AI Agent"** node in the workflow
2. Under **"Chat Model"**, verify the Ollama settings:
   - **Base URL**: `http://host.docker.internal:11434` (for Docker)
     - *On Linux, use `http://172.17.0.1:11434`*
   - **Model**: `llama3` (or your chosen model)
3. Click **"Save"**

#### 2.5 Activate the Workflow

1. Toggle the **"Active"** switch at the top right to **ON**
2. Note the webhook URL: `http://localhost:5678/webhook/analyze-label`

**Your AI backend is now live! 🎉**

---

### **Step 3: Set Up React Frontend**

#### 3.1 Navigate to Frontend Directory
```bash
cd frontend/food-label-analyzer
```

#### 3.2 Install Dependencies
```bash
npm install
```

#### 3.3 Configure Environment
Create a `.env` file:
```bash
# frontend/food-label-analyzer/.env
REACT_APP_N8N_WEBHOOK_URL=http://localhost:5678/webhook/analyze-label
```

#### 3.4 Start Development Server
```bash
npm start
```

The app will open at **http://localhost:3000** 🎊

---

## 🎮 **Usage Guide**

### **Text Mode** 📝

1. Click **"Text Mode"** at the top
2. Paste an ingredient list (e.g., from a product website)
3. Press **Enter** or wait for auto-analysis
4. Review individual ingredient scores and reasoning

**Example Input:**
```
Whole grain rolled oats, sugar, artificial strawberry flavor (red 40), 
maltodextrin, soybean oil, whey protein concentrate
```

---

### **Photo Mode** 📸

#### Option A: Use Camera
1. Click **"Photo Mode"**
2. Click **"Use Camera"**
3. Allow camera permissions
4. Point at the ingredient list
5. Click the capture button
6. AI automatically extracts and analyzes text

#### Option B: Upload Image
1. Click **"Photo Mode"**
2. Click **"Upload Image"**
3. Select a photo of an ingredient list
4. Wait for OCR extraction
5. Review AI analysis

**Tips for Best Results:**
- ✅ Good lighting, no glare
- ✅ Clear, focused photo
- ✅ Ingredient text fills most of the frame
- ✅ Horizontal orientation preferred

---

## 🧪 **Testing the System**

### Quick Smoke Test

**Input this ingredient list:**
```
Enriched wheat flour, water, high fructose corn syrup, 
yeast, partially hydrogenated soybean oil, 
calcium propionate (preservative), mono- and diglycerides
```

**Expected Output:**
- 5-7 ingredients analyzed individually
- Health scores ranging from 20-70/100
- Warnings about HFCS and trans fats
- Overall score around 40-50/100 (Fair)

---

## 📁 **Project Structure**

```
food-label-ai/
│
├── frontend/
│   └── food-label-analyzer/
│       ├── public/
│       ├── src/
│       │   ├── FoodLabelAnalyzer.jsx    # Main React component
│       │   ├── App.js
│       │   └── index.js
│       ├── package.json
│       └── .env                          # API configuration
│
├── n8n/
│   └── Label_Analyzer.json               # n8n workflow export
│
├── prompts/
│   └── ingredient_copilot_prompt.txt     # AI reasoning prompt
│
├── docs/
│   └── architecture.md                   # Detailed architecture docs
│
└── README.md                              # This file
```

---

## 🔧 **Troubleshooting**

### **Problem: React app shows "Could not connect to n8n"**

**Solution:**
1. Verify n8n is running: `docker ps | grep n8n`
2. Check workflow is active in n8n UI
3. Confirm webhook URL in `.env` matches n8n endpoint
4. Restart React dev server: `npm start`

---

### **Problem: "Analysis failed: No response from AI"**

**Solution:**
1. Verify Ollama is running: `ollama list`
2. Check Ollama API: `curl http://localhost:11434/api/tags`
3. In n8n, test the AI Agent node manually
4. Check n8n logs: `docker logs n8n`

---

### **Problem: OCR not extracting text from images**

**Solution:**
1. Ensure Tesseract.js loaded (check browser console)
2. Try a clearer, higher-contrast photo
3. Use Text Mode as a fallback
4. Check browser console for OCR errors

---

### **Problem: Ollama on Linux can't connect from Docker**

**Solution:**
Change the Ollama base URL in n8n to:
```
http://172.17.0.1:11434
```
(This is Docker's default bridge network gateway)

---

## 🎨 **Customization**

### **Change the AI Model**

Edit the n8n workflow:
1. Open the **"AI Agent"** node
2. Change **"Model"** to: `mistral`, `llama3.2`, `codellama`, etc.
3. Save and test

### **Modify Reasoning Prompt**

Edit `prompts/ingredient_copilot_prompt.txt`, then:
1. Copy the new prompt
2. In n8n, open the **"AI Agent"** node
3. Update the system message
4. Save workflow

### **Adjust Health Score Thresholds**

In `FoodLabelAnalyzer.jsx`:
```javascript
const getScoreColor = (score) => {
  if (score >= 80) return 'Excellent';  // Change these thresholds
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  // ...
};
```

---

## 🚀 **Deploying to Production**

While this is a local prototype, here's how to scale:

### **Option 1: Cloud LLM (Recommended)**
1. Replace Ollama with OpenAI/Anthropic API in n8n
2. Deploy n8n to Railway/Render/Heroku
3. Deploy React to Vercel/Netlify
4. Update API endpoints

### **Option 2: Self-Hosted LLM**
1. Deploy Ollama on a GPU server (AWS EC2 g4dn, Vast.ai)
2. Run n8n on the same server or separately
3. Deploy React frontend to CDN
4. Add authentication and rate limiting


## 🙏 **Acknowledgments**

- **Ollama** - Local LLM inference
- **n8n** - AI workflow orchestration
- **Tesseract.js** - OCR capabilities
- **React** - Frontend framework
- **Lucide React** - Icon system

---

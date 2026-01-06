import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Type, Sparkles, AlertTriangle, X, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

const FoodLabelAnalyzer = () => {
  const [mode, setMode] = useState('text');
  const [preview, setPreview] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [tesseractLoaded, setTesseractLoaded] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const N8N_URL = 'http://localhost:5678/webhook/analyze-label';

  // Load Tesseract on mount
  useEffect(() => {
    loadTesseract();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    streamRef.current = stream;
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const loadTesseract = () => {
    if (window.Tesseract) {
      setTesseractLoaded(true);
      return;
    }
    
    // Check if script is already being loaded
    if (document.querySelector('script[src*="tesseract"]')) {
      const checkInterval = setInterval(() => {
        if (window.Tesseract) {
          setTesseractLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js';
    script.async = true;
    script.onload = () => setTesseractLoaded(true);
    script.onerror = () => setError('Failed to load OCR library. Please refresh the page.');
    document.head.appendChild(script);
  };

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current && mediaStream) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => {
            console.error('Video play error:', err);
            setError('Could not start camera preview');
          });
        }
      }, 100);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied. Please enable camera permissions or use Text Mode.');
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) {
      setError('Camera not ready. Please try again.');
      return;
    }

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      setError('Camera not ready. Please wait a moment and try again.');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Canvas error. Please try again.');
      return;
    }
    
    ctx.drawImage(video, 0, 0);
    
    try {
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setPreview(imageData);
      stopCamera();
      processOCR(imageData);
    } catch (err) {
      console.error('Capture error:', err);
      setError('Failed to capture photo. Please try again.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      processOCR(reader.result);
    };
    reader.onerror = () => {
      setError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const processOCR = async (imageData) => {
    if (!window.Tesseract) {
      setError('OCR library not loaded yet. Please wait a moment and try again, or use Text Mode.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await window.Tesseract.recognize(imageData, 'eng', {
        logger: m => console.log(m)
      });
      
      if (!result || !result.data || !result.data.text) {
        setError('Could not extract text from image. Please ensure the image is clear and try again, or use Text Mode.');
        setIsProcessing(false);
        return;
      }

      let text = result.data.text
        .replace(/[|\\]/g, 'I')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s,.\-()%]/g, '')
        .trim();
      
      if (text.length < 5) {
        setError('Not enough text found in image. Please ensure the label is clearly visible or use Text Mode.');
        setIsProcessing(false);
        return;
      }
      
      setTextInput(text);
      analyzeLabel(text);
      
    } catch (err) {
      console.error('OCR error:', err);
      setError('Text extraction failed. Please try a clearer image or use Text Mode.');
      setIsProcessing(false);
    }
  };

  const analyzeLabel = async (text) => {
    const input = text || textInput;
    if (!input.trim()) {
      setError('Please provide ingredient text to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 30s timeout

      const response = await fetch(N8N_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('Raw response:', data);
      
      let analysisText = data.analysis_text || data.ai_analysis || data.summary || data.output || '';
      
      if (data.fullOutput && typeof data.fullOutput === 'string') {
        try {
          const parsed = JSON.parse(data.fullOutput);
          analysisText = parsed.analysis_text || parsed.output || analysisText;
        } catch (e) {
          analysisText = data.fullOutput;
        }
      }
      
      if (!analysisText) {
        throw new Error('No analysis data received from server');
      }

      const parsedIngredients = parseIntoIngredients(analysisText);
      
      if (parsedIngredients.length === 0) {
        setError('Could not parse ingredient analysis. Please check the response format.');
        setIsAnalyzing(false);
        return;
      }

      const avgScore = Math.round(
        parsedIngredients.reduce((sum, ing) => sum + ing.healthScore, 0) / parsedIngredients.length
      );
      
      setAnalysis({
        ingredients: parsedIngredients,
        overallScore: avgScore,
        rawText: analysisText
      });
      
    } catch (err) {
      console.error('Analysis error:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your n8n connection and try again.');
      } else if (err.message.includes('Failed to fetch')) {
        setError('Could not connect to n8n server at localhost:5678. Please ensure n8n is running.');
      } else {
        setError(`Analysis failed: ${err.message}`);
      }
    } finally {
      setIsAnalyzing(false);
      setIsProcessing(false);
    }
  };

  const parseIntoIngredients = (text) => {
    if (!text) return [];
    
    const ingredients = [];
    
    // Pattern 1: "Ingredient Name Analysis: description Health Score: 95/100"
    const pattern1 = /([A-Za-z0-9\s\(\),.-]+?)\s+Analysis:\s+(.*?)Health\s+Score:\s*(\d+)\/100/gis;
    let matches = [...text.matchAll(pattern1)];
    
    if (matches.length > 0) {
      matches.forEach(match => {
        const score = parseInt(match[3]);
        if (!isNaN(score) && score >= 0 && score <= 100) {
          ingredients.push({
            name: match[1].trim(),
            description: match[2].trim(),
            healthScore: score
          });
        }
      });
      return ingredients;
    }
    
    // Pattern 2: Split by "Health Score:" and work backwards
    const parts = text.split(/Health\s+Score:\s*(\d+)\/100/gi);
    
    for (let i = 0; i < parts.length - 1; i += 2) {
      const textPart = parts[i].trim();
      const score = parseInt(parts[i + 1]);
      
      if (!textPart || isNaN(score) || score < 0 || score > 100) continue;
      
      // Try to extract ingredient name and description
      const analysisMatch = textPart.match(/([A-Za-z0-9\s\(\),.-]+?)\s+Analysis:\s+(.*)/is);
      
      if (analysisMatch) {
        ingredients.push({
          name: analysisMatch[1].trim(),
          description: analysisMatch[2].trim(),
          healthScore: score
        });
      } else {
        // Just use the last part as name
        const sentences = textPart.split(/[.!?]/).filter(s => s.trim());
        const lastSentence = sentences[sentences.length - 1] || textPart.substring(Math.max(0, textPart.length - 100));
        
        ingredients.push({
          name: lastSentence.trim().substring(0, 50) + (lastSentence.length > 50 ? '...' : ''),
          description: textPart.trim(),
          healthScore: score
        });
      }
    }
    
    return ingredients;
  };

  const reset = () => {
    setPreview(null);
    setTextInput('');
    setAnalysis(null);
    setError(null);
    setIsAnalyzing(false);
    setIsProcessing(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300', bar: 'bg-emerald-500' };
    if (score >= 60) return { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-300', bar: 'bg-green-500' };
    if (score >= 40) return { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-300', bar: 'bg-yellow-500' };
    if (score >= 20) return { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-300', bar: 'bg-orange-500' };
    return { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-300', bar: 'bg-red-500' };
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Harmful';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Food Label AI
          </h1>
        </div>
        <p className="text-center text-slate-400">AI-powered ingredient analysis • Individual health scoring</p>
      </div>

      <div className="max-w-6xl mx-auto px-6 mb-8">
        <div className="flex gap-3 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-2">
          <button
            onClick={() => setMode('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              mode === 'text'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-5 h-5" />
            Text Mode
          </button>
          <button
            onClick={() => setMode('image')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              mode === 'image'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-5 h-5" />
            Photo Mode
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto px-6 mb-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 pb-12">
        {mode === 'text' ? (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Type className="w-5 h-5 text-emerald-400" />
              Paste Ingredient List
            </h3>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && textInput.trim() && !isAnalyzing) {
                  e.preventDefault();
                  analyzeLabel();
                }
              }}
              placeholder="Example: Whole grain rolled oats, sugar, artificial strawberry flavor (red 40), maltodextrin, soybean oil, whey..."
              className="w-full h-40 bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              disabled={isAnalyzing}
            />
            <div className="flex items-center justify-between mt-4">
              {isAnalyzing ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">AI analyzing ingredients...</span>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Press Enter to analyze • Shift+Enter for new line</p>
              )}
              <button
                onClick={reset}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isAnalyzing}
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {showCamera && (
              <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
                <div className="relative w-full max-w-2xl">
                  <button
                    onClick={stopCamera}
                    className="absolute top-4 right-4 z-10 bg-slate-900/80 p-2 rounded-full hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-2xl bg-black"
                  />
                  <button
                    onClick={capturePhoto}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full border-4 border-white hover:scale-110 transition-transform active:scale-95"
                    aria-label="Capture photo"
                  />
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            {!preview && (
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={startCamera}
                  disabled={!tesseractLoaded}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 hover:border-emerald-500 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-700"
                >
                  <Camera className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
                  <h3 className="text-lg font-semibold mb-2">Use Camera</h3>
                  <p className="text-sm text-slate-400">
                    {tesseractLoaded ? 'Take a photo of label' : 'Loading OCR...'}
                  </p>
                </button>

                <label className={`bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 rounded-2xl p-8 transition-all ${
                  tesseractLoaded 
                    ? 'hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/20 cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed'
                }`}>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
                  <h3 className="text-lg font-semibold mb-2">Upload Image</h3>
                  <p className="text-sm text-slate-400">
                    {tesseractLoaded ? 'Choose from gallery' : 'Loading OCR...'}
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={!tesseractLoaded}
                  />
                </label>
              </div>
            )}

            {preview && (
              <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
                <div className="relative">
                  <img
                    src={preview}
                    alt="Food label"
                    className="w-full h-64 object-contain rounded-xl bg-slate-950"
                  />
                  <button
                    onClick={reset}
                    className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 p-2 rounded-xl transition-colors"
                    aria-label="Remove image"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {(isProcessing || isAnalyzing) && (
                  <div className="mt-6 flex items-center justify-center gap-3 text-emerald-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isProcessing ? 'Reading text from image...' : 'AI analyzing ingredients...'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {analysis && (
          <div className="mt-8 space-y-6">
            {/* Overall Health Score */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Overall Health Score</h2>
                  <p className="text-sm text-slate-400">Average of all ingredients analyzed</p>
                </div>
                <div className={`text-5xl font-black ${
                  analysis.overallScore >= 70 ? 'text-emerald-400' :
                  analysis.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {analysis.overallScore}<span className="text-2xl text-slate-500">/100</span>
                </div>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    analysis.overallScore >= 70 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                    analysis.overallScore >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                    'bg-gradient-to-r from-red-500 to-red-400'
                  }`}
                  style={{ width: `${analysis.overallScore}%` }}
                />
              </div>
            </div>

            {/* Ingredient Cards Grid */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-6 h-6 text-emerald-400" />
                <h3 className="text-2xl font-bold">Individual Ingredient Analysis</h3>
                <span className="px-3 py-1 bg-slate-800 rounded-full text-sm text-slate-400">
                  {analysis.ingredients.length} {analysis.ingredients.length === 1 ? 'ingredient' : 'ingredients'}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {analysis.ingredients.map((ingredient, idx) => {
                  const colors = getScoreColor(ingredient.healthScore);
                  const label = getScoreLabel(ingredient.healthScore);
                  
                  return (
                    <div
                      key={idx}
                      className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-6 border-2 border-slate-700/50 hover:border-slate-600 transition-all hover:shadow-xl group"
                    >
                      {/* Header with Name and Score */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                            {ingredient.name}
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">Ingredient #{idx + 1}</span>
                        </div>
                        
                        {/* Score Badge */}
                        <div className={`flex flex-col items-end ${colors.bg} ${colors.border} border-2 rounded-xl px-4 py-3 min-w-[90px]`}>
                          <div className={`text-3xl font-black ${colors.text} leading-none`}>
                            {ingredient.healthScore}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">/ 100</div>
                          <div className={`text-xs font-bold ${colors.text} mt-1`}>
                            {label}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${colors.bar} rounded-full transition-all duration-1000`}
                            style={{ width: `${ingredient.healthScore}%` }}
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {ingredient.description}
                      </p>

                      {/* Health Indicator */}
                      <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center gap-2">
                        {ingredient.healthScore >= 70 ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-emerald-400 font-medium">Safe for consumption</span>
                          </>
                        ) : ingredient.healthScore >= 40 ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            <span className="text-xs text-yellow-400 font-medium">Consume in moderation</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4 text-red-400" />
                            <span className="text-xs text-red-400 font-medium">Limit or avoid</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodLabelAnalyzer;
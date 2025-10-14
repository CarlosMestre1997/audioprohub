import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Upload, Download, Scissors, Trash2, Mic, MicOff, Undo2, Home } from 'lucide-react';

const SamplX = () => {
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [slices, setSlices] = useState([]);
  const [activeSlice, setActiveSlice] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sliceSettings, setSliceSettings] = useState({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomOffset, setZoomOffset] = useState(0);
  const [pendingSliceStart, setPendingSliceStart] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [downloadCount, setDownloadCount] = useState(0);
  const [downloadsRemaining, setDownloadsRemaining] = useState(3);
  const [isPremium, setIsPremium] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [recordedAudio, setRecordedAudio] = useState(null);
  
  const audioContextRef = useRef(null);
  const sourceNodesRef = useRef([]);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const destinationRef = useRef(null);
  const audioBuffersRef = useRef({});
  const flangerNodesRef = useRef({});
  const streamRef = useRef(null);
  const recordingBufferRef = useRef(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current.resume();
    
    // Check for auth token and premium status
    checkAuthStatus();
    
    // Check if user returned from Stripe payment
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    if (paymentSuccess === 'success' && sessionId) {
      console.log('=== STRIPE PAYMENT SUCCESS DETECTED ===');
      console.log('Session ID:', sessionId);
      
      // Refresh premium status after successful payment
      setTimeout(() => {
        refreshPremiumStatus();
        alert('🎉 Payment successful! You now have unlimited downloads!');
      }, 1000);
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Load download count from localStorage
    const savedCount = localStorage.getItem('samplx_downloads');
    if (savedCount) {
      setDownloadCount(parseInt(savedCount));
      setDownloadsRemaining(Math.max(0, 3 - parseInt(savedCount)));
    }
    
    // Check premium status periodically (every 10 seconds)
    const premiumCheckInterval = setInterval(() => {
      console.log('⏰ Periodic premium status check...');
      refreshPremiumStatus();
    }, 10000);
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      clearInterval(premiumCheckInterval);
    };
  }, []);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('audioHub_token');
    const email = localStorage.getItem('audioHub_userEmail');
    
    if (email) {
      setUserEmail(email);
      // Check if user is premium from landing page subscription
      const userData = localStorage.getItem('audioHub_user');
      console.log('=== SAMPLX PREMIUM CHECK ===');
      console.log('User email:', email);
      console.log('User data from localStorage:', userData);
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          console.log('Parsed user object:', user);
          console.log('User subscription:', user.subscription);
          const isUserPremium = user.subscription === 'premium';
          console.log('Is user premium?', isUserPremium);
          setIsPremium(isUserPremium);
        } catch (e) {
          console.log('Error parsing user data:', e);
          setIsPremium(false);
        }
      } else {
        console.log('No user data found in localStorage');
        setIsPremium(false);
      }
    }
  };

  // Function to refresh premium status (call this after Stripe payment)
  const refreshPremiumStatus = () => {
    console.log('=== REFRESHING PREMIUM STATUS ===');
    const userData = localStorage.getItem('audioHub_user');
    console.log('Refreshed user data:', userData);
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const isUserPremium = user.subscription === 'premium';
        console.log('Refreshed premium status:', isUserPremium);
        setIsPremium(isUserPremium);
        return isUserPremium;
      } catch (e) {
        console.log('Error refreshing user data:', e);
        setIsPremium(false);
        return false;
      }
    }
    return false;
  };

  useEffect(() => {
    if (audioBuffer) {
      drawWaveform(audioBuffer);
    }
  }, [zoomLevel, zoomOffset, slices, activeSlice, pendingSliceStart, audioBuffer]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        stopAllAudio();
        return;
      }
      
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      
      const keyMap = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
      const index = keyMap.indexOf(e.code);
      
      if (index !== -1 && slices[index]) {
        playSlice(index);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [slices, sliceSettings]);

  // History management functions
  const saveToHistory = (newSlices, newSettings) => {
    const historyEntry = {
      slices: [...newSlices],
      settings: { ...newSettings },
      timestamp: Date.now()
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(historyEntry);
    
    // Limit history to 50 entries
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    
    setHistory(newHistory);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevEntry = history[historyIndex - 1];
      setSlices(prevEntry.slices);
      setSliceSettings(prevEntry.settings);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const loadAudioFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
    const arrayBuffer = await file.arrayBuffer();
      const decoded = await audioContextRef.current.decodeAudioData(arrayBuffer);
      setAudioBuffer(decoded);
    setSlices([]);
    setSliceSettings({});
    setPendingSliceStart(null);
    setHistory([]);
    setHistoryIndex(-1);
      audioBuffersRef.current = {};
    } catch (error) {
      console.error('Error loading audio:', error);
      alert('Failed to load audio file');
    }
  };

  const drawWaveform = (buffer) => {
    if (!canvasRef.current || !buffer) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    const data = buffer.getChannelData(0);
    const visibleDuration = buffer.duration / zoomLevel;
    const startTime = Math.min(zoomOffset, buffer.duration - visibleDuration);
    const endTime = startTime + visibleDuration;
    
    const startSample = Math.floor(startTime * buffer.sampleRate);
    const endSample = Math.floor(endTime * buffer.sampleRate);
    const step = Math.ceil((endSample - startSample) / width);

    ctx.strokeStyle = '#00b4d8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
      const sampleIndex = startSample + i * step;
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const sample = data[Math.min(sampleIndex + j, data.length - 1)];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }

      const yMin = ((1 + min) / 2) * height;
      const yMax = ((1 + max) / 2) * height;

      if (i === 0) {
        ctx.moveTo(i, yMin);
      } else {
        ctx.lineTo(i, yMin);
      }
      ctx.lineTo(i, yMax);
    }

    ctx.stroke();

    // Draw slices
    slices.forEach((slice, idx) => {
      const sliceStartX = ((slice.start - startTime) / visibleDuration) * width;
      const sliceEndX = ((slice.end - startTime) / visibleDuration) * width;

      if (sliceEndX >= 0 && sliceStartX <= width) {
    const isActive = idx === activeSlice;
        ctx.fillStyle = isActive ? 'rgba(0, 230, 118, 0.2)' : 'rgba(0, 180, 216, 0.15)';
      ctx.fillRect(
        Math.max(0, sliceStartX), 
        0, 
          Math.min(width, sliceEndX) - Math.max(0, sliceStartX),
          height
      );
    
        ctx.strokeStyle = isActive ? '#00e676' : '#00b4d8';
      ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(sliceStartX, 0);
        ctx.lineTo(sliceStartX, height);
      ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sliceEndX, 0);
        ctx.lineTo(sliceEndX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = isActive ? '#00e676' : '#00b4d8';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`${idx + 1}`, sliceStartX + 5, 20);
      }
    });

    // Draw pending slice start
    if (pendingSliceStart !== null) {
      const pendingX = ((pendingSliceStart - startTime) / visibleDuration) * width;
      if (pendingX >= 0 && pendingX <= width) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
      ctx.beginPath();
        ctx.moveTo(pendingX, 0);
        ctx.lineTo(pendingX, height);
      ctx.stroke();
      ctx.setLineDash([]);
      }
    }
  };

  const handleCanvasClick = (e) => {
    if (!audioBuffer) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    
    const visibleDuration = audioBuffer.duration / zoomLevel;
    const startTime = Math.min(zoomOffset, audioBuffer.duration - visibleDuration);
    const clickTime = startTime + (x / canvas.width) * visibleDuration;

    if (pendingSliceStart === null) {
      setPendingSliceStart(clickTime);
    } else {
      if (clickTime > pendingSliceStart) {
        const newSlice = {
          start: pendingSliceStart,
          end: clickTime
        };
        const newSlices = [...slices, newSlice];
        const newSettings = { ...sliceSettings };
      setSlices(newSlices);
        saveToHistory(newSlices, newSettings);
      setPendingSliceStart(null);
      } else {
        alert('End time must be after start time');
      }
    }
  };

  const playSlice = async (idx) => {
    const slice = slices[idx];
    const settings = sliceSettings[idx] || {};

    if (!audioBuffersRef.current[idx]) {
      const duration = slice.end - slice.start;
      const sampleRate = audioBuffer.sampleRate;
      const numberOfChannels = audioBuffer.numberOfChannels;
      const startOffset = Math.floor(slice.start * sampleRate);
      const length = Math.floor(duration * sampleRate);

      const sliceBuffer = audioContextRef.current.createBuffer(
        numberOfChannels,
        length,
        sampleRate
      );

      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sourceData = audioBuffer.getChannelData(channel);
        const sliceData = sliceBuffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          sliceData[i] = sourceData[startOffset + i] || 0;
        }
      }

      audioBuffersRef.current[idx] = sliceBuffer;
    }
    
    stopAllAudio();
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffersRef.current[idx];

    const gainNode = audioContextRef.current.createGain();
    gainNode.gain.value = settings.volume !== undefined ? settings.volume : 1;
    
    const filterNode = audioContextRef.current.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = settings.filter || 10000;

    source.playbackRate.value = (settings.tempo || 1) * Math.pow(2, (settings.transpose || 0) / 12);

    let chain = source;

    chain.connect(filterNode);
    chain = filterNode;

    if (settings.flanger && settings.flanger > 0) {
      const delay = audioContextRef.current.createDelay(0.1);
      const lfo = audioContextRef.current.createOscillator();
      const lfoGain = audioContextRef.current.createGain();

      lfo.frequency.value = 0.5;
      lfoGain.gain.value = 0.005 * settings.flanger;
      
      lfo.connect(lfoGain);
      lfoGain.connect(delay.delayTime);
      
      chain.connect(delay);
      delay.connect(gainNode);
      chain = gainNode;
      
      lfo.start();
      flangerNodesRef.current[idx] = { lfo, delay };
    } else {
      chain.connect(gainNode);
      chain = gainNode;
    }

    if (settings.reverb && settings.reverb > 0) {
      const convolver = audioContextRef.current.createConvolver();
      const reverbBuffer = createReverbBuffer(2, audioContextRef.current.sampleRate);
      convolver.buffer = reverbBuffer;

      const dryGain = audioContextRef.current.createGain();
      const wetGain = audioContextRef.current.createGain();

      dryGain.gain.value = 1 - settings.reverb;
      wetGain.gain.value = settings.reverb;

      chain.connect(dryGain);
      chain.connect(convolver);
      convolver.connect(wetGain);

      const merger = audioContextRef.current.createChannelMerger(2);
      dryGain.connect(merger);
      wetGain.connect(merger);
      
      // Connect to recording if active, otherwise to speakers
      if (isRecording && recordingBufferRef.current) {
        merger.connect(recordingBufferRef.current.gainNode);
      } else {
        merger.connect(audioContextRef.current.destination);
      }
    } else {
      // Connect to recording if active, otherwise to speakers
      if (isRecording && recordingBufferRef.current) {
        chain.connect(recordingBufferRef.current.gainNode);
      } else {
        chain.connect(audioContextRef.current.destination);
      }
    }

    source.start();
    source.onended = () => {
      setActiveSlice(null);
    };

    setActiveSlice(idx);
    sourceNodesRef.current.push(source);
  };

  const createReverbBuffer = (duration, sampleRate) => {
    const length = sampleRate * duration;
    const buffer = audioContextRef.current.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }

    return buffer;
  };

  const stopAllAudio = () => {
    sourceNodesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Already stopped
      }
    });
    sourceNodesRef.current = [];

    Object.values(flangerNodesRef.current).forEach(({ lfo }) => {
      try {
        lfo.stop();
      } catch (e) {
        // Already stopped
      }
    });
    flangerNodesRef.current = {};

    setActiveSlice(null);
  };

  const deleteSlice = (idx) => {
    const newSlices = slices.filter((_, i) => i !== idx);
    const newSettings = { ...sliceSettings };
    delete newSettings[idx];

    // Reindex settings
    const reindexedSettings = {};
    Object.keys(newSettings).forEach(key => {
      const oldIdx = parseInt(key);
      const newIdx = oldIdx > idx ? oldIdx - 1 : oldIdx;
      reindexedSettings[newIdx] = newSettings[key];
    });

    setSlices(newSlices);
    setSliceSettings(reindexedSettings);
    saveToHistory(newSlices, reindexedSettings);

    delete audioBuffersRef.current[idx];
  };

  const exportAllSlices = async () => {
    // Check download limit for free users
    if (!isPremium && downloadCount >= 3) {
      showUpgradeModal();
      return;
    }

    if (slices.length === 0) return;

    // Increment download count BEFORE exporting (only once per button click)
    if (!isPremium) {
      const newCount = downloadCount + 1;
      setDownloadCount(newCount);
      setDownloadsRemaining(Math.max(0, 3 - newCount));
      localStorage.setItem('samplx_downloads', newCount.toString());
    }

    // Export all slices sequentially with a small delay between each
    for (let i = 0; i < slices.length; i++) {
      await exportSlice(i);
      // Small delay to prevent browser blocking multiple downloads
      if (i < slices.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  const exportSlice = async (idx) => {
    const slice = slices[idx];
    const settings = sliceSettings[idx] || {};

    const duration = slice.end - slice.start;
    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;

    const offlineContext = new OfflineAudioContext(
      numberOfChannels,
      duration * sampleRate,
      sampleRate
    );

    const source = offlineContext.createBufferSource();
    const startOffset = Math.floor(slice.start * sampleRate);
    const length = Math.floor(duration * sampleRate);

    const sliceBuffer = offlineContext.createBuffer(
      numberOfChannels,
      length,
      sampleRate
    );

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sourceData = audioBuffer.getChannelData(channel);
      const sliceData = sliceBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        sliceData[i] = sourceData[startOffset + i] || 0;
      }
    }

    source.buffer = sliceBuffer;
    source.playbackRate.value = (settings.tempo || 1) * Math.pow(2, (settings.transpose || 0) / 12);

    const filterNode = offlineContext.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = settings.filter || 10000;

    source.connect(filterNode);
    filterNode.connect(offlineContext.destination);

    source.start();

    const renderedBuffer = await offlineContext.startRendering();
    const wavBlob = bufferToWav(renderedBuffer);
    const url = URL.createObjectURL(wavBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `slice_${idx + 1}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const bufferToWav = (buffer) => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    const setUint16 = (data) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels);
    setUint16(buffer.numberOfChannels * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const startRecording = async () => {
    try {
      // Create a MediaStreamDestination to capture live audio
      const destination = audioContextRef.current.createMediaStreamDestination();
      
      // Create a gain node for the recording
      const recordingGain = audioContextRef.current.createGain();
      recordingGain.connect(destination);
      recordingGain.connect(audioContextRef.current.destination); // Also play through speakers
      
      // Set up MediaRecorder to capture the stream
      const mediaRecorder = new MediaRecorder(destination.stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.start(100); // Capture in 100ms chunks for better quality
      
      // Store the recording setup
      recordingBufferRef.current = {
        destination: destination,
        gainNode: recordingGain,
        startTime: audioContextRef.current.currentTime
      };
      
      setIsRecording(true);
      console.log('🎙️ Recording started - play your samples now!');
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording: ' + error.message);
    }
  };

  const stopRecording = async () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    
    try {
      setIsRecording(false);
      console.log('🔄 Processing recording...');
      
      // Stop the MediaRecorder
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // Wait a bit for the last chunks
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Create blob from recorded chunks
      const webmBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      
      console.log('Recorded blob size:', webmBlob.size, 'bytes');
      
      if (webmBlob.size === 0) {
        alert('No audio was captured. Make sure to play some samples while recording!');
        if (recordingBufferRef.current) {
          recordingBufferRef.current.gainNode.disconnect();
          recordingBufferRef.current = null;
        }
        return;
      }
      
      // Convert WebM to WAV for better compatibility
      try {
        const arrayBuffer = await webmBlob.arrayBuffer();
        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        
        // Convert to WAV
        const wavBlob = await audioBufferToWav(audioBuffer);
        setRecordedAudio(wavBlob);
        
        console.log('✅ Recording complete! Click "Download Recording" to save.');
      } catch (decodeError) {
        // If decoding fails, just save the webm
        console.warn('Could not decode to WAV, saving as WebM:', decodeError);
        setRecordedAudio(webmBlob);
        console.log('✅ Recording complete (WebM format)! Click "Download Recording" to save.');
      }
      
      // Clean up
      if (recordingBufferRef.current) {
        recordingBufferRef.current.gainNode.disconnect();
        recordingBufferRef.current = null;
      }
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      
      // Clean up
      if (recordingBufferRef.current) {
        recordingBufferRef.current.gainNode.disconnect();
        recordingBufferRef.current = null;
      }
      
      alert('Error processing recording: ' + error.message);
    }
  };

  const downloadRecording = () => {
    if (!recordedAudio) {
      alert('No recording available to download');
      return;
    }

    const url = URL.createObjectURL(recordedAudio);
    const a = document.createElement('a');
    a.href = url;
    
    // Determine file extension based on blob type
    const extension = recordedAudio.type.includes('wav') ? 'wav' : 'webm';
    a.download = `samplx-recording-${Date.now()}.${extension}`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`📥 Recording downloaded as ${extension.toUpperCase()}!`);
  };

  const updateSliceSetting = (idx, key, value) => {
    const newSettings = {
      ...sliceSettings,
      [idx]: { ...sliceSettings[idx], [key]: value }
    };
    setSliceSettings(newSettings);
  };

  const handleZoom = (delta) => {
    const newZoom = Math.max(1, Math.min(20, zoomLevel + delta));
    setZoomLevel(newZoom);
  };

  const handlePan = (direction) => {
    if (!audioBuffer) return;
    const panAmount = (audioBuffer.duration / zoomLevel) * 0.1;
    const newOffset = Math.max(0, Math.min(
      audioBuffer.duration - (audioBuffer.duration / zoomLevel),
      zoomOffset + (direction * panAmount)
    ));
    setZoomOffset(newOffset);
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setZoomOffset(0);
  };

  const cancelPendingSlice = () => {
    setPendingSliceStart(null);
  };

  const showUpgradeModal = () => {
    // Create subscription modal similar to AudioCleaner
    if (document.getElementById('subscriptionModal')) return;
    
    const backdrop = document.createElement('div');
    backdrop.id = 'subscriptionModal';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 999;
      display: flex;
      justify-content: center;
      align-items: center;
      backdrop-filter: blur(5px);
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid #00b4d8;
      padding: 24px;
      border-radius: 8px;
      max-width: 720px;
      width: 90%;
      box-shadow: 0 0 30px rgba(0, 180, 216, 0.2);
      color: #00b4d8;
      font-family: 'Share Tech Mono', monospace;
    `;
    
    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2 style="margin:0;color:#66b3ff;">Upgrade to Premium</h2>
        <button id="closeSubModal" style="background:transparent;border:1px solid #00b4d8;color:#00b4d8;padding:6px 10px;cursor:pointer;">✕</button>
      </div>
      <p style="margin:0 0 16px;color:#aaccff;">You've reached your free download limit. Choose a plan for unlimited downloads.</p>
      <div style="display:grid;grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));gap:12px;">
        <div id="plan-free" style="border:1px solid #00b4d8;padding:12px;border-radius:6px;background:rgba(0,180,216,0.05);">
          <div style="font-weight:bold;margin-bottom:8px;">Free</div>
          <div style="color:#aaccff;font-size:12px;margin-bottom:12px;">3 downloads • Try it out</div>
          <button style="width:100%;background:transparent;border:1px solid #00b4d8;color:#00b4d8;padding:8px;cursor:pointer;">Continue Free</button>
        </div>
        <div id="plan-monthly" style="border:1px solid #00b4d8;padding:12px;border-radius:6px;background:rgba(0,180,216,0.08);">
          <div style="font-weight:bold;margin-bottom:4px;">Monthly</div>
          <div style="color:#00b4d8;font-weight:bold;margin-bottom:6px;">$9.99/mo</div>
          <div style="color:#aaccff;font-size:12px;margin-bottom:12px;">Unlimited downloads • Cancel anytime</div>
          <button style="width:100%;background:#00b4d8;border:1px solid #00b4d8;color:#000;padding:8px;cursor:pointer;">Subscribe Monthly</button>
        </div>
        <div id="plan-yearly" style="border:1px solid #00b4d8;padding:12px;border-radius:6px;background:rgba(0,180,216,0.08);">
          <div style="font-weight:bold;margin-bottom:4px;">Yearly</div>
          <div style="color:#00b4d8;font-weight:bold;margin-bottom:6px;">$79.99/yr</div>
          <div style="color:#aaccff;font-size:12px;margin-bottom:12px;">Unlimited downloads • Best value</div>
          <button style="width:100%;background:#00b4d8;border:1px solid #00b4d8;color:#000;padding:8px;cursor:pointer;">Subscribe Yearly</button>
        </div>
      </div>
    `;
    
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    
    // Event handlers
    modal.querySelector('#closeSubModal').onclick = () => {
      backdrop.remove();
    };
    
    modal.querySelector('#plan-free button').onclick = () => {
      backdrop.remove();
    };
    
    modal.querySelector('#plan-monthly button').onclick = () => {
      initiateSubscription('monthly');
    };
    
    modal.querySelector('#plan-yearly button').onclick = () => {
      initiateSubscription('yearly');
    };
  };
  
  const initiateSubscription = async (plan) => {
    try {
      console.log('=== SAMPLX STRIPE SUBSCRIPTION ===');
      console.log('Plan:', plan);
      
      // Use AudioCleaner backend for Stripe checkout
      const API_BASE = 'https://audiocleaner.onrender.com';
      const priceMap = {
        monthly: 'price_1SAdUnFZ7vA4ogcaqoy0uJoM',
        yearly: 'price_1SAdVwFZ7vA4ogcayfar2S8Q'
      };
      const priceId = priceMap[plan];
      console.log('Price ID:', priceId);
      
      if (!priceId) throw new Error('Unknown plan');
      
      const response = await fetch(`${API_BASE}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          priceId: priceId,
          plan: plan
        })
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ SamplX Stripe response:', data);
      
      if (data.url) {
        console.log('✅ Redirecting to Stripe checkout:', data.url);
        window.location.href = data.url;
      } else {
        console.error('❌ No checkout URL in response');
        alert('Error creating checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Error initiating subscription:', error);
      alert('Error creating checkout session. Please try again.');
    }
  };

  const goBackToHub = () => {
    window.location.href = window.location.origin + '/audioprohub/';
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-gray-100">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-black bg-opacity-95 border-b-2 border-blue-500 px-6 py-3 flex justify-between items-center z-50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={goBackToHub}
            className="text-blue-400 hover:text-blue-300 transition"
          >
            <Home size={24} />
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            SamplX
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-zinc-800 border border-blue-500 rounded px-4 py-2 text-sm flex items-center gap-2">
            {isPremium ? (
              <span className="text-blue-400">✨ Premium - Unlimited Downloads</span>
            ) : (
              <span className="text-blue-400">
                Downloads: {downloadsRemaining} remaining
              </span>
            )}
            <button 
              onClick={() => {
                console.log('🔄 Manual premium refresh triggered');
                refreshPremiumStatus();
              }}
              className="text-xs text-blue-400 hover:text-blue-300 ml-2"
              title="Refresh premium status"
            >
              🔄
            </button>
          </div>
          <button 
            onClick={goBackToHub}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition text-sm font-medium"
          >
            ← Back to Hub
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-20 px-6 pb-6 font-mono">
      <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex gap-2 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              onChange={loadAudioFile}
              accept="audio/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded flex items-center gap-2 transition shadow-lg"
            >
              <Upload size={16} /> Load Sample
            </button>
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded flex items-center gap-2 transition"
              >
                <Mic size={16} /> Record
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded flex items-center gap-2 transition animate-pulse"
              >
                <MicOff size={16} /> Stop Recording
              </button>
            )}
            {recordedAudio && (
              <button
                onClick={downloadRecording}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center gap-2 transition"
              >
                <Download size={16} /> Download Recording
              </button>
            )}
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed rounded flex items-center gap-2 transition"
              title="Undo last action (Ctrl+Z)"
            >
              <Undo2 size={16} /> Undo
            </button>
            <button
              onClick={stopAllAudio}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded flex items-center gap-2 transition"
            >
              <Square size={16} /> Stop All [Space]
            </button>
          </div>

          <div className="bg-zinc-800 rounded-lg p-4 mb-6 border border-blue-700">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-gray-400 flex items-center gap-2">
                <Scissors size={16} className="text-blue-400" /> 
              {pendingSliceStart === null ? (
                'Click to set slice START'
              ) : (
                <span className="text-yellow-400">Click to set slice END (or cancel)</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {pendingSliceStart !== null && (
                <button
                  onClick={cancelPendingSlice}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-xs transition"
                >
                  Cancel Slice
                </button>
              )}
              
              <div className="flex items-center gap-1 bg-zinc-900 rounded px-2 py-1">
                <button
                  onClick={() => handlePan(-1)}
                  disabled={zoomLevel === 1}
                  className="px-2 py-1 hover:bg-zinc-700 rounded disabled:opacity-30 transition text-xs"
                >
                  ←
                </button>
                <button
                  onClick={() => handlePan(1)}
                  disabled={zoomLevel === 1}
                  className="px-2 py-1 hover:bg-zinc-700 rounded disabled:opacity-30 transition text-xs"
                >
                  →
                </button>
              </div>
              
              <div className="flex items-center gap-1 bg-zinc-900 rounded px-2 py-1">
                <button
                  onClick={() => handleZoom(1)}
                  className="px-2 py-1 hover:bg-zinc-700 rounded transition text-xs"
                >
                  +
                </button>
                  <span className="text-xs px-2 text-blue-400">{zoomLevel.toFixed(1)}x</span>
                <button
                  onClick={() => handleZoom(-1)}
                  className="px-2 py-1 hover:bg-zinc-700 rounded transition text-xs"
                >
                  −
                </button>
              </div>
              
              {zoomLevel > 1 && (
                <button
                  onClick={resetZoom}
                  className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs transition"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={1200}
            height={200}
            onClick={handleCanvasClick}
            onMouseMove={(e) => {
              if (!audioBuffer) return;
              const canvas = canvasRef.current;
              const rect = canvas.getBoundingClientRect();
              const scaleX = canvas.width / rect.width;
              const x = (e.clientX - rect.left) * scaleX;
              const visibleDuration = audioBuffer.duration / zoomLevel;
              const startTime = Math.min(zoomOffset, audioBuffer.duration - visibleDuration);
              const hoverTime = startTime + (x / canvas.width) * visibleDuration;
              
              if (hoverTime >= 0 && hoverTime <= audioBuffer.duration) {
                  canvas.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'40\' viewBox=\'0 0 20 40\'><line x1=\'10\' y1=\'0\' x2=\'10\' y2=\'40\' stroke=\'%2300b4d8\' stroke-width=\'2\'/><circle cx=\'10\' cy=\'20\' r=\'3\' fill=\'%2300b4d8\'/></svg>") 10 20, crosshair';
              }
            }}
              className="w-full bg-zinc-950 rounded border border-blue-700"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {slices.map((slice, idx) => {
            const settings = sliceSettings[idx] || {};
            return (
              <div
                key={idx}
                  className={'bg-zinc-800 rounded-lg p-4 border-2 transition ' + (activeSlice === idx ? 'border-blue-500' : 'border-transparent')}
              >
                <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-blue-400">
                    Slice {(idx + 1) % 10} [{(idx + 1) % 10}]
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => playSlice(idx)}
                        className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded transition"
                    >
                      <Play size={16} />
                    </button>
                    <button
                      onClick={() => deleteSlice(idx)}
                      className="p-2 bg-red-500 hover:bg-red-600 rounded transition"
                      title="Delete slice"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-gray-400">Volume: {((settings.volume || 1) * 100).toFixed(0)}%</label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={settings.volume || 1}
                        onChange={(e) => updateSliceSetting(idx, 'volume', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                  <div>
                    <label className="text-gray-400">Transpose: {settings.transpose || 0}</label>
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={settings.transpose || 0}
                      onChange={(e) => updateSliceSetting(idx, 'transpose', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400">Tempo: {(settings.tempo || 1).toFixed(2)}x</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.tempo || 1}
                      onChange={(e) => updateSliceSetting(idx, 'tempo', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400">Filter: {settings.filter || 10000}Hz</label>
                    <input
                      type="range"
                      min="100"
                      max="10000"
                      step="100"
                      value={settings.filter || 10000}
                      onChange={(e) => updateSliceSetting(idx, 'filter', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400">Flanger: {((settings.flanger || 0) * 100).toFixed(0)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.flanger || 0}
                      onChange={(e) => updateSliceSetting(idx, 'flanger', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400">Reverb: {((settings.reverb || 0) * 100).toFixed(0)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.reverb || 0}
                      onChange={(e) => updateSliceSetting(idx, 'reverb', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

          <div className="bg-zinc-800 rounded-lg p-4 flex gap-4 justify-center border border-blue-700">
          <button
            onClick={exportAllSlices}
            disabled={!audioBuffer || slices.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded flex items-center gap-2 transition shadow-lg"
          >
            <Download size={16} /> Export All Slices (WAV)
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SamplX;

import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Upload, Download, Scissors, Trash2, Mic, MicOff, Undo2 } from 'lucide-react';

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
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

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
      stopAllAudio();
    }
  };

  const loadAudioFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
    setAudioBuffer(buffer);
    
    audioBuffersRef.current = {};
    
    setSlices([]);
    setSliceSettings({});
    setPendingSliceStart(null);
    setZoomLevel(1);
    setZoomOffset(0);
    setHistory([]);
    setHistoryIndex(-1);
  };

  const drawWaveform = (buffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const data = buffer.getChannelData(0);
    
    const totalDuration = buffer.duration;
    const visibleDuration = totalDuration / zoomLevel;
    const startTime = Math.min(zoomOffset, totalDuration - visibleDuration);
    const endTime = Math.min(startTime + visibleDuration, totalDuration);
    
    const startSample = Math.floor((startTime / totalDuration) * data.length);
    const endSample = Math.floor((endTime / totalDuration) * data.length);
    const visibleData = data.slice(startSample, endSample);
    
    const step = Math.ceil(visibleData.length / width);
    const amp = height / 2;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = visibleData[(i * step) + j];
        if (datum !== undefined) {
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
      }
      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();

    if (pendingSliceStart !== null) {
      const x = ((pendingSliceStart - startTime) / visibleDuration) * canvas.width;
      if (x >= 0 && x <= width) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('Start: ' + pendingSliceStart.toFixed(3) + 's', x + 4, 16);
      }
    }

    slices.forEach((slice, idx) => {
      drawSliceMarker(slice, idx, startTime, endTime, visibleDuration);
    });
  };

  const drawSliceMarker = (slice, idx, startTime, endTime, visibleDuration) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const sliceStartX = ((slice.start - startTime) / visibleDuration) * canvas.width;
    const sliceEndX = ((slice.end - startTime) / visibleDuration) * canvas.width;
    
    const isActive = idx === activeSlice;
    const color = isActive ? '#ff0088' : '#00ccff';
    
    if (sliceStartX < canvas.width && sliceEndX > 0) {
      ctx.fillStyle = color + '20';
      ctx.fillRect(
        Math.max(0, sliceStartX), 
        0, 
        Math.min(canvas.width, sliceEndX) - Math.max(0, sliceStartX), 
        canvas.height
      );
    }
    
    if (sliceStartX >= 0 && sliceStartX <= canvas.width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sliceStartX, 0);
      ctx.lineTo(sliceStartX, canvas.height);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(((idx + 1) % 10).toString(), sliceStartX + 4, 16);
    }
    
    if (sliceEndX >= 0 && sliceEndX <= canvas.width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(sliceEndX, 0);
      ctx.lineTo(sliceEndX, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const handleCanvasClick = (e) => {
    if (!audioBuffer) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Get more precise mouse position accounting for device pixel ratio
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    
    const visibleDuration = audioBuffer.duration / zoomLevel;
    const startTime = Math.min(zoomOffset, audioBuffer.duration - visibleDuration);
    const clickTime = startTime + (x / canvas.width) * visibleDuration;

    if (pendingSliceStart === null) {
      if (slices.length >= 10) {
        alert('Maximum 10 slices reached');
        return;
      }
      setPendingSliceStart(clickTime);
    } else {
      const sliceStart = Math.min(pendingSliceStart, clickTime);
      const sliceEnd = Math.max(pendingSliceStart, clickTime);
      
      if (sliceEnd - sliceStart < 0.01) {
        alert('Slice too short (minimum 0.01s)');
        setPendingSliceStart(null);
        return;
      }

      const newSlice = { start: sliceStart, end: sliceEnd };
      const newSlices = [...slices, newSlice].sort((a, b) => a.start - b.start);
      
      const sliceIdx = newSlices.indexOf(newSlice);
      const newSettings = {};
      newSlices.forEach((s, i) => {
        if (i === sliceIdx) {
          newSettings[i] = {
            transpose: 0,
            tempo: 1,
            reverb: 0,
            flanger: 0,
            filter: 10000,
            filterType: 'lowpass'
          };
        } else {
          const oldIdx = i < sliceIdx ? i : i - 1;
          if (sliceSettings[oldIdx]) {
            newSettings[i] = sliceSettings[oldIdx];
          } else {
            newSettings[i] = {
              transpose: 0,
              tempo: 1,
              reverb: 0,
              flanger: 0,
              filter: 10000,
              filterType: 'lowpass'
            };
          }
        }
      });
      
      // Save to history before updating state
      saveToHistory(slices, sliceSettings);
      
      setSlices(newSlices);
      setSliceSettings(newSettings);
      setPendingSliceStart(null);
    }
  };

  const deleteSlice = (idx) => {
    // Save to history before deletion
    saveToHistory(slices, sliceSettings);
    
    const newSlices = slices.filter((_, i) => i !== idx);
    
    const newSettings = {};
    newSlices.forEach((slice, i) => {
      const oldIdx = i < idx ? i : i + 1;
      if (sliceSettings[oldIdx]) {
        newSettings[i] = sliceSettings[oldIdx];
      }
    });
    
    setSlices(newSlices);
    setSliceSettings(newSettings);
    
    if (activeSlice === idx) {
      stopAllAudio();
    }
  };

  // Recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/wav' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        
        setAudioBuffer(buffer);
        audioBuffersRef.current = {};
        setSlices([]);
        setSliceSettings({});
        setPendingSliceStart(null);
        setZoomLevel(1);
        setZoomOffset(0);
        setHistory([]);
        setHistoryIndex(-1);
        
        // Stop all tracks
        streamRef.current.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const stopAllAudio = () => {
    sourceNodesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // ignore
      }
    });
    sourceNodesRef.current = [];
    setActiveSlice(null);
  };

  const playSlice = async (idx) => {
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    stopAllAudio();
    
    const slice = slices[idx];
    const settings = sliceSettings[idx] || { 
      transpose: 0, 
      tempo: 1, 
      reverb: 0, 
      flanger: 0, 
      filter: 10000, 
      filterType: 'lowpass'
    };
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    
    const playbackRate = Math.pow(2, settings.transpose / 12) * settings.tempo;
    source.playbackRate.value = playbackRate;

    let currentNode = source;

    const hasFilter = settings.filter < 10000;
    const hasFlanger = settings.flanger > 0;
    const hasReverb = settings.reverb > 0;

    if (hasFilter) {
      const filter = audioContextRef.current.createBiquadFilter();
      filter.type = settings.filterType;
      filter.frequency.value = settings.filter;
      currentNode.connect(filter);
      currentNode = filter;
    }

    if (hasFlanger) {
      const delay = audioContextRef.current.createDelay();
      const lfo = audioContextRef.current.createOscillator();
      const lfoGain = audioContextRef.current.createGain();
      const feedback = audioContextRef.current.createGain();
      const mix = audioContextRef.current.createGain();
      
      const rate = 0.5 + settings.flanger * 2;
      const depth = 0.002 + settings.flanger * 0.003;
      
      lfo.frequency.value = rate;
      lfoGain.gain.value = depth;
      feedback.gain.value = 0.5 + settings.flanger * 0.3;
      mix.gain.value = settings.flanger;
      
      delay.delayTime.value = 0.003;
      
      lfo.connect(lfoGain);
      lfoGain.connect(delay.delayTime);
      
      currentNode.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(mix);
      
      currentNode.connect(audioContextRef.current.destination);
      mix.connect(audioContextRef.current.destination);
      
      lfo.start();
      
      flangerNodesRef.current[idx] = { lfo: lfo, delay: delay, feedback: feedback, mix: mix };
    }

    if (hasReverb) {
      const convolver = audioContextRef.current.createConvolver();
      convolver.buffer = createReverbBuffer(settings.reverb);
      const dry = audioContextRef.current.createGain();
      const wet = audioContextRef.current.createGain();
      dry.gain.value = 1 - settings.reverb;
      wet.gain.value = settings.reverb;
      
      currentNode.connect(dry);
      currentNode.connect(convolver);
      convolver.connect(wet);
      dry.connect(audioContextRef.current.destination);
      wet.connect(audioContextRef.current.destination);
    } else if (!hasFlanger) {
      currentNode.connect(audioContextRef.current.destination);
    }

    sourceNodesRef.current.push(source);
    setActiveSlice(idx);

    const now = audioContextRef.current.currentTime;
    source.start(now, slice.start, slice.end - slice.start);
    
    source.onended = () => {
      setActiveSlice(null);
      sourceNodesRef.current = sourceNodesRef.current.filter(s => s !== source);
      
      if (flangerNodesRef.current[idx]) {
        flangerNodesRef.current[idx].lfo.stop();
        delete flangerNodesRef.current[idx];
      }
    };
  };

  const createReverbBuffer = (intensity) => {
    const rate = audioContextRef.current.sampleRate;
    const length = rate * (1 + intensity * 2);
    const impulse = audioContextRef.current.createBuffer(2, length, rate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    return impulse;
  };

  const exportAllSlices = async () => {
    if (!audioBuffer || slices.length === 0) return;

    const sampleRate = audioBuffer.sampleRate;
    const gapSamples = Math.floor(sampleRate * 0.5); // 0.5 second gap between slices
    let totalLength = slices.reduce((sum, slice, idx) => {
      const settings = sliceSettings[idx] || { tempo: 1 };
      const sliceLength = Math.floor((slice.end - slice.start) * sampleRate / settings.tempo);
      return sum + sliceLength + gapSamples;
    }, 0);

    const channels = audioBuffer.numberOfChannels;
    const exportBuffer = audioContextRef.current.createBuffer(channels, totalLength, sampleRate);

    let offset = 0;
    for (let sliceIdx = 0; sliceIdx < slices.length; sliceIdx++) {
      const slice = slices[sliceIdx];
      const settings = sliceSettings[sliceIdx] || { 
        transpose: 0, 
        tempo: 1, 
        reverb: 0, 
        flanger: 0, 
        filter: 10000, 
        filterType: 'lowpass' 
      };

      // Create a temporary buffer for this slice with effects
      const sliceStartSample = Math.floor(slice.start * sampleRate);
      const sliceEndSample = Math.floor(slice.end * sampleRate);
      const originalSliceLength = sliceEndSample - sliceStartSample;
      const processedSliceLength = Math.floor(originalSliceLength / settings.tempo);
      
      // Create source buffer for this slice
      const sliceBuffer = audioContextRef.current.createBuffer(channels, originalSliceLength, sampleRate);
      for (let ch = 0; ch < channels; ch++) {
        const sourceData = audioBuffer.getChannelData(ch);
        const sliceData = sliceBuffer.getChannelData(ch);
        for (let i = 0; i < originalSliceLength; i++) {
          sliceData[i] = sourceData[sliceStartSample + i];
        }
      }

      // Process the slice with effects
      const processedBuffer = await processSliceWithEffects(sliceBuffer, settings, processedSliceLength);

      // Copy processed slice to export buffer
      for (let ch = 0; ch < channels; ch++) {
        const processedData = processedBuffer.getChannelData(ch);
        const destData = exportBuffer.getChannelData(ch);
        for (let i = 0; i < processedSliceLength; i++) {
          destData[offset + i] = processedData[i];
        }
      }
      offset += processedSliceLength + gapSamples;
    }

    const wav = bufferToWave(exportBuffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'samplx-slices.wav';
    a.click();
  };

  const processSliceWithEffects = async (sliceBuffer, settings, targetLength) => {
    const sampleRate = sliceBuffer.sampleRate;
    const channels = sliceBuffer.numberOfChannels;
    const processedBuffer = audioContextRef.current.createBuffer(channels, targetLength, sampleRate);

    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(channels, targetLength, sampleRate);
    
    // Create source
    const source = offlineContext.createBufferSource();
    source.buffer = sliceBuffer;
    
    // Apply tempo (pitch and speed change)
    const transposeFactor = Math.pow(2, settings.transpose / 12);
    const tempoFactor = settings.tempo;
    source.playbackRate.value = transposeFactor * tempoFactor;

    let currentNode = source;

    // Apply filter
    if (settings.filter < 10000) {
      const filter = offlineContext.createBiquadFilter();
      filter.type = settings.filterType;
      filter.frequency.value = settings.filter;
      currentNode.connect(filter);
      currentNode = filter;
    }

    // Apply reverb (simplified)
    if (settings.reverb > 0) {
      const convolver = offlineContext.createConvolver();
      convolver.buffer = createReverbBuffer(settings.reverb);
      const dry = offlineContext.createGain();
      const wet = offlineContext.createGain();
      dry.gain.value = 1 - settings.reverb;
      wet.gain.value = settings.reverb;
      
      currentNode.connect(dry);
      currentNode.connect(convolver);
      convolver.connect(wet);
      dry.connect(offlineContext.destination);
      wet.connect(offlineContext.destination);
    } else {
      currentNode.connect(offlineContext.destination);
    }

    // Start rendering
    source.start();
    const renderedBuffer = await offlineContext.startRendering();
    
    // Copy to target buffer
    for (let ch = 0; ch < channels; ch++) {
      const renderedData = renderedBuffer.getChannelData(ch);
      const processedData = processedBuffer.getChannelData(ch);
      for (let i = 0; i < targetLength; i++) {
        processedData[i] = renderedData[i] || 0;
      }
    }

    return processedBuffer;
  };

  const bufferToWave = (buffer) => {
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

    return arrayBuffer;
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

  return (
    <div className="min-h-screen bg-zinc-900 text-gray-100 p-6 font-mono">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-emerald-400">SamplX</h1>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={loadAudioFile}
              accept="audio/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded flex items-center gap-2 transition"
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
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded flex items-center gap-2 transition"
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
        </header>

        <div className="bg-zinc-800 rounded-lg p-4 mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <Scissors size={16} /> 
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
                <span className="text-xs px-2 text-cyan-400">{zoomLevel.toFixed(1)}x</span>
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
              
              // Update cursor style based on hover position
              if (hoverTime >= 0 && hoverTime <= audioBuffer.duration) {
                canvas.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'40\' viewBox=\'0 0 20 40\'><line x1=\'10\' y1=\'0\' x2=\'10\' y2=\'40\' stroke=\'%2300ff88\' stroke-width=\'2\'/><circle cx=\'10\' cy=\'20\' r=\'3\' fill=\'%2300ff88\'/></svg>") 10 20, crosshair';
              }
            }}
            className="w-full bg-zinc-950 rounded border border-zinc-700"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {slices.map((slice, idx) => {
            const settings = sliceSettings[idx] || {};
            return (
              <div
                key={idx}
                className={'bg-zinc-800 rounded-lg p-4 border-2 transition ' + (activeSlice === idx ? 'border-pink-500' : 'border-transparent')}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-cyan-400">
                    Slice {(idx + 1) % 10} [{(idx + 1) % 10}]
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => playSlice(idx)}
                      className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded transition"
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

        <div className="bg-zinc-800 rounded-lg p-4 flex gap-4 justify-center">
          <button
            onClick={exportAllSlices}
            disabled={!audioBuffer || slices.length === 0}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded flex items-center gap-2 transition"
          >
            <Download size={16} /> Export All Slices (WAV)
          </button>
        </div>
      </div>
    </div>
  );
};

export default SamplX;


/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';

export interface RoundedTimelineProps {
  file: File | Blob | null;

  containerColor?: string;
  waveformColor?: string;
  barRadius?: number;

  silenceRms?: number;
  bucketMs?: number;
  minSilenceMs?: number;

  waveformRatio?: number;          // NEW (0-1) height of waveform vs capsule
}

interface AudioAnalysisData {
  rms: number[];
  buckets: number;
  pxBkt: number;
  segments: Array<{ start: number; end: number }>;
}

export default function RoundedTimeline({
  file,
  containerColor = '#4EF5C3',
  waveformColor = '#FFFFFF',
  barRadius = 6,
  silenceRms = 0.01,
  bucketMs = 50,
  minSilenceMs = 1000,
  waveformRatio = 1,               // default = previous behaviour
}: RoundedTimelineProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const analysisDataRef = useRef<AudioAnalysisData | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(0);

  // Drawing function extracted for reuse
  const drawCanvas = () => {
    if (!ref.current || !analysisDataRef.current) return;

    const canvas = ref.current;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    
    // Ensure canvas is properly sized
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const H = canvas.clientHeight;
    const W = canvas.clientWidth;
    const { rms, buckets, pxBkt, segments } = analysisDataRef.current;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Draw capsules
    ctx.fillStyle = containerColor;
    segments.forEach(({ start, end }) => {
      const x = start * pxBkt;
      const w = (end - start + 1) * pxBkt;
      roundRect(ctx, x, 0, w, H, barRadius);
      ctx.fill();
    });

    // Draw waveform
    const scaleH = waveformRatio * H;
    ctx.strokeStyle = waveformColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < buckets; i++) {
      const amp = rms[i];
      const half = (amp * scaleH) / 2;
      const x = i * pxBkt + pxBkt / 2;
      const y1 = H / 2 - half;
      const y2 = H / 2 + half;
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }
    ctx.stroke();
  };

  // Effect 1: Audio analysis (expensive calculation)
  useEffect(() => {
    if (!file || !ref.current) {
      analysisDataRef.current = null;
      setAnalysisComplete(0);
      return;
    }

    const canvas = ref.current;
    const ac = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    file
      .arrayBuffer()
      .then(buf => ac.decodeAudioData(buf))
      .then(buffer => {
        const data = buffer.getChannelData(0);
        const sr = buffer.sampleRate;
        const bSamp = Math.max(1, Math.floor((bucketMs / 1e3) * sr));
        const buckets = Math.ceil(data.length / bSamp);
        const W = canvas.clientWidth;
        const pxBkt = W / buckets;

        // Calculate RMS values
        const rms: number[] = new Array(buckets);
        for (let i = 0; i < buckets; i++) {
          let sum = 0;
          for (let j = 0; j < bSamp; j++) {
            const s = data[i * bSamp + j] || 0;
            sum += s * s;
          }
          rms[i] = Math.sqrt(sum / bSamp);
        }

        // Calculate segments
        const segments: Array<{ start: number; end: number }> = [];
        const minSilBkt = Math.ceil(minSilenceMs / bucketMs);
        let segStart: number | null = null;
        let silenceRun = 0;

        for (let i = 0; i <= buckets; i++) {
          const loud = i < buckets && rms[i] >= silenceRms;
          if (loud) {
            if (segStart === null) segStart = i;
            silenceRun = 0;
          } else if (segStart !== null) {
            silenceRun++;
            const shouldSplit = silenceRun >= minSilBkt || i === buckets;
            if (shouldSplit) {
              const end = i - silenceRun;
              if (end >= segStart) {
                segments.push({ start: segStart, end });
              }
              segStart = null;
              silenceRun = 0;
            }
          }
        }

        // Store analysis data
        analysisDataRef.current = { rms, buckets, pxBkt, segments };
        
        // Draw immediately after analysis
        drawCanvas();
        
        // Update state to trigger drawing effect for future color changes
        setAnalysisComplete(prev => prev + 1);
      })
      .catch(console.error);
  }, [file, silenceRms, bucketMs, minSilenceMs]);

  // Effect 2: Drawing (fast visual update) - triggered by color/visual changes
  useEffect(() => {
    if (analysisComplete > 0) {
      drawCanvas();
    }
  }, [containerColor, waveformColor, barRadius, waveformRatio, analysisComplete]);

  /* use h-[25px] or whatever height you want */
  return <canvas ref={ref} className="w-full h-[25px]" />;
}

/* rounded-rect */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const R = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + R, y);
  ctx.arcTo(x + w, y, x + w, y + h, R);
  ctx.arcTo(x + w, y + h, x, y + h, R);
  ctx.arcTo(x, y + h, x, y, R);
  ctx.arcTo(x, y, x + w, y, R);
  ctx.closePath();
}
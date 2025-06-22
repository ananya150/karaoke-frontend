/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (!file || !ref.current) return;

    const canvas  = ref.current;
    const ctx     = canvas.getContext('2d')!;
    const dpr     = window.devicePixelRatio || 1;
    canvas.width  = canvas.clientWidth  * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const ac = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    file
      .arrayBuffer()
      .then(buf => ac.decodeAudioData(buf))
      .then(buffer =>
        draw(buffer, ctx, {
          containerColor,
          waveformColor,
          barRadius,
          silenceRms,
          bucketMs,
          minSilenceMs,
          waveformRatio,
        }),
      )
      .catch(console.error);
  }, [
    file,
    containerColor,
    waveformColor,
    barRadius,
    silenceRms,
    bucketMs,
    minSilenceMs,
    waveformRatio,
  ]);

  /* use h-[25px] or whatever height you want */
  return <canvas ref={ref} className="w-full h-[25px]" />;
}

/* ---------- helpers ---------- */
interface Opts {
  containerColor: string;
  waveformColor: string;
  barRadius: number;
  silenceRms: number;
  bucketMs: number;
  minSilenceMs: number;
  waveformRatio: number;
}

function draw(
  buffer: AudioBuffer,
  ctx: CanvasRenderingContext2D,
  o: Opts,
) {
  const {
    containerColor,
    waveformColor,
    barRadius,
    silenceRms,
    bucketMs,
    minSilenceMs,
    waveformRatio,
  } = o;

  const H = ctx.canvas.height / (window.devicePixelRatio || 1);
  const W = ctx.canvas.width  / (window.devicePixelRatio || 1);

  /* ───── 1. Analyse ───── */
  const data   = buffer.getChannelData(0);
  const sr     = buffer.sampleRate;
  const bSamp  = Math.max(1, Math.floor((bucketMs / 1e3) * sr));
  const buckets= Math.ceil(data.length / bSamp);
  const pxBkt  = W / buckets;

  const rms: number[] = new Array(buckets);
  for (let i = 0; i < buckets; i++) {
    let sum = 0;
    for (let j = 0; j < bSamp; j++) {
      const s = data[i * bSamp + j] || 0;
      sum += s * s;
    }
    rms[i] = Math.sqrt(sum / bSamp);
  }

  /* ───── 2. Backdrop ───── */
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  /* ───── 3. Capsules (same as before) ───── */
  ctx.fillStyle = containerColor;
  const minSilBkt = Math.ceil(minSilenceMs / bucketMs);
  let segStart: number | null = null, silenceRun = 0;

  for (let i = 0; i <= buckets; i++) {
    const loud = i < buckets && rms[i] >= silenceRms;
    if (loud) {
      if (segStart === null) segStart = i;
      silenceRun = 0;
    } else if (segStart !== null) {
      silenceRun++;
      const shouldSplit =
        silenceRun >= minSilBkt || i === buckets;
      if (shouldSplit) {
        const end = i - silenceRun;
        if (end >= segStart) {
          const x = segStart * pxBkt;
          const w = (end - segStart + 1) * pxBkt;
          roundRect(ctx, x, 0, w, H, barRadius);
          ctx.fill();
        }
        segStart = null;
        silenceRun = 0;
      }
    }
  }

  /* ───── 4. Waveform line (scaled) ───── */
  const scaleH = waveformRatio * H;
//   const margin = (H - scaleH) / 2;           // top & bottom margin
  ctx.strokeStyle = waveformColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < buckets; i++) {
    const amp = rms[i];                      // 0-1
    const half = (amp * scaleH) / 2;
    const x = i * pxBkt + pxBkt / 2;
    const y1 = H / 2 - half;
    const y2 = H / 2 + half;
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
  }
  ctx.stroke();
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
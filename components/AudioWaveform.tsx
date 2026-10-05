import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  YAxis,
  Tooltip,
  AreaChart,
  Area
} from 'recharts';

interface AudioWaveformProps {
  pcmData: Uint8Array;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
}

interface WaveformPoint {
  index: number;
  timeSeconds: number;
  timeFormatted: string;
  amplitude: number;
  positive: number;
  negative: number;
  rms: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  pcmData,
  duration,
  currentTime,
  isPlaying,
  onPlayPause,
  onSeek,
}) => {
  const [viewMode, setViewMode] = useState<'bars' | 'curve'>('bars');

  // Format seconds to mm:ss.s
  const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    const paddedSecs = parseFloat(secs) < 10 ? `0${secs}` : secs;
    const paddedMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `${paddedMins}:${paddedSecs}`;
  };

  // Extract waveform points from raw 16-bit mono PCM data
  const waveformData = useMemo<WaveformPoint[]>(() => {
    const numPoints = 96;
    const points: WaveformPoint[] = [];

    // Fallback if no PCM data available
    if (!pcmData || pcmData.byteLength < 4) {
      const effectiveDuration = duration > 0 ? duration : 5;
      for (let i = 0; i < numPoints; i++) {
        const time = (i / numPoints) * effectiveDuration;
        const pseudoAmp = Math.round(20 + 60 * Math.abs(Math.sin((i / 8) * Math.PI)));
        points.push({
          index: i,
          timeSeconds: time,
          timeFormatted: formatTime(time),
          amplitude: pseudoAmp,
          positive: pseudoAmp,
          negative: -pseudoAmp,
          rms: Math.round(pseudoAmp * 0.7),
        });
      }
      return points;
    }

    try {
      // 16-bit PCM little-endian (2 bytes per sample)
      const sampleCount = Math.floor(pcmData.byteLength / 2);
      const pcm16 = new Int16Array(pcmData.buffer, pcmData.byteOffset, sampleCount);

      const effectiveDuration = duration > 0 ? duration : sampleCount / 24000;
      const samplesPerBin = Math.max(1, Math.floor(sampleCount / numPoints));

      for (let i = 0; i < numPoints; i++) {
        const start = i * samplesPerBin;
        const end = Math.min(start + samplesPerBin, sampleCount);

        let maxVal = 0;
        let sumSq = 0;
        const count = end - start;

        for (let j = start; j < end; j++) {
          const sample = Math.abs(pcm16[j]);
          if (sample > maxVal) maxVal = sample;
          sumSq += sample * sample;
        }

        const rms = Math.sqrt(sumSq / (count || 1));
        // Scale 0..32768 to 10..100 for clean visualization aesthetic
        const normalizedPeak = Math.min(100, Math.max(10, Math.round((maxVal / 32768) * 90 + 10)));
        const normalizedRms = Math.min(100, Math.max(5, Math.round((rms / 32768) * 95 + 5)));
        const timeSeconds = (i / numPoints) * effectiveDuration;

        points.push({
          index: i,
          timeSeconds,
          timeFormatted: formatTime(timeSeconds),
          amplitude: normalizedPeak,
          positive: normalizedPeak,
          negative: -normalizedPeak,
          rms: normalizedRms,
        });
      }
    } catch (err) {
      console.error('Error processing PCM waveform data:', err);
    }

    return points;
  }, [pcmData, duration]);

  // Click handler to seek through audio
  const handleChartClick = (chartState: any) => {
    if (chartState && chartState.activePayload && chartState.activePayload.length > 0) {
      const payload = chartState.activePayload[0].payload as WaveformPoint;
      if (payload && typeof payload.timeSeconds === 'number') {
        onSeek(payload.timeSeconds);
      }
    }
  };

  // Custom tooltip for hover inspection
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload as WaveformPoint;
      const isPast = data.timeSeconds <= currentTime;
      return (
        <div className="bg-slate-900/95 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl backdrop-blur-sm border border-slate-700 pointer-events-none z-50">
          <div className="flex items-center gap-2 font-mono">
            <span className="font-bold text-indigo-400">{data.timeFormatted}</span>
            <span className="text-slate-400">|</span>
            <span className="font-medium text-slate-200">Pic: {data.amplitude}%</span>
          </div>
          <div className="text-[8px] text-slate-400 mt-0.5 flex justify-between gap-3">
            <span>RMS: {data.rms}%</span>
            <span className={isPast ? 'text-indigo-400 font-semibold' : 'text-slate-400'}>
              {isPast ? '● Écouté' : '○ À venir'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="w-full bg-slate-50/80 rounded-2xl border border-indigo-100/70 p-3.5 flex flex-col gap-2.5 shadow-sm">
      {/* Top Header Row: Status, Times & Display Switcher */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 relative">
            {isPlaying && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-indigo-600' : 'bg-slate-300'}`}></span>
          </span>
          <span className="text-[10px] font-black tracking-wider uppercase text-indigo-900">
            Forme d'onde Recharts
          </span>
          <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100/60">
            24 kHz · PCM 16-bit
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Time indicator */}
          <div className="font-mono text-[11px] font-bold text-slate-600 tabular-nums bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
            <span className="text-indigo-600">{formatTime(currentTime)}</span>
            <span className="text-slate-300 mx-1">/</span>
            <span className="text-slate-500">{formatTime(duration)}</span>
          </div>

          {/* Toggle between Symmetrical Bars and Curve Envelope */}
          <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[9px] font-black">
            <button
              type="button"
              onClick={() => setViewMode('bars')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                viewMode === 'bars'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Barres
            </button>
            <button
              type="button"
              onClick={() => setViewMode('curve')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                viewMode === 'curve'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Enveloppe
            </button>
          </div>
        </div>
      </div>

      {/* Main Recharts Waveform Chart Area */}
      <div className="relative w-full h-[62px] bg-white rounded-xl border border-slate-200/60 overflow-hidden cursor-pointer group">
        {/* Progress scrub overlay */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-indigo-500/5 pointer-events-none transition-all duration-75 border-r-2 border-indigo-600"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Recharts Canvas */}
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'bars' ? (
              <BarChart
                data={waveformData}
                margin={{ top: 4, right: 1, left: 1, bottom: 4 }}
                barCategoryGap={1}
                onClick={handleChartClick}
              >
                <YAxis domain={[-100, 100]} hide />
                <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                {/* Positive (upper) waveform bars */}
                <Bar dataKey="positive" stackId="wave" radius={[1.5, 1.5, 0, 0]} cursor="pointer">
                  {waveformData.map((entry) => {
                    const isPlayed = entry.timeSeconds <= currentTime;
                    return (
                      <Cell
                        key={`pos-${entry.index}`}
                        fill={isPlayed ? '#4f46e5' : '#cbd5e1'}
                        className="transition-colors duration-150"
                      />
                    );
                  })}
                </Bar>
                {/* Negative (lower mirrored) waveform bars */}
                <Bar dataKey="negative" stackId="wave" radius={[0, 0, 1.5, 1.5]} cursor="pointer">
                  {waveformData.map((entry) => {
                    const isPlayed = entry.timeSeconds <= currentTime;
                    return (
                      <Cell
                        key={`neg-${entry.index}`}
                        fill={isPlayed ? '#6366f1' : '#e2e8f0'}
                        className="transition-colors duration-150"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            ) : (
              <AreaChart
                data={waveformData}
                margin={{ top: 6, right: 1, left: 1, bottom: 2 }}
                onClick={handleChartClick}
              >
                <defs>
                  <linearGradient id="waveformGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.75} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                <Area
                  type="monotone"
                  dataKey="amplitude"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="url(#waveformGradient)"
                  cursor="pointer"
                  isAnimationActive={false}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Helper seek hint displayed on hover */}
        <div className="absolute right-2 bottom-1 text-[8px] font-bold text-slate-300 group-hover:text-slate-400 transition-colors pointer-events-none select-none">
          Cliquez sur la forme d'onde pour naviguer
        </div>
      </div>
    </div>
  );
};
export default AudioWaveform;

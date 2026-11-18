import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  total: number;
  loop: boolean;
  initialTime?: number;
}

export function usePlayback({ total, loop, initialTime = 0 }: Options) {
  const max = Math.max(0.1, total);
  const [time, setTimeState] = useState(() => Math.min(initialTime, max));
  const [playing, setPlaying] = useState(false);
  const timeRef = useRef(time);
  const lastRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const seek = useCallback(
    (next: number) => {
      const value = Math.min(max, Math.max(0, next));
      timeRef.current = value;
      setTimeState(value);
    },
    [max]
  );

  useEffect(() => {
    if (timeRef.current > max) {
      timeRef.current = max;
      setTimeState(max);
    }
  }, [max]);

  useEffect(() => {
    if (!playing) return;
    lastRef.current = performance.now();

    const tick = (now: number) => {
      const delta = Math.min(0.1, (now - lastRef.current) / 1000);
      lastRef.current = now;
      let next = timeRef.current + delta;
      if (next >= max) {
        if (loop) {
          next %= max;
        } else {
          timeRef.current = max;
          setTimeState(max);
          setPlaying(false);
          return;
        }
      }
      timeRef.current = next;
      setTimeState(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, loop, max]);

  const play = useCallback(() => {
    if (timeRef.current >= max - 0.001) seek(0);
    setPlaying(true);
  }, [max, seek]);

  const pause = useCallback(() => setPlaying(false), []);

  const toggle = useCallback(() => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (timeRef.current >= max - 0.001) seek(0);
    setPlaying(true);
  }, [playing, max, seek]);

  return { time, playing, play, pause, toggle, seek };
}

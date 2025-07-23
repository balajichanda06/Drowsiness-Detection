import React, { useEffect, useRef } from 'react';

interface AlarmSystemProps {
  isActive: boolean;
}

const AlarmSystem: React.FC<AlarmSystemProps> = ({ isActive }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    if (isActive) {
      // Start alarm
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;

      // Resume context if needed
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      oscillatorRef.current = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillatorRef.current.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillatorRef.current.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillatorRef.current.type = 'square';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

      oscillatorRef.current.start();

      // Stop after 30 seconds as a failsafe
      const timeout = setTimeout(() => {
        try { oscillatorRef.current?.stop(); } catch {}
      }, 30000);

      // Cleanup when alarm stops or component unmounts
      return () => {
        clearTimeout(timeout);
        try { oscillatorRef.current?.stop(); } catch {}
        oscillatorRef.current = null;
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        audioContextRef.current = null;
      };
    } else {
      // Stop alarm if not active
      try { oscillatorRef.current?.stop(); } catch {}
      oscillatorRef.current = null;
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
  }, [isActive]);

  return null;
};

export default AlarmSystem;
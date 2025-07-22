import { useEffect, useRef, useState } from 'react';

interface AlarmSystemProps {
  isActive: boolean;
}

const AlarmSystem: React.FC<AlarmSystemProps> = ({ isActive }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isActive && !isPlaying) {
      // Create audio context and alarm sound
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioContext = audioContextRef.current;
        
        oscillatorRef.current = audioContext.createOscillator();
        gainNodeRef.current = audioContext.createGain();
        
        const oscillator = oscillatorRef.current;
        const gainNode = gainNodeRef.current;
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Configure alarm sound - continuous beeping
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        // Create continuous pulsing alarm effect
        const startTime = audioContext.currentTime;
        for (let i = 0; i < 100; i++) {
          oscillator.frequency.setValueAtTime(800, startTime + i * 0.3);
          oscillator.frequency.setValueAtTime(600, startTime + i * 0.3 + 0.15);
        }
        
        oscillator.start(audioContext.currentTime);
        setIsPlaying(true);
        
        // Auto-stop after 30 seconds as safety measure
        setTimeout(() => {
            if (oscillatorRef.current) {
                oscillatorRef.current.stop();
            }
        }, 30000);
        oscillator.addEventListener('ended', () => {
          setIsPlaying(false);
        });
        
      } catch (error) {
        console.error('Error starting alarm:', error);
      }
      
    } else if (!isActive && isPlaying) {
      // Stop the alarm
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        oscillatorRef.current?.stop();
        audioContextRef.current.close();
        setIsPlaying(false);
      }
    }

    return () => {
      if (oscillatorRef.current && audioContextRef.current) {
        try {
          oscillatorRef.current.stop();
          audioContextRef.current.close();
        } catch (error) {
          console.error('Cleanup error:', error);
        }
        setIsPlaying(false);
      }
    };
  }, [isActive, isPlaying]);

  return null; // This component doesn't render anything visible
};

export default AlarmSystem;
import React, { useRef, useEffect } from 'react';
import { Video } from 'lucide-react';

interface CameraFeedProps {
  isActive: boolean;
  onVideoReady?: (video: HTMLVideoElement) => void;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ isActive, onVideoReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user',
          frameRate: { ideal: 30, max: 30 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          if (videoRef.current) {
            await videoRef.current.play();
            if (onVideoReady) {
              onVideoReady(videoRef.current);
            }
          }
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive]);

  return (
    <div className="relative bg-gray-800 rounded-lg border border-gray-700 overflow-hidden aspect-video">
      {isActive ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Camera Feed</h3>
          <p className="text-gray-400">Click Start to begin monitoring</p>
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
import { useCallback, useRef } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { 
  LEFT_EYE_POINTS, 
  RIGHT_EYE_POINTS, 
  MOUTH_POINTS, 
  calculateEAR, 
  calculateMAR, 
  resetCalibration,
  accumulateCalibration,
  getCurrentEARThreshold,
  getCurrentMARThreshold
} from '../utils/drowsinessDetection';
import { FaceLandmarks } from '../types/mediapipe';

interface UseMediaPipeProps {
  onDetection: (eyeStatus: string, mouthStatus: string, alertRequired: boolean) => void;
}

export const useMediaPipe = ({ onDetection }: UseMediaPipeProps) => {
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const animationRef = useRef<number>();
  const isProcessingRef = useRef<boolean>(false);
  const closedEyeStartRef = useRef<number | null>(null);
  const openMouthStartRef = useRef<number | null>(null);

  const initializeMediaPipe = useCallback(() => {
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
    }

    // Initialize Face Mesh
    faceMeshRef.current = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMeshRef.current.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    let calibrating = true;
    let calibrationStart = Date.now();

    faceMeshRef.current.onResults((results) => {
      isProcessingRef.current = false;

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // Calibration phase: collect baseline EAR/MAR for first 2 seconds
        if (calibrating) {
          accumulateCalibration(landmarks);
          if (Date.now() - calibrationStart > 2000) calibrating = false; // 2 seconds
          onDetection('Calibrating', 'Calibrating', false);
          return;
        }

        // Detection phase
        const leftEAR = calculateEAR(landmarks, LEFT_EYE_POINTS);
        const rightEAR = calculateEAR(landmarks, RIGHT_EYE_POINTS);
        const mar = calculateMAR(landmarks, MOUTH_POINTS);
        const avgEAR = (leftEAR + rightEAR) / 2;

        const earThreshold = getCurrentEARThreshold();
        const marThreshold = getCurrentMARThreshold();

        const eyesClosed = avgEAR < earThreshold;
        const isYawning = mar > marThreshold;

        const now = performance.now();

        // Debounce for drowsiness (eyes)
        if (eyesClosed) {
          if (closedEyeStartRef.current === null) closedEyeStartRef.current = now;
        } else {
          closedEyeStartRef.current = null;
        }

        // Debounce for yawning (mouth)
        if (isYawning) {
          if (openMouthStartRef.current === null) openMouthStartRef.current = now;
        } else {
          openMouthStartRef.current = null;
        }

        // Only trigger alert if sustained for 1 second (1000 ms)
        const drowsyDetected = closedEyeStartRef.current !== null && (now - closedEyeStartRef.current > 3000);
        const yawnDetected = openMouthStartRef.current !== null && (now - openMouthStartRef.current > 3000);

        const eyeStatus = drowsyDetected ? 'Drowsy' : 'Active';
        const mouthStatus = yawnDetected ? 'Yawning' : 'Active';
        const alertRequired = drowsyDetected || yawnDetected;

        onDetection(eyeStatus, mouthStatus, alertRequired);
      } else {
        onDetection('Inactive', 'Inactive', false);
      }
    });
  }, [onDetection]);

  const processFrame = useCallback(async (videoElement: HTMLVideoElement) => {
    if (!faceMeshRef.current || !videoElement || isProcessingRef.current) {
      animationRef.current = requestAnimationFrame(() => processFrame(videoElement));
      return;
    }

    if (videoElement.readyState >= 2) {
      isProcessingRef.current = true;
      try {
        await faceMeshRef.current.send({ image: videoElement });
      } catch (error) {
        console.error('MediaPipe processing error:', error);
        isProcessingRef.current = false;
      }
    }

    animationRef.current = requestAnimationFrame(() => processFrame(videoElement));
  }, []);

  const startDetection = useCallback(async (videoElement: HTMLVideoElement) => {
    resetCalibration(); // Reset calibration for new session
    initializeMediaPipe();
    
    // Wait a bit for MediaPipe to initialize
    setTimeout(() => {
      processFrame(videoElement);
    }, 1000);
  }, [initializeMediaPipe, processFrame]);

  const stopDetection = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    isProcessingRef.current = false;
    
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }
  }, []);

  return {
    startDetection,
    stopDetection
  };
};
export type FaceLandmark = { x: number; y: number; z?: number };
export type FaceLandmarks = FaceLandmark[]; // Make FaceLandmarks an array of FaceLandmark

export interface DetectionResults {
  multiFaceLandmarks: FaceLandmarks[][];
}

export interface EyePoints {
  leftEye: number[];
  rightEye: number[];
}

export interface MouthPoints {
  mouth: number[];
}

export interface DrowsinessState {
  eyeStatus: 'Active' | 'Drowsy' | 'Inactive';
  mouthStatus: 'Active' | 'Yawning' | 'Inactive';
  isMonitoring: boolean;
  alertActive: boolean;
}
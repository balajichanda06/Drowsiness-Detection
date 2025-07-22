import { FaceLandmarks } from '../types/mediapipe';

// ---------------------------------------------------------
// Landmark index sets
// ---------------------------------------------------------
export const LEFT_EYE_POINTS = [33, 160, 158, 133, 153, 144];
export const RIGHT_EYE_POINTS = [263, 387, 385, 362, 380, 373];

// Mouth indices chosen for vertical aperture + horizontal span.
// These work reasonably for yawn detection across head poses.
export const MOUTH_POINTS = [13, 14, 78, 308, 82, 312, 87, 317];

// ---------------------------------------------------------
// Static thresholds (fallbacks / post-calibration multipliers)
// Tune these for your application.
// ---------------------------------------------------------
const EAR_THRESHOLD = 0.41; // Lower -> more sensitive to eye closure
const MAR_THRESHOLD = 0.80; // Higher -> less sensitive to false yawns (0-1 scale)

// Calibration multipliers: when we collect baseline EAR/MAR from user,
// we multiply by these to derive dynamic thresholds.
const EAR_CALIBRATION_FACTOR = 0.75; // 75% of normal open-eye EAR -> blink trigger
const MAR_CALIBRATION_FACTOR = 1.40; // 140% of relaxed-mouth MAR -> yawn trigger

// ---------------------------------------------------------
// Internal calibration state (optional)
// ---------------------------------------------------------
let earBaseline: number | null = null;
let marBaseline: number | null = null;
let calibrationSamples = 0;

/**
 * Feed a "normal" attentive frame into calibration. Call from your
 * processing loop *before* you start detecting events (e.g., first ~2 sec).
 */
export function accumulateCalibration(landmarks: FaceLandmarks) {
  const leftEAR = _calcEARFromEye(landmarks, LEFT_EYE_POINTS);
  const rightEAR = _calcEARFromEye(landmarks, RIGHT_EYE_POINTS);
  const ear = (leftEAR + rightEAR) / 2;

  const mar = _calcMARFromMouth(landmarks, MOUTH_POINTS);

  if (!Number.isFinite(ear) || !Number.isFinite(mar)) return;

  // Incremental running averages
  calibrationSamples += 1;
  earBaseline = earBaseline === null ? ear : earBaseline + (ear - earBaseline) / calibrationSamples;
  marBaseline = marBaseline === null ? mar : marBaseline + (mar - marBaseline) / calibrationSamples;
}

/**
 * Clear collected calibration so you can re-calibrate (e.g., user button press).
 */
export function resetCalibration() {
  earBaseline = null;
  marBaseline = null;
  calibrationSamples = 0;
}

// ---------------------------------------------------------
// Public helper: Calculate EAR across both eyes (average).
// Returns value in ~[0,1]. Lower means more closed.
// ---------------------------------------------------------
export function calculateEAR(landmarks: FaceLandmarks, eyeIndices: number[]): number {
  return _calcEARFromEye(landmarks, eyeIndices);
}

// ---------------------------------------------------------
// Public helper: Calculate MAR for mouth aperture.
// Returns value in ~[0,1]. Higher means more open.
// ---------------------------------------------------------
export function calculateMAR(landmarks: FaceLandmarks, mouthIndices: number[]): number {
  return _calcMARFromMouth(landmarks, mouthIndices);
}

// ---------------------------------------------------------
// Public helper: Return the EAR threshold currently in effect.
// Uses calibrated baseline if available; otherwise static fallback.
// ---------------------------------------------------------
export function getCurrentEARThreshold(): number {
  if (earBaseline !== null && calibrationSamples >= 5) {
    return earBaseline * EAR_CALIBRATION_FACTOR;
  }
  return EAR_THRESHOLD;
}

// ---------------------------------------------------------
// Public helper: Return the MAR threshold currently in effect.
// Uses calibrated baseline if available; otherwise static fallback.
// ---------------------------------------------------------
export function getCurrentMARThreshold(): number {
  if (marBaseline !== null && calibrationSamples >= 5) {
    return marBaseline * MAR_CALIBRATION_FACTOR;
  }
  return MAR_THRESHOLD;
}

// ---------------------------------------------------------
// Utility math
// ---------------------------------------------------------
type Pt = { x: number; y: number; z?: number };

function dist2D(a: Pt, b: Pt): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function getLM(landmarks: FaceLandmarks, idx: number): Pt | null {
  if (!landmarks || !Array.isArray(landmarks)) return null;
  const lm = landmarks[idx];
  if (!lm || typeof lm.x !== 'number' || typeof lm.y !== 'number') return null;
  return lm;
}

// ---------------------------------------------------------
// EAR implementation
// Expected index order: [p1, p2, p3, p4, p5, p6]
// Formula (Eye Aspect Ratio):
// EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
// This is the standard Tereza Soukupová & Jan Čech (2016) blink metric pattern.
// ---------------------------------------------------------
function _calcEARFromEye(landmarks: FaceLandmarks, eyeIndices: number[]): number {
  if (eyeIndices.length < 6) return NaN;
  const p: (Pt | null)[] = eyeIndices.map(i => getLM(landmarks, i));
  if (p.some(v => v === null)) return NaN;

  const [p1, p2, p3, p4, p5, p6] = p as Pt[];

  const vert1 = dist2D(p2, p6);
  const vert2 = dist2D(p3, p5);
  const horiz = dist2D(p1, p4);

  if (horiz === 0) return NaN;
  return (vert1 + vert2) / (2 * horiz);
}

// ---------------------------------------------------------
// MAR implementation
// We'll approximate using a top-bottom average over 4 vertical pairs
// divided by horizontal mouth width.
// Order assumption for MOUTH_POINTS (8 indices):
// [upper1, upper2, lower1, rightCorner1, rightCorner2, lower2, lower3, leftCorner]
// We take:
// - vertical pairs: (upper1, lower1), (upper2, lower2)  [primary upper/lower]
// - extra vertical: (upper1, lower3) for robustness
// - mouth width: min dist between any rightCorner* & leftCorner
//
// Output scaled 0-1-ish because landmarks are normalized.
// ---------------------------------------------------------
function _calcMARFromMouth(landmarks: FaceLandmarks, mouthIndices: number[]): number {
  if (mouthIndices.length < 8) return NaN;
  const pts: (Pt | null)[] = mouthIndices.map(i => getLM(landmarks, i));
  if (pts.some(v => v === null)) return NaN;

  const [u1, u2, l1, r1, r2, l2b, l3b, lCorner] = pts as Pt[]; // naming loose; see note above

  // Pick a left corner (last index) and a right corner (choose the first of the right pair)
  const leftCorner = lCorner;
  const rightCorner = r1; // could also average r1/r2; feel free to refine
  const mouthWidth = dist2D(leftCorner, rightCorner);

  if (mouthWidth === 0) return NaN;

  // Vertical distances
  const v1 = dist2D(u1, l1);
  const v2 = dist2D(u2, l2b);
  const v3 = dist2D(u1, l3b);

  const vertAvg = (v1 + v2 + v3) / 3;

  return vertAvg / mouthWidth;
}

// ---------------------------------------------------------
// Optional convenience: classify per-frame state
// (You can ignore if you handle logic in your hook.)
// ---------------------------------------------------------
export interface DrowsinessFrameMetrics {
  ear: number;
  mar: number;
  isEyesClosed: boolean;
  isYawn: boolean;
  earThreshold: number;
  marThreshold: number;
  calibrated: boolean;
  calibrationSamples: number;
}

export function analyzeFrame(landmarks: FaceLandmarks): DrowsinessFrameMetrics {
  const ear = calculateEAR(landmarks, LEFT_EYE_POINTS); // Pass indices
  const mar = calculateMAR(landmarks, MOUTH_POINTS);    // Pass indices

  const earTh = getCurrentEARThreshold();
  const marTh = getCurrentMARThreshold();

  return {
    ear,
    mar,
    isEyesClosed: Number.isFinite(ear) ? ear < earTh : false,
    isYawn: Number.isFinite(mar) ? mar > marTh : false,
    earThreshold: earTh,
    marThreshold: marTh,
    calibrated: calibrationSamples >= 5,
    calibrationSamples
  };
}

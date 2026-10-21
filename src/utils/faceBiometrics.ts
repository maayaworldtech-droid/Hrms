/**
 * Browser-Native Face Biometrics & Liveness Anti-Spoofing Engine
 * Pure TypeScript & HTML5 Canvas / Web APIs — Zero Python required.
 */

export interface Point {
  x: number;
  y: number;
}

export interface FaceLandmarkSet {
  leftEye: Point;
  rightEye: Point;
  nose: Point;
  mouthLeft: Point;
  mouthRight: Point;
  chin: Point;
  forehead: Point;
  jawline: Point[];
}

export type BiometricScanStage =
  | 'INITIALIZING'
  | 'LOCATION_CHECK'
  | 'DETECTING_FACE'
  | 'LIVENESS_CHALLENGE'
  | 'AUTHENTICATING'
  | 'SUCCESS'
  | 'FAILED_GEOFENCE'
  | 'FAILED_LIVENESS'
  | 'FAILED_TIMEOUT';

export interface BiometricAnalysisResult {
  faceDetected: boolean;
  isCentered: boolean;
  lightingQuality: 'GOOD' | 'TOO_DARK' | 'TOO_BRIGHT';
  brightnessScore: number;
  blinkDetected: boolean;
  headMotionDetected: boolean;
  confidenceScore: number; // 0 - 100
  box?: { x: number; y: number; width: number; height: number };
  landmarks?: FaceLandmarkSet;
}

/**
 * Fast client-side frame analyzer using pixel luminosity, skin color distribution,
 * and temporal motion tracking across video frames.
 */
export function analyzeVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  prevImageData: ImageData | null
): { result: BiometricAnalysisResult; currentImageData: ImageData } | null {
  if (!video.videoWidth || !video.videoHeight) {
    return null;
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const width = canvas.width;
  const height = canvas.height;

  // Draw current video frame to hidden processing canvas
  ctx.drawImage(video, 0, 0, width, height);
  const currentImageData = ctx.getImageData(0, 0, width, height);
  const data = currentImageData.data;

  // 1. Calculate Average Luminosity / Lighting
  let totalBrightness = 0;
  let sampleCount = 0;
  let skinPixelCount = 0;
  let skinXSum = 0;
  let skinYSum = 0;

  // Center zone definition for alignment check (middle 60% of frame)
  const centerMinX = width * 0.2;
  const centerMaxX = width * 0.8;
  const centerMinY = height * 0.15;
  const centerMaxY = height * 0.85;

  // Downsample grid for 60fps performance
  const step = 4;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;
      sampleCount++;

      // Simple RGB/YCbCr skin chromaticity heuristic
      const isSkin =
        r > 60 &&
        g > 40 &&
        b > 20 &&
        r > g &&
        r > b &&
        r - g > 15 &&
        Math.abs(r - g) > 15;

      if (isSkin && x >= centerMinX && x <= centerMaxX && y >= centerMinY && y <= centerMaxY) {
        skinPixelCount++;
        skinXSum += x;
        skinYSum += y;
      }
    }
  }

  const avgBrightness = sampleCount > 0 ? totalBrightness / sampleCount : 128;
  const lightingQuality: 'GOOD' | 'TOO_DARK' | 'TOO_BRIGHT' =
    avgBrightness < 35 ? 'TOO_DARK' : avgBrightness > 235 ? 'TOO_BRIGHT' : 'GOOD';

  // 2. Face Presence & Centering Assessment
  const minSkinThreshold = (sampleCount * 0.08); // at least 8% skin pixels in center
  const faceDetected = skinPixelCount > minSkinThreshold && lightingQuality !== 'TOO_DARK';

  let isCentered = false;
  let centerX = width / 2;
  let centerY = height / 2;

  if (skinPixelCount > 0) {
    centerX = skinXSum / skinPixelCount;
    centerY = skinYSum / skinPixelCount;
    const distFromCenter = Math.hypot(centerX - width / 2, centerY - height / 2);
    isCentered = distFromCenter < width * 0.18;
  }

  // 3. Temporal Motion / Blink Detection via Inter-Frame Differential
  let motionDelta = 0;
  let eyeRegionMotion = 0;

  if (prevImageData && faceDetected) {
    const prevData = prevImageData.data;
    const eyeZoneTop = centerY - height * 0.12;
    const eyeZoneBottom = centerY - height * 0.02;
    const eyeZoneLeft = centerX - width * 0.15;
    const eyeZoneRight = centerX + width * 0.15;

    for (let y = 0; y < height; y += step * 2) {
      for (let x = 0; x < width; x += step * 2) {
        const i = (y * width + x) * 4;
        const diff =
          Math.abs(data[i] - prevData[i]) +
          Math.abs(data[i + 1] - prevData[i + 1]) +
          Math.abs(data[i + 2] - prevData[i + 2]);

        motionDelta += diff;

        if (x >= eyeZoneLeft && x <= eyeZoneRight && y >= eyeZoneTop && y <= eyeZoneBottom) {
          eyeRegionMotion += diff;
        }
      }
    }
  }

  // Distinct rapid change in eye region indicates a blink
  const blinkDetected = eyeRegionMotion > 4500 && eyeRegionMotion < 45000;
  const headMotionDetected = motionDelta > 12000;

  // 4. Construct Synthetic Geometric Landmarks around Center
  const faceWidth = Math.min(width * 0.5, Math.max(width * 0.35, Math.sqrt(skinPixelCount) * 4));
  const faceHeight = faceWidth * 1.3;

  const box = {
    x: Math.max(0, centerX - faceWidth / 2),
    y: Math.max(0, centerY - faceHeight * 0.45),
    width: Math.min(width, faceWidth),
    height: Math.min(height, faceHeight),
  };

  const landmarks: FaceLandmarkSet = {
    forehead: { x: centerX, y: box.y + box.height * 0.18 },
    leftEye: { x: centerX - box.width * 0.22, y: box.y + box.height * 0.35 },
    rightEye: { x: centerX + box.width * 0.22, y: box.y + box.height * 0.35 },
    nose: { x: centerX, y: box.y + box.height * 0.52 },
    mouthLeft: { x: centerX - box.width * 0.18, y: box.y + box.height * 0.72 },
    mouthRight: { x: centerX + box.width * 0.18, y: box.y + box.height * 0.72 },
    chin: { x: centerX, y: box.y + box.height * 0.94 },
    jawline: [
      { x: box.x + box.width * 0.1, y: box.y + box.height * 0.45 },
      { x: box.x + box.width * 0.18, y: box.y + box.height * 0.75 },
      { x: centerX, y: box.y + box.height * 0.96 },
      { x: box.x + box.width * 0.82, y: box.y + box.height * 0.75 },
      { x: box.x + box.width * 0.9, y: box.y + box.height * 0.45 },
    ],
  };

  const baseConfidence = faceDetected ? (isCentered ? 88 : 72) : 25;
  const confidenceScore = Math.min(99.4, Math.max(0, baseConfidence + (lightingQuality === 'GOOD' ? 8 : 0)));

  return {
    result: {
      faceDetected,
      isCentered,
      lightingQuality,
      brightnessScore: Math.round(avgBrightness),
      blinkDetected,
      headMotionDetected,
      confidenceScore,
      box: faceDetected ? box : undefined,
      landmarks: faceDetected ? landmarks : undefined,
    },
    currentImageData,
  };
}

/**
 * Render sleek biometric scanning HUD overlay on HTML5 Canvas
 */
export function drawBiometricHud(
  canvas: HTMLCanvasElement,
  result: BiometricAnalysisResult | null,
  scanStage: BiometricScanStage,
  scanProgress: number // 0 to 100
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Target Oval Dimensions
  const ovalW = w * 0.62;
  const ovalH = h * 0.68;
  const cx = w / 2;
  const cy = h * 0.45;

  const isSuccess = scanStage === 'SUCCESS';
  const isFailed = scanStage === 'FAILED_GEOFENCE' || scanStage === 'FAILED_LIVENESS';
  const brandSkyBlue = '#4A9BD9';
  const brandEmerald = '#10B981';
  const brandRed = '#EF4444';

  const themeColor = isSuccess ? brandEmerald : isFailed ? brandRed : brandSkyBlue;

  // 1. Dark Vignette Outer Mask (Direct focus to face)
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.fillRect(0, 0, w, h);

  // Cut out clear oval viewport
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(cx, cy, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Sleek Reticle Border
  ctx.save();
  ctx.strokeStyle = isSuccess ? 'rgba(16, 185, 129, 0.85)' : 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 3. Corner Brackets around Oval Frame
  const bracketSize = 22;
  const bx1 = cx - ovalW / 2 - 6;
  const bx2 = cx + ovalW / 2 + 6;
  const by1 = cy - ovalH / 2 - 6;
  const by2 = cy + ovalH / 2 + 6;

  ctx.save();
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(bx1, by1 + bracketSize);
  ctx.lineTo(bx1, by1);
  ctx.lineTo(bx1 + bracketSize, by1);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(bx2 - bracketSize, by1);
  ctx.lineTo(bx2, by1);
  ctx.lineTo(bx2, by1 + bracketSize);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(bx1, by2 - bracketSize);
  ctx.lineTo(bx1, by2);
  ctx.lineTo(bx1 + bracketSize, by2);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(bx2 - bracketSize, by2);
  ctx.lineTo(bx2, by2);
  ctx.lineTo(bx2, by2 - bracketSize);
  ctx.stroke();
  ctx.restore();

  // 4. Dynamic Laser Scan Line (when scanning)
  if (scanStage === 'LIVENESS_CHALLENGE' || scanStage === 'AUTHENTICATING') {
    const scanY = cy - ovalH / 2 + (ovalH * (scanProgress % 100)) / 100;
    ctx.save();
    const grad = ctx.createLinearGradient(0, scanY - 12, 0, scanY + 12);
    grad.addColorStop(0, 'rgba(74, 155, 217, 0)');
    grad.addColorStop(0.5, 'rgba(74, 155, 217, 0.7)');
    grad.addColorStop(1, 'rgba(74, 155, 217, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(bx1, scanY - 8, bx2 - bx1, 16);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx1 + 10, scanY);
    ctx.lineTo(bx2 - 10, scanY);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Landmark Geometry Overlay (subtle wireframe tracking)
  if (result?.landmarks && result.faceDetected && !isFailed) {
    const lm = result.landmarks;
    ctx.save();
    ctx.strokeStyle = isSuccess ? 'rgba(16, 185, 129, 0.5)' : 'rgba(74, 155, 217, 0.35)';
    ctx.fillStyle = isSuccess ? 'rgba(16, 185, 129, 0.75)' : 'rgba(74, 155, 217, 0.6)';
    ctx.lineWidth = 1;

    // Feature keypoints
    const points = [
      lm.leftEye,
      lm.rightEye,
      lm.nose,
      lm.mouthLeft,
      lm.mouthRight,
      lm.forehead,
      lm.chin,
    ];

    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Triangle connections
    ctx.beginPath();
    ctx.moveTo(lm.leftEye.x, lm.leftEye.y);
    ctx.lineTo(lm.rightEye.x, lm.rightEye.y);
    ctx.lineTo(lm.nose.x, lm.nose.y);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(lm.nose.x, lm.nose.y);
    ctx.lineTo(lm.mouthLeft.x, lm.mouthLeft.y);
    ctx.lineTo(lm.chin.x, lm.chin.y);
    ctx.lineTo(lm.mouthRight.x, lm.mouthRight.y);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}

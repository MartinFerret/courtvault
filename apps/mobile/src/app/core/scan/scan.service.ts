import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { TextRecognition } from '@capacitor-mlkit/text-recognition';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../supabase/supabase.service';

export interface ScanCandidate {
  card: {
    id: string;
    slug: string;
    number: string;
    isRookie: boolean;
    playerId: string;
    playerName: string;
    setId: string;
    setName: string;
    setSlug: string;
    season: string;
  };
  score: number;
  reasons: string[];
  parallels: { id: string; name: string; serialRun: number | null }[];
}

export interface ScanResult {
  signals: {
    numbers: string[];
    season: string | null;
    serial: { number: number; run: number } | null;
    setHints: string[];
    players: { id: string; name: string; confidence: number }[];
  };
  candidates: ScanCandidate[];
}

export interface CapturedPhoto {
  /** Data URL of the compressed thumbnail (JPEG, target < 100 KB). */
  dataUrl: string;
  thumbnail: Blob;
  /** Path on device for native OCR, null in the browser. */
  nativePath: string | null;
  /** Full-size image for browser OCR (webcam frame or uploaded photo), null on native. */
  webImage: Blob | null;
}

/** Fake OCR text used in the browser or when the camera is unavailable. */
export const SIMULATED_OCR_SAMPLES = [
  '2025-26 TOPPS CHROME BASKETBALL\nCOOPER FLAGG  Dallas Mavericks\nNo. 3\n© 2026 The Topps Company',
  '2025-26 TOPPS CHROME\nVICTOR WEMBANYAMA  San Antonio Spurs\nNo. 1  12/50 Gold Refractor',
  '2025-26 T0PPS BASKETBALL\nNIK0LA J0KIC  Denver Nuggets  No. 15',
  '2026-27 TOPPS BASKETBALL\nAJ DYBANTSA  No. 1  RC',
];

/**
 * Scan flow: photo of the card back -> OCR -> scan-match. Native: ML Kit on device. Web:
 * Tesseract.js, loaded only when a photo is actually scanned (R63), behind the web_scanner
 * flag until its accuracy is measured. Dev builds without a photo fall back to sample texts.
 */
@Injectable({ providedIn: 'root' })
export class ScanService {
  private readonly supabase = inject(SupabaseService);
  readonly isNative = Capacitor.isNativePlatform();
  readonly lastText = signal<string>('');
  readonly webScannerEnabled = signal(false);
  /** OCR progress on the web (0..1), for the spinner label. */
  readonly ocrProgress = signal(0);
  private sampleIndex = 0;

  async loadFlags(): Promise<void> {
    if (this.isNative) return;
    const { data } = await this.supabase.client.rpc('web_scanner_enabled');
    this.webScannerEnabled.set(!!data);
  }

  /** Browser: a webcam frame or an uploaded photo becomes a CapturedPhoto. */
  async captureFromFile(file: Blob): Promise<CapturedPhoto> {
    const url = URL.createObjectURL(file);
    try {
      const { dataUrl, blob } = await this.compress(url);
      return { dataUrl, thumbnail: blob, nativePath: null, webImage: file };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async capture(): Promise<CapturedPhoto | null> {
    if (!this.isNative) return null;
    const photo = await Camera.getPhoto({
      quality: 80,
      width: 1280,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      saveToGallery: false,
    });
    if (!photo.webPath) return null;
    const { dataUrl, blob } = await this.compress(photo.webPath);
    return { dataUrl, thumbnail: blob, nativePath: photo.path ?? null, webImage: null };
  }

  /** Runs OCR on the captured photo. Dev builds without a photo use a simulated text. */
  async recognize(photo: CapturedPhoto | null): Promise<string> {
    let text = '';
    if (this.isNative && photo?.nativePath) {
      const result = await TextRecognition.processImage({ path: photo.nativePath });
      text = result.text;
    } else if (photo?.webImage) {
      text = await this.recognizeInBrowser(photo.webImage);
    } else if (!environment.production) {
      text = SIMULATED_OCR_SAMPLES[this.sampleIndex % SIMULATED_OCR_SAMPLES.length] ?? '';
      this.sampleIndex++;
    }
    this.lastText.set(text);
    return text;
  }

  /** Tesseract.js, English, loaded on demand (about 2 MB of worker and language data, cached). */
  async recognizeInBrowser(image: Blob): Promise<string> {
    this.ocrProgress.set(0);
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') this.ocrProgress.set(m.progress);
      },
    });
    try {
      const { data } = await worker.recognize(image);
      return data.text;
    } finally {
      await worker.terminate();
      this.ocrProgress.set(0);
    }
  }

  match(text: string): Promise<ScanResult> {
    return this.supabase.invoke<ScanResult>('scan-match', { text, limit: 5 });
  }

  /** Resizes to 600px max and compresses to JPEG until under ~100 KB. */
  private async compress(src: string): Promise<{ dataUrl: string; blob: Blob }> {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
    const scale = Math.min(1, 600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let quality = 0.8;
    let blob = await toBlob(canvas, quality);
    while (blob.size > 100_000 && quality > 0.4) {
      quality -= 0.1;
      blob = await toBlob(canvas, quality);
    }
    return { dataUrl: canvas.toDataURL('image/jpeg', quality), blob };
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      quality,
    ),
  );
}

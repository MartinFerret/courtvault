import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { TextRecognition } from '@capacitor-mlkit/text-recognition';
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
}

/** Fake OCR text used in the browser or when the camera is unavailable. */
export const SIMULATED_OCR_SAMPLES = [
  '2025-26 TOPPS CHROME BASKETBALL\nCOOPER FLAGG  Dallas Mavericks\nNo. 3\n© 2026 The Topps Company',
  '2025-26 TOPPS CHROME\nVICTOR WEMBANYAMA  San Antonio Spurs\nNo. 1  12/50 Gold Refractor',
  '2025-26 T0PPS BASKETBALL\nNIK0LA J0KIC  Denver Nuggets  No. 15',
  '2026-27 TOPPS BASKETBALL\nAJ DYBANTSA  No. 1  RC',
];

/**
 * Scan flow: photo of the card back -> on-device OCR (ML Kit on native) -> scan-match.
 * In the browser (no camera plugin) the OCR step is simulated with sample texts.
 */
@Injectable({ providedIn: 'root' })
export class ScanService {
  private readonly supabase = inject(SupabaseService);
  readonly isNative = Capacitor.isNativePlatform();
  readonly lastText = signal<string>('');
  private sampleIndex = 0;

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
    return { dataUrl, thumbnail: blob, nativePath: photo.path ?? null };
  }

  /** Runs OCR on the captured photo, or returns a simulated text in the browser. */
  async recognize(photo: CapturedPhoto | null): Promise<string> {
    let text = '';
    if (this.isNative && photo?.nativePath) {
      const result = await TextRecognition.processImage({ path: photo.nativePath });
      text = result.text;
    } else {
      text = SIMULATED_OCR_SAMPLES[this.sampleIndex % SIMULATED_OCR_SAMPLES.length] ?? '';
      this.sampleIndex++;
    }
    this.lastText.set(text);
    return text;
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
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', quality),
  );
}

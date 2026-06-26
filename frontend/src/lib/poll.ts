const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export type DetectionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Bbox { x1: number; y1: number; x2: number; y2: number; }
export interface DefectTypeMini { id: number; name: string; severity: string; }
export interface Finding {
  id: string;
  defect_type: DefectTypeMini;
  confidence: number;
  bbox: Bbox;
}
export interface DetectionSummary {
  id: string;
  image_path: string;
  thumbnail_path: string | null;
  status: string;
  defect_count: number;
  is_defective: boolean;
  inference_time_ms: number | null;
  model_version: string | null;
  error_message: string | null;
  created_at: string;
}
export interface StatusResponse {
  status: DetectionStatus;
  detection?: DetectionSummary;
  findings?: Finding[];
}

export const DEFECT_COLORS: Record<number, string> = {
  1: '#EF4444',  // Pinhole
  2: '#F59E0B',
  3: '#EF4444',
  4: '#F97316',
  5: '#A78BFA',
  6: '#F59E0B',
};

export async function pollStatus(detectionId: string, signal?: AbortSignal): Promise<StatusResponse> {
  const res = await fetch(`${API_BASE}/api/detect/status/${detectionId}`, {
    credentials: 'include',
    signal,
  });
  if (!res.ok) throw new Error(`Poll error: ${res.status}`);
  return res.json();
}

export function serverImageUrl(path: string): string {
  const m = path.match(/(uploads\/.+)/);
  return `${API_BASE}/${m ? m[1] : path}`;
}

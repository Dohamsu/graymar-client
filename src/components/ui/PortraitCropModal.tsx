"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

interface PortraitCropModalProps {
  imageSrc: string;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

/** 4:5 비율 크롭 영역에서 실제 픽셀을 잘라 Blob으로 반환 */
async function getCroppedBlob(
  imageSrc: string,
  crop: Area,
): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/webp",
      0.92,
    );
  });
}

export default function PortraitCropModal({
  imageSrc,
  onConfirm,
  onCancel,
}: PortraitCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback(
    (_: Area, croppedAreaPixels: Area) => {
      setCroppedArea(croppedAreaPixels);
    },
    [],
  );

  const handleConfirm = async () => {
    if (!croppedArea) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      onConfirm(blob);
    } catch {
      onCancel();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="flex w-full max-w-sm flex-col gap-4 px-4">
        {/* 크롭 영역 */}
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={4 / 5}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid={false}
            style={{
              containerStyle: {
                borderRadius: "0.5rem",
              },
            }}
          />
        </div>

        {/* 줌 슬라이더 */}
        <div className="flex items-center gap-3 px-2">
          <span className="text-xs text-[var(--text-muted)]">-</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--border-primary)] accent-[var(--gold)]"
          />
          <span className="text-xs text-[var(--text-muted)]">+</span>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="flex-1 rounded-lg border border-[var(--border-primary)] py-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing}
            className="flex-1 rounded-lg bg-[var(--gold)] py-3 text-sm font-medium text-[var(--bg-primary)] transition-colors hover:bg-[var(--gold-hover)] disabled:opacity-50"
          >
            {processing ? "처리 중..." : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { getLocationImagePath } from "@/data/location-images";

interface LocationImageProps {
  locationId: string | null | undefined;
  timePhase?: string;
  hubSafety?: string;
  phaseV2?: string;
  priority?: boolean;
}

export function LocationImage({
  locationId,
  timePhase,
  hubSafety,
  phaseV2,
  priority = false,
}: LocationImageProps) {
  const imagePath = getLocationImagePath(locationId, timePhase, hubSafety, phaseV2);
  const prevPathRef = useRef(imagePath);
  const [currentSrc, setCurrentSrc] = useState(imagePath);
  const [nextSrc, setNextSrc] = useState<string | null>(null);
  const [showNext, setShowNext] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (imagePath !== prevPathRef.current) {
      setNextSrc(imagePath);
      setShowNext(false);
      setHasError(false);
      prevPathRef.current = imagePath;
    }
  }, [imagePath]);

  const handleNextLoad = () => {
    // 새 이미지 로드 완료 → 크로스페이드 시작
    setShowNext(true);
    // 전환 완료 후 현재 이미지를 새 이미지로 교체
    setTimeout(() => {
      setCurrentSrc(nextSrc!);
      setNextSrc(null);
      setShowNext(false);
    }, 600);
  };

  if (hasError) {
    // graceful degradation: 그라디언트 배경만 표시
    return (
      <div className="relative h-[140px] w-full shrink-0 bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] lg:h-[220px]" />
    );
  }

  return (
    <div className="relative h-[140px] w-full shrink-0 overflow-hidden lg:h-[220px]">
      {/* 현재 이미지 */}
      <Image
        src={currentSrc}
        alt="Location"
        fill
        sizes="(max-width: 768px) 100vw, 800px"
        className="object-cover"
        priority={priority}
        onError={() => setHasError(true)}
      />

      {/* 다음 이미지 (크로스페이드용) */}
      {nextSrc && (
        <Image
          src={nextSrc}
          alt="Location"
          fill
          sizes="(max-width: 768px) 100vw, 800px"
          className={`object-cover transition-opacity duration-[600ms] ease-in-out ${
            showNext ? "opacity-100" : "opacity-0"
          }`}
          onLoad={handleNextLoad}
          onError={() => setHasError(true)}
        />
      )}

      {/* 하단 그라디언트 오버레이 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-50% to-[var(--bg-primary)]" />
    </div>
  );
}

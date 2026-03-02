"use client";

import { useEffect, useRef, useState } from "react";

type ImageGalleryProps = {
  images: string[];
};

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [carouselStart, setCarouselStart] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const maxStart = Math.max(0, images.length - visibleCount);
  const effectiveStart = Math.min(carouselStart, maxStart);
  const visibleImages = images.slice(effectiveStart, effectiveStart + visibleCount);

  function openAt(i: number) {
    setIndex(i);
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  function prev() {
    setIndex((current) => (current - 1 + images.length) % images.length);
  }

  function next() {
    setIndex((current) => (current + 1) % images.length);
  }

  function prevCarousel() {
    setCarouselStart((current) => Math.max(0, current - 1));
  }

  function nextCarousel() {
    setCarouselStart((current) => Math.min(maxStart, current + 1));
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
    touchEndX.current = null;
  }

  function onTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    touchEndX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd() {
    const start = touchStartX.current;
    const end = touchEndX.current;
    if (start === null || end === null) return;

    const delta = end - start;
    const minSwipe = 40;

    if (delta <= -minSwipe) {
      next();
    } else if (delta >= minSwipe) {
      prev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") {
        setIndex((current) => (current - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight") {
        setIndex((current) => (current + 1) % images.length);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, images.length]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) {
        setVisibleCount(3);
        return;
      }
      if (window.innerWidth >= 640) {
        setVisibleCount(2);
        return;
      }
      setVisibleCount(1);
    }

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (images.length === 0) {
    return <p className="text-gray-600">Nenhuma foto cadastrada.</p>;
  }

  return (
    <>
      <div className="relative">
        <div
          className={`grid gap-4 ${
            visibleCount === 3
              ? "grid-cols-3"
              : visibleCount === 2
                ? "grid-cols-2"
                : "grid-cols-1"
          }`}
        >
          {visibleImages.map((url, i) => {
            const absoluteIndex = effectiveStart + i;
            return (
              <button
                key={`${url}-${absoluteIndex}`}
                type="button"
                onClick={() => openAt(absoluteIndex)}
                className="border overflow-hidden text-left"
              >
                <img
                  src={url}
                  alt={`Foto ${absoluteIndex + 1} do imóvel`}
                  loading="lazy"
                  className="w-full h-56 object-cover hover:scale-[1.01] transition"
                />
              </button>
            );
          })}
        </div>

        {images.length > visibleCount ? (
          <>
            <button
              type="button"
              onClick={prevCarousel}
              disabled={effectiveStart === 0}
              className="absolute -left-2 top-1/2 -translate-y-1/2 bg-white rounded-full h-10 w-10 border shadow disabled:opacity-40"
              aria-label="Mostrar fotos anteriores"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={nextCarousel}
              disabled={effectiveStart >= maxStart}
              className="absolute -right-2 top-1/2 -translate-y-1/2 bg-white rounded-full h-10 w-10 border shadow disabled:opacity-40"
              aria-label="Mostrar próximas fotos"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/80 p-4 sm:p-8 flex items-center justify-center"
          onClick={close}
        >
          <div
            className="relative w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={images[index]}
              alt={`Foto ampliada ${index + 1}`}
              className="w-full max-h-[80vh] object-contain bg-black"
            />

            <button
              type="button"
              onClick={close}
              className="absolute top-3 right-3 bg-white/90 rounded-full h-10 w-10 text-xl"
              aria-label="Fechar"
            >
              ×
            </button>

            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full h-10 w-10 text-xl"
                  aria-label="Foto anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full h-10 w-10 text-xl"
                  aria-label="Próxima foto"
                >
                  ›
                </button>
              </>
            ) : null}

            <div className="mt-3 text-center text-white text-sm">
              {index + 1} / {images.length}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

export interface CarouselItemData {
  id: string;
  image: string;
  title: string;
  description?: string;
  tags?: string[];
}

export interface ThumbProgressCarouselProps {
  items: CarouselItemData[];
  /** Auto-play interval in ms. @default 5000 */
  interval?: number;
}

export function ThumbProgressCarousel({
  items,
  interval = 5000,
}: ThumbProgressCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
      setProgress(0);
    };
    api.on('select', onSelect);
    return () => { api.off('select', onSelect); };
  }, [api]);

  React.useEffect(() => {
    if (!api || isPaused) return;
    const tickRate = 50;
    const step = 100 / (interval / tickRate);
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + step;
      });
    }, tickRate);
    return () => clearInterval(timer);
  }, [api, isPaused, interval]);

  React.useEffect(() => {
    if (api && progress >= 100) {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }
  }, [api, progress]);

  return (
    <div
      className='relative w-full h-full group overflow-hidden bg-black'
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Carousel setApi={setApi} className='w-full h-full' opts={{ loop: true }}>
        <CarouselContent className='h-full m-0'>
          {items.map((item) => (
            <CarouselItem key={item.id} className='relative w-full h-full p-0'>
              <div className='absolute inset-0 overflow-hidden'>
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className='object-cover transition-transform duration-700 ease-in-out group-hover:scale-105'
                  priority
                />
                {/* Dark gradient overlay */}
                <div className='absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/85' />
              </div>

              {/* Text overlay */}
              <div className='absolute inset-0 flex flex-col justify-end p-5 pb-16'>
                {/* Tag pills */}
                {item.tags && item.tags.length > 0 && (
                  <div className='flex flex-wrap gap-1.5 mb-3'>
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className='inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-white/90 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-2.5 py-0.5'
                      >
                        <svg className='w-2.5 h-2.5 text-orange-400 shrink-0' viewBox='0 0 12 12' fill='none'>
                          <path d='M2 6l3 3 5-5' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'/>
                        </svg>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Title */}
                <h3
                  className='text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-none mb-2'
                  style={{ fontFamily: 'var(--font-carter-one)' }}
                >
                  {item.title}
                </h3>

                {/* Description */}
                {item.description && (
                  <p className='text-xs sm:text-sm text-white/70 leading-snug line-clamp-2'>
                    {item.description}
                  </p>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Labeled progress bar navigation */}
      <div className='absolute bottom-0 left-0 right-0 flex gap-2 px-5 pb-4'>
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => api?.scrollTo(idx)}
            className='flex-1 flex flex-col gap-1 group/nav text-left'
          >
            <span
              className={cn(
                'text-[9px] sm:text-[10px] font-bold uppercase tracking-widest truncate transition-colors duration-200',
                idx === current
                  ? 'text-white'
                  : 'text-white/40 group-hover/nav:text-white/70'
              )}
              style={idx === current ? { fontFamily: 'var(--font-carter-one)' } : undefined}
            >
              {item.title}
            </span>
            <div className='h-0.5 w-full bg-white/20 rounded-full overflow-hidden'>
              {idx === current ? (
                <div
                  className='h-full bg-orange-400 rounded-full transition-none'
                  style={{ width: `${progress}%` }}
                />
              ) : (
                <div
                  className={cn(
                    'h-full rounded-full',
                    idx < current ? 'w-full bg-white/50' : 'w-0'
                  )}
                />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

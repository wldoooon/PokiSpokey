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
  objectPosition?: string;
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
  const [isPaused, setIsPaused] = React.useState(false);
  // Drives CSS transition: false = width:0 (reset), true = width:100% (fill)
  const [filling, setFilling] = React.useState(false);

  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
      // Reset the bar instantly, then start filling on next frame
      setFilling(false);
    };
    api.on('select', onSelect);
    return () => { api.off('select', onSelect); };
  }, [api]);

  // When filling resets to false, kick it back to true on the next frame
  // so the CSS transition animates from 0% → 100%
  React.useEffect(() => {
    if (filling || !api) return;
    const raf = requestAnimationFrame(() => setFilling(true));
    return () => cancelAnimationFrame(raf);
  }, [filling, api]);

  // When the CSS transition ends (bar reaches 100%), advance the slide
  const handleTransitionEnd = React.useCallback(() => {
    if (!api || isPaused) return;
    if (api.canScrollNext()) {
      api.scrollNext();
    } else {
      api.scrollTo(0);
    }
  }, [api, isPaused]);

  return (
    <div
      className='relative w-full h-full group overflow-hidden bg-black'
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        // Restart the fill when unpausing
        setFilling(false);
      }}
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
                  style={{ objectPosition: item.objectPosition ?? 'center' }}
                  priority
                />
                {/* Dark gradient overlay */}
                <div className='absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/85' />
              </div>

            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Labeled progress bar navigation */}
      <div className='absolute bottom-0 left-0 right-0 flex flex-col sm:flex-row gap-1 sm:gap-2 px-3 sm:px-5 pb-3 sm:pb-4'>
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => api?.scrollTo(idx)}
            className='flex flex-row items-center gap-2 sm:flex-1 sm:flex-col sm:items-start sm:gap-1 group/nav text-left w-full'
          >
            <span
              className={cn(
                'text-[9px] sm:text-[10px] font-bold uppercase tracking-widest whitespace-nowrap sm:truncate transition-colors duration-200 shrink-0',
                idx === current
                  ? 'text-white'
                  : 'text-white/40 group-hover/nav:text-white/70'
              )}
            >
              {item.title}
            </span>
            <div className='h-0.5 flex-1 sm:flex-none sm:w-full bg-white/20 rounded-full overflow-hidden'>
              {idx === current ? (
                <div
                  className='h-full bg-orange-400 rounded-full'
                  style={{
                    width: filling && !isPaused ? '100%' : '0%',
                    transition: filling && !isPaused
                      ? `width ${interval}ms linear`
                      : 'none',
                  }}
                  onTransitionEnd={handleTransitionEnd}
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

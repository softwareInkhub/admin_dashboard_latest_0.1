import React, { useEffect, useRef } from 'react';

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
  children: React.ReactNode;
}

const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 200,
  children
}) => {
  const loaderRef = useRef<HTMLDivElement>(null);
  const prevY = useRef(0);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Create the intersection observer
    observer.current = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        const y = firstEntry.boundingClientRect.y;

        // Only trigger when scrolling down
        if (prevY.current > y) {
          if (firstEntry.isIntersecting && hasMore && !isLoading) {
            onLoadMore();
          }
        }

        prevY.current = y;
      },
      { 
        root: null, // Use the viewport
        rootMargin: `0px 0px ${threshold}px 0px`, // Load more when element is 200px from the bottom
        threshold: 0.1
      }
    );

    // Start observing the loader element
    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef) {
      observer.current.observe(currentLoaderRef);
    }

    // Clean up the observer
    return () => {
      if (currentLoaderRef && observer.current) {
        observer.current.unobserve(currentLoaderRef);
      }
    };
  }, [hasMore, isLoading, onLoadMore, threshold]);

  // Trigger load more when previous data is loaded and there's more to load
  useEffect(() => {
    if (hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div className="w-full">
      {children}
      
      {hasMore && (
        <div 
          ref={loaderRef} 
          className="w-full h-12 flex items-center justify-center my-4"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-blue-600 animate-pulse"></div>
              <div className="w-4 h-4 rounded-full bg-blue-600 animate-pulse delay-150 mx-1"></div>
              <div className="w-4 h-4 rounded-full bg-blue-600 animate-pulse delay-300"></div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">Loading next batch...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default InfiniteScroll; 
'use client';

import React, { useRef, useEffect } from 'react';
import { ToastContainer, registerToastContainer } from './Toast';

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const toastContainerRef = useRef<any>(null);
  
  useEffect(() => {
    if (toastContainerRef.current) {
      registerToastContainer(toastContainerRef.current);
    }
  }, []);
  
  return (
    <>
      {children}
      <ToastContainer ref={toastContainerRef} />
    </>
  );
} 
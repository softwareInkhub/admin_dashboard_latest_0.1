'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { usePathname } from 'next/navigation';
import { getSavedTables, removeTableFromSidebar, SavedTable } from '@/utils/dynamodbSidebar';

// Metadata needs to be exported from a separate file in client components
// This is just for reference now
const metadata = {
  title: 'Admin Dashboard',
  description: 'Admin dashboard',
};

// Define a sidebar item component with proper TypeScript types
interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  text: string;
  isActive?: boolean;
  isCollapsed?: boolean;
}

function SidebarItem({ href, icon, text, isActive = false, isCollapsed = false }: SidebarItemProps) {
  return (
    <Link 
      href={href}
      className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3 px-4'} py-2 rounded-md ${
        isActive 
          ? 'bg-blue-500 text-white' 
          : 'text-gray-500 hover:bg-gray-100'
      }`}
      title={isCollapsed ? text : undefined} // Add tooltip when collapsed
    >
      <div className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-blue-400'}`}>
        {isCollapsed ? 
          <div className="flex items-center justify-center">
            {React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4 md:h-5 md:w-5' })}
          </div> : 
          icon
        }
      </div>
      {!isCollapsed && <div className="text-sm md:text-base font-medium">{text}</div>}
    </Link>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the current path to determine which sidebar item is active
  const pathname = usePathname();
  
  // State for saved DynamoDB tables
  const [savedTables, setSavedTables] = useState<SavedTable[]>([]);
  
  // State for sidebar collapsed status
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // State to track if we're on a small screen
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  
  // State to control sidebar visibility on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Load saved tables when component mounts
  useEffect(() => {
    // Load saved tables
    setSavedTables(getSavedTables());
    
    // Listen for changes to saved tables
    const handleTablesUpdated = () => {
      setSavedTables(getSavedTables());
    };
    
    window.addEventListener('dynamodb-tables-updated', handleTablesUpdated);
    
    // Check screen size initially
    const checkScreenSize = () => {
      const isSmall = window.innerWidth < 768; // md breakpoint in Tailwind
      setIsSmallScreen(isSmall);
      
      // Set collapsed state based on screen size and stored preference
      const storedCollapsedState = localStorage.getItem('sidebarCollapsed');
      if (storedCollapsedState) {
        setIsCollapsed(storedCollapsedState === 'true');
      } else {
        // If no stored preference, collapse by default on small screens
        setIsCollapsed(isSmall);
      }
      
      // Close sidebar on small screens when resizing
      if (isSmall) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    checkScreenSize();
    
    // Add resize listener
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('dynamodb-tables-updated', handleTablesUpdated);
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);
  
  // Toggle sidebar collapsed state
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };
  
  // Toggle sidebar visibility on mobile
  const toggleSidebarVisibility = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // Check if a path is active based on the current URL path
  const isActive = (path: string): boolean => {
    if (path === '/admin' && pathname === '/admin') {
      return true;
    }
    
    // For other paths, check if the pathname starts with the given path
    return path !== '/admin' && pathname?.startsWith(path) || false;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm z-20 relative">
        <div className="max-w-full mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile sidebar toggle button */}
              {isSmallScreen && (
                <button
                  onClick={toggleSidebarVisibility}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 mr-2"
                  aria-expanded={isSidebarOpen}
                >
                  <span className="sr-only">Open sidebar</span>
                  <svg 
                    className="h-4 w-4" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    aria-hidden="true"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
                    />
                  </svg>
                </button>
              )}
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-gray-800">
                  Admin Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-4rem)] relative">
        {/* Sidebar Overlay for mobile - show only when sidebar is open on small screens */}
        {isSmallScreen && isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-20"
            onClick={toggleSidebarVisibility}
            aria-hidden="true"
          ></div>
        )}
        
        {/* Sidebar */}
        <div 
          className={`${
            isSmallScreen 
              ? `fixed inset-y-0 left-0 mt-16 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-30`
              : 'relative'
          } ${
            isCollapsed ? 'w-12 md:w-16' : 'w-48 md:w-64'
          } flex-shrink-0 bg-white shadow-md overflow-y-auto transition-all duration-300 ease-in-out`}
        >
          <div className="py-3 relative">
            {/* Toggle button */}
            <div className="flex justify-end px-2 mb-2">
              <button 
                onClick={toggleSidebar}
                className="p-1 hover:bg-gray-200 hover:rounded-md focus:outline-none border-0"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <svg 
                  className="h-3 w-3 md:h-4 md:w-4 text-gray-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d={isCollapsed 
                      ? "M13 5l7 7-7 7M5 5l7 7-7 7" // Expand icon (chevrons right)
                      : "M11 19l-7-7 7-7M19 19l-7-7 7-7" // Collapse icon (chevrons left)
                    } 
                  />
                </svg>
              </button>
            </div>
            
            <SidebarItem 
              href="/admin" 
              isActive={isActive('/admin')}
              isCollapsed={isCollapsed}
              icon={
                <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              } 
              text="Dashboard" 
            />
            
            <SidebarItem 
              href="/admin/pinterest" 
              isActive={isActive('/admin/pinterest')}
              isCollapsed={isCollapsed}
              icon={
                <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.477 2 2 6.477 2 12c0 4.236 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.182-.78 1.172-4.97 1.172-4.97s-.299-.6-.299-1.486c0-1.39.806-2.428 1.81-2.428.853 0 1.264.64 1.264 1.408 0 .858-.546 2.14-.828 3.33-.236.995.5 1.807 1.48 1.807 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.177-4.068-2.845 0-4.515 2.134-4.515 4.34 0 .859.331 1.781.745 2.281.082.099.093.185.069.288-.076.31-.245.995-.278 1.134-.044.183-.145.222-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.472 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.525-2.291-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z" />
                </svg>
              } 
              text="Pinterest" 
            />
            
            {/* Render saved DynamoDB tables */}
            {savedTables.length > 0 && (
              <>
                <div className="my-3 border-t border-gray-200"></div>
                {!isCollapsed && (
                  <div className="px-4 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Saved Tables
                    </h3>
                  </div>
                )}
                {savedTables.map(table => (
                  <div key={table.name} className={`${isCollapsed ? 'px-0 text-center' : 'px-3'} mb-1 relative group`}>
                    <Link 
                      href={`/admin/dynamodb/tables/${encodeURIComponent(table.name)}`}
                      className={`flex items-center ${isCollapsed ? 'justify-center py-2' : 'px-4 py-1.5 md:py-2'} text-sm font-medium rounded-md ${
                        pathname === `/admin/dynamodb/tables/${encodeURIComponent(table.name)}` 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                      title={isCollapsed ? table.name : undefined}
                    >
                      <svg className={`${isCollapsed ? '' : 'mr-3'} h-3.5 w-3.5 md:h-5 md:w-5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                      </svg>
                      {!isCollapsed && <span className="truncate text-xs md:text-sm">{table.name}</span>}
                      {!isCollapsed && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeTableFromSidebar(table.name);
                          }}
                          className="absolute right-1 opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200"
                          aria-label="Remove from sidebar"
                        >
                          <svg className="h-3 w-3 md:h-4 md:w-4 text-gray-500 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </Link>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          {/* Small screen sidebar toggle button (fixed to bottom left) */}
          {children}
        </div>
      </div>
    </div>
  );
} 
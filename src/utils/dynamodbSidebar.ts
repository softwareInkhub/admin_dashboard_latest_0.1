// Key for localStorage
const SAVED_TABLES_KEY = 'dynamodb-saved-tables';

// Interface for saved table data
export interface SavedTable {
  name: string;
  addedAt: number; // timestamp
}

/**
 * Add a table to the sidebar saved tables
 */
export function addTableToSidebar(tableName: string): void {
  const savedTables = getSavedTables();
  
  // Prevent duplicates
  if (!savedTables.some(table => table.name === tableName)) {
    savedTables.push({
      name: tableName,
      addedAt: Date.now()
    });
    
    localStorage.setItem(SAVED_TABLES_KEY, JSON.stringify(savedTables));
    
    // Dispatch a custom event to notify other components about the change
    window.dispatchEvent(new Event('dynamodb-tables-updated'));
  }
}

/**
 * Get all saved tables from localStorage
 */
export function getSavedTables(): SavedTable[] {
  if (typeof window === 'undefined') {
    return []; // Handle SSR case
  }
  
  const savedData = localStorage.getItem(SAVED_TABLES_KEY);
  return savedData ? JSON.parse(savedData) : [];
}

/**
 * Remove a table from the saved tables
 */
export function removeTableFromSidebar(tableName: string): void {
  const savedTables = getSavedTables();
  const updatedTables = savedTables.filter(table => table.name !== tableName);
  localStorage.setItem(SAVED_TABLES_KEY, JSON.stringify(updatedTables));
  
  // Dispatch a custom event to notify other components about the change
  window.dispatchEvent(new Event('dynamodb-tables-updated'));
}

/**
 * Check if a table is already saved
 */
export function isTableSaved(tableName: string): boolean {
  const savedTables = getSavedTables();
  return savedTables.some(table => table.name === tableName);
} 
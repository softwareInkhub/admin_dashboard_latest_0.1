import { promises as fsPromises } from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Use a relative path that's guaranteed to be writable
const CACHE_DIR = path.join(process.cwd(), '.cache');
const CHUNK_SIZE = 512 * 1024; // 512KB chunks

// Global variable to store alternative cache path if needed
let effectiveCacheDir = CACHE_DIR;

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    // Create the directory recursively (creates parent directories if they don't exist)
    await fsPromises.mkdir(effectiveCacheDir, { recursive: true });
    return true;
  } catch (error) {
    console.error(`Error creating cache directory ${effectiveCacheDir}:`, error);
    
    // Try an alternative directory if the primary fails
    try {
      const altDir = path.join(process.cwd(), 'tmp-cache');
      await fsPromises.mkdir(altDir, { recursive: true });
      console.log(`Using alternative cache directory: ${altDir}`);
      effectiveCacheDir = altDir;
      return true;
    } catch (altError) {
      console.error('Failed to create alternative cache directory:', altError);
      return false;
    }
  }
}

// Sanitize cache key to be file-system safe
function sanitizeKey(key: string): string {
  // Replace characters that are problematic in file names
  return key.replace(/[/\\?%*:|"<>]/g, '_');
}

// Compress data before storing
async function compressData(data: any): Promise<Buffer> {
  const jsonString = JSON.stringify(data);
  return gzip(Buffer.from(jsonString));
}

// Decompress data after reading
async function decompressData(buffer: Buffer): Promise<any> {
  const decompressed = await gunzip(buffer);
  return JSON.parse(decompressed.toString());
}

// Initialize cache directory
(async () => {
  try {
    await fsPromises.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create cache directory:', error);
  }
})();

export async function cacheData<T>(key: string, data: T, ttl: number = 3600): Promise<void> {
  try {
    // Ensure directory exists before attempting to write
    const dirReady = await ensureCacheDir();
    if (!dirReady) {
      console.warn(`Skipping cache operation for ${key} - cache directory not available`);
      return;
    }
    
    // Sanitize the key for filesystem safety
    const safeKey = sanitizeKey(key);
    const cacheFile = path.join(effectiveCacheDir, `${safeKey}.cache`);
    
    const compressedData = await compressData({
      data,
      ttl,
      timestamp: Date.now()
    });

    if (compressedData.length > CHUNK_SIZE) {
      // For large data, use chunked storage
      const chunksDir = path.join(effectiveCacheDir, `${safeKey}-chunks`);
      await fsPromises.mkdir(chunksDir, { recursive: true });
      
      const chunks = Math.ceil(compressedData.length / CHUNK_SIZE);
      for (let i = 0; i < chunks; i++) {
        const chunk = compressedData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await fsPromises.writeFile(path.join(chunksDir, `chunk-${i}`), chunk);
      }
      
      // Write metadata file
      await fsPromises.writeFile(path.join(effectiveCacheDir, `${safeKey}.meta`), JSON.stringify({
        chunks,
        chunksDir,
        totalSize: compressedData.length,
        ttl,
        timestamp: Date.now()
      }));
      
      console.log(`Cached chunked data for ${key} in ${chunks} chunks`);
    } else {
      // For small data, use single file
      await fsPromises.writeFile(cacheFile, compressedData);
      console.log(`Cached data for ${key} (${compressedData.length} bytes)`);
    }
  } catch (error) {
    console.error(`Error caching data for key ${key}:`, error);
  }
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    // Sanitize the key for filesystem safety
    const safeKey = sanitizeKey(key);
    const metaFile = path.join(effectiveCacheDir, `${safeKey}.meta`);
    const cacheFile = path.join(effectiveCacheDir, `${safeKey}.cache`);

    // Check for chunked data
    if (await fileExists(metaFile)) {
      try {
        const metaContent = await fsPromises.readFile(metaFile, 'utf8');
        const metadata = JSON.parse(metaContent);
        
        // Check if cache has expired
        const isExpired = (Date.now() - metadata.timestamp) > (metadata.ttl * 1000);
        if (isExpired) {
          console.log(`Cache expired for ${key}, deleting...`);
          await deleteCachedData(key);
          return null;
        }
        
        // Get chunks directory
        const chunksDir = metadata.chunksDir || path.join(effectiveCacheDir, `${safeKey}-chunks`);
        if (!await fileExists(chunksDir)) {
          console.warn(`Chunks directory not found for ${key}`);
          return null;
        }

        // Collect all chunks
        const chunks: Buffer[] = [];
        for (let i = 0; i < metadata.chunks; i++) {
          const chunkFile = path.join(chunksDir, `chunk-${i}`);
          if (!await fileExists(chunkFile)) {
            console.warn(`Missing chunk ${i} for ${key}`);
            return null;
          }
          chunks.push(await fsPromises.readFile(chunkFile));
        }
        
        const completeBuffer = Buffer.concat(chunks);
        const data = await decompressData(completeBuffer);
        return data.data;
      } catch (error) {
        console.error(`Error reading chunked cache for ${key}:`, error);
        return null;
      }
    }
    // Check for single file data
    else if (await fileExists(cacheFile)) {
      try {
        const buffer = await fsPromises.readFile(cacheFile);
        const data = await decompressData(buffer);
        
        // Check if cache has expired
        const isExpired = (Date.now() - data.timestamp) > (data.ttl * 1000);
        if (isExpired) {
          console.log(`Cache expired for ${key}, deleting...`);
          await deleteCachedData(key);
          return null;
        }
        
        return data.data;
      } catch (error) {
        console.error(`Error reading cache file for ${key}:`, error);
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error retrieving cached data for ${key}:`, error);
    return null;
  }
}

// Helper function to safely check if a file or directory exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath, fsPromises.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function deleteCachedData(key: string): Promise<void> {
  try {
    const safeKey = sanitizeKey(key);
    const metaFile = path.join(effectiveCacheDir, `${safeKey}.meta`);
    const cacheFile = path.join(effectiveCacheDir, `${safeKey}.cache`);

    // Handle chunked data
    if (await fileExists(metaFile)) {
      try {
        const metadata = JSON.parse(await fsPromises.readFile(metaFile, 'utf8'));
        const chunksDir = metadata.chunksDir || path.join(effectiveCacheDir, `${safeKey}-chunks`);
        
        if (await fileExists(chunksDir)) {
          // Clean up chunk files
          for (let i = 0; i < metadata.chunks; i++) {
            const chunkFile = path.join(chunksDir, `chunk-${i}`);
            if (await fileExists(chunkFile)) {
              await fsPromises.unlink(chunkFile);
            }
          }
          
          // Try to remove the chunks directory
          try {
            await fsPromises.rmdir(chunksDir);
          } catch (rmError) {
            console.warn(`Could not remove chunks directory for ${key}`);
          }
        }
        
        // Remove metadata file
        await fsPromises.unlink(metaFile);
      } catch (error) {
        console.error(`Error cleaning up chunked data for ${key}:`, error);
      }
    }
    
    // Handle single file
    if (await fileExists(cacheFile)) {
      await fsPromises.unlink(cacheFile);
    }
  } catch (error) {
    console.error(`Error deleting cache for ${key}:`, error);
  }
}

export async function clearCacheByPattern(pattern: string): Promise<void> {
  try {
    const files = await fsPromises.readdir(CACHE_DIR, { encoding: 'utf-8' });
    const matchingFiles = files.filter((file: string) => {
      const decodedKey = decodeURIComponent(file);
      return decodedKey.includes(pattern.replace('*', ''));
    });

    await Promise.all(
      matchingFiles.map((file: string) => 
        fsPromises.unlink(path.join(CACHE_DIR, file))
          .catch((err: Error) => console.error(`Failed to delete ${file}:`, err))
      )
    );
  } catch (error) {
    console.error('Error clearing cache by pattern:', error);
    throw error;
  }
}

// Helper to check if path is a directory
async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await fsPromises.stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function getCachedDataBatch<T>(keys: string[]): Promise<(T | null)[]> {
  return Promise.all(keys.map(key => getCachedData<T>(key)));
} 
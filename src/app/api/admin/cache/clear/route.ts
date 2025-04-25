import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);

const CACHE_DIR = path.join(process.cwd(), '.cache');

export async function POST() {
  try {
    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      return NextResponse.json({ message: 'Cache cleared' });
    }

    // Read all files in the cache directory
    const files = await readdir(CACHE_DIR);

    // Delete all files except cache_stats.json
    await Promise.all(
      files.map(async (file) => {
        if (file !== 'cache_stats.json') {
          const filePath = path.join(CACHE_DIR, file);
          await unlink(filePath);
        }
      })
    );

    // Reset cache stats
    const statsFile = path.join(CACHE_DIR, 'cache_stats.json');
    fs.writeFileSync(
      statsFile,
      JSON.stringify({
        hits: 0,
        misses: 0,
        staleHits: 0
      })
    );

    return NextResponse.json({ message: 'Cache cleared' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.error();
  }
} 
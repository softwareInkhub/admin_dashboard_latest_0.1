import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const CACHE_DIR = path.join(process.cwd(), '.cache');

export async function GET() {
  try {
    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      return NextResponse.json({
        hits: 0,
        misses: 0,
        staleHits: 0,
        size: 0,
        itemCount: 0
      });
    }

    // Read cache stats file if it exists
    const statsFile = path.join(CACHE_DIR, 'cache_stats.json');
    let stats = {
      hits: 0,
      misses: 0,
      staleHits: 0
    };

    if (fs.existsSync(statsFile)) {
      stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    }

    // Calculate total size and count of cache files
    const files = await readdir(CACHE_DIR);
    let totalSize = 0;
    let itemCount = 0;

    for (const file of files) {
      if (file === 'cache_stats.json') continue;
      
      const filePath = path.join(CACHE_DIR, file);
      const fileStat = await stat(filePath);
      totalSize += fileStat.size;
      
      // Count only .cache files as items (not chunks or metadata)
      if (file.endsWith('.cache')) {
        itemCount++;
      }
    }

    return NextResponse.json({
      ...stats,
      size: totalSize,
      itemCount
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return NextResponse.error();
  }
} 
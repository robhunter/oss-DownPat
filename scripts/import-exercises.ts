/**
 * Exercise Import Script
 * Imports exercises from RTF files in the inbound/ directory.
 */

import { readdirSync } from 'fs';
import { join } from 'path';
import { parseExerciseRtf } from './parse-exercise-rtf.js';

const API_BASE = 'http://localhost:3001/api/downpat';
const ADMIN_TOKEN = 'admin-token';
const INBOUND_DIR = 'inbound';

interface ApiResponse {
  exercise?: { exerciseId: string; exerciseName: string; slug: string };
  error?: string;
}

/**
 * Create an exercise via the API.
 */
async function createExercise(exerciseData: ReturnType<typeof parseExerciseRtf>): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify(exerciseData),
  });

  if (!response.ok) {
    const text = await response.text();
    return { error: `HTTP ${response.status}: ${text}` };
  }

  return response.json();
}

/**
 * Get all RTF files from inbound directory.
 */
function getInboundFiles(): string[] {
  try {
    const files = readdirSync(INBOUND_DIR);
    return files
      .filter(f => f.endsWith('.rtf'))
      .map(f => join(INBOUND_DIR, f));
  } catch {
    return [];
  }
}

/**
 * Main import function.
 */
async function main() {
  console.log('=== Exercise Import Script ===\n');

  // Check API health
  try {
    const healthResponse = await fetch(`${API_BASE.replace('/downpat', '')}/health`);
    if (!healthResponse.ok) {
      throw new Error('API not responding');
    }
    console.log('API server: OK\n');
  } catch (error) {
    console.error('ERROR: API server not running at', API_BASE);
    console.error('Start the server with: npm run dev:server');
    process.exit(1);
  }

  // Get RTF files
  const files = getInboundFiles();
  if (files.length === 0) {
    console.log('No RTF files found in', INBOUND_DIR);
    process.exit(0);
  }

  console.log(`Found ${files.length} RTF file(s):\n`);

  // Process each file
  const results: { file: string; success: boolean; exerciseId?: string; slug?: string; error?: string }[] = [];

  for (const file of files) {
    console.log(`Processing: ${file}`);

    try {
      // Parse RTF
      const exerciseData = parseExerciseRtf(file);
      console.log(`  Name: ${exerciseData.exerciseName}`);
      console.log(`  Starters: ${exerciseData.starters.length}`);
      console.log(`  Continuation Tasks: ${exerciseData.continuationTasks.length}`);
      console.log(`  Completion Tasks: ${exerciseData.completionTasks.length}`);

      // Log attribute stats for first starter
      if (exerciseData.starters.length > 0 && Object.keys(exerciseData.starters[0].attributes).length > 0) {
        const attrKeys = Object.keys(exerciseData.starters[0].attributes);
        console.log(`  First starter attributes: ${attrKeys.join(', ')}`);
      }

      // Create via API
      const response = await createExercise(exerciseData);

      if (response.error) {
        console.log(`  ERROR: ${response.error}\n`);
        results.push({ file, success: false, error: response.error });
      } else if (response.exercise) {
        console.log(`  Created: ${response.exercise.exerciseId}`);
        console.log(`  Slug: ${response.exercise.slug}\n`);
        results.push({
          file,
          success: true,
          exerciseId: response.exercise.exerciseId,
          slug: response.exercise.slug,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ERROR: ${errorMessage}\n`);
      results.push({ file, success: false, error: errorMessage });
    }
  }

  // Summary
  console.log('\n=== Import Summary ===');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total: ${results.length}`);
  console.log(`Success: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);

  if (successful.length > 0) {
    console.log('\nCreated exercises:');
    for (const r of successful) {
      console.log(`  - ${r.slug} (${r.exerciseId})`);
    }
  }

  if (failed.length > 0) {
    console.log('\nFailed imports:');
    for (const r of failed) {
      console.log(`  - ${r.file}: ${r.error}`);
    }
    process.exit(1);
  }

  console.log('\nVerify at: http://localhost:5174/admin/exercises');
}

main().catch(console.error);

import { closeTestDbPool } from './database';

// Global test timeout
jest.setTimeout(30000);

// Cleanup after all tests
afterAll(async () => {
  try {
    // Wait a bit for any pending operations
    await new Promise(resolve => setTimeout(resolve, 500));
    await closeTestDbPool();
  } catch (err) {
    console.error('Error during test cleanup:', err);
  }
}, 15000);


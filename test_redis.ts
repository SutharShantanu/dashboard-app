import redis from './lib/redis';

async function test() {
  try {
    console.log('Testing redis...');
    await redis.incr('test_key');
    console.log('Success');
  } catch (e) {
    console.error('Error:', e instanceof Error ? e.message : String(e));
  }
  process.exit();
}
test();

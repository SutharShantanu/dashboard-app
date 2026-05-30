const fs = require('fs');
const { execSync } = require('child_process');

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');
const envs = {};

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    // Handle inner quotes or escaped newlines roughly
    val = val.replace(/\\n/g, '\n');
    envs[key] = val;
  }
}

console.log('Found env keys:', Object.keys(envs));

for (const key of Object.keys(envs)) {
  console.log(`Adding ${key}...`);
  try {
    // Add to production
    execSync(`cmd.exe /c npx vercel env add ${key} production --force`, {
      input: envs[key],
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(`Successfully added ${key}`);
  } catch (err) {
    console.error(`Failed to add ${key}:`, err.message);
    if (err.stdout) console.error('stdout:', err.stdout.toString());
    if (err.stderr) console.error('stderr:', err.stderr.toString());
  }
}

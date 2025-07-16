// Quick integration test
const { spawn } = require('child_process');

console.log('Testing CLI integration...');

const child = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';

child.stdout.on('data', (data) => {
  output += data.toString();
  console.log('STDOUT:', data.toString());
});

child.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

// Send exit command after a short delay
setTimeout(() => {
  child.stdin.write('exit\n');
}, 2000);

child.on('close', (code) => {
  console.log(`\nProcess exited with code ${code}`);
  
  // Check if the output contains expected elements
  const hasStartupMessage = output.includes('Starting Interactive CLI');
  const hasFallbackMessage = output.includes('Falling back to basic CLI') || output.includes('fallback mode');
  const hasChatPrompt = output.includes('Chat with Claude') || output.includes('You:');
  
  console.log('\nIntegration Test Results:');
  console.log('✓ Startup message:', hasStartupMessage);
  console.log('✓ Fallback handling:', hasFallbackMessage);
  console.log('✓ Chat interface:', hasChatPrompt);
  
  if (hasStartupMessage && (hasFallbackMessage || hasChatPrompt)) {
    console.log('\n✅ Integration test PASSED - CLI integration is working correctly');
  } else {
    console.log('\n❌ Integration test FAILED');
  }
});
try {
  const { Canvas } = require('canvas');
  console.log('canvas package is installed');
} catch (e) {
  console.log('canvas package is NOT installed:', e.message);
}

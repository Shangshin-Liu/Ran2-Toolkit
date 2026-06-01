try {
  const canvas = require('canvas');
  console.log('canvas package is installed');
} catch (e) {
  console.log('canvas package is NOT installed:', e.message);
}
try {
  const fs = require('fs');
  console.log('fs is working');
} catch (e) {
  console.log(e);
}

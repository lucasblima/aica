const fs = require('fs');

const sqlPath = process.argv[2];
const sql = fs.readFileSync(sqlPath, 'utf-8');

// Split into chunks of 5000 chars to avoid issues
const chunkSize = 5000;
const chunks = [];
for (let i = 0; i < sql.length; i += chunkSize) {
  chunks.push(sql.substring(i, i + chunkSize));
}

console.log(JSON.stringify({
  totalLength: sql.length,
  totalLines: sql.split('\n').length,
  chunks: chunks.length,
  firstChunk: chunks[0]
}));

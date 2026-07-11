const { exec } = require('child_process');
exec('PORT=3001 NODE_ENV=production node dist/server.cjs', (err, stdout, stderr) => {
   if (err) console.error(err);
});

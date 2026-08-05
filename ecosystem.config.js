module.exports = {
  apps: [
    {
      name: 'qdbh2026',
      script: 'server.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 80
      }
    }
  ]
};

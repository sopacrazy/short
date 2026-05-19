module.exports = {
  apps: [
    {
      name: 'moodclip-server',
      script: 'dist-server/index.js',
      cwd: '/var/www/clipai-backend',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'moodclip-agent',
      script: 'src/index.js',
      cwd: '/var/www/clipai-backend/agent',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

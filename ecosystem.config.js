module.exports = {
  apps: [
    {
      name: 'moodclip-server',
      script: 'dist-server/index.js',
      cwd: '/root/short',           // ajuste se o caminho no servidor for diferente
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
      cwd: '/root/short/agent',     // ajuste se necessário
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

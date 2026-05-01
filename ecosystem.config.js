module.exports = {
  apps: [
    {
      name: 'poolstreamer',
      script: 'src/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '450M', // Keep it tight for VPS
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      time: true,
      exp_backoff_restart_delay: 100,
    },
  ],
};

// pm2 config for the live server. scripts/deploy.sh points /opt/coachskill/current
// at the newest release and reloads this app.
module.exports = {
  apps: [
    {
      name: "coachskill",
      cwd: "/opt/coachskill/current",
      script: "node_modules/next/dist/bin/next",
      // Only reachable through nginx, not directly on the public IP.
      args: "start -H 127.0.0.1 -p 3000",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

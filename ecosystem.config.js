module.exports = {
  apps: [
    {
      name: "thermotrap",
      script: "dist/server.js", // Your compiled JS entry file
      watch: ["src"], // Watch the TypeScript source code
      ignore_watch: ["node_modules", "dist"],
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: "production",
      },
      watch_options: {
        usePolling: true,
      },
      post_update: ["npm install", "npx prisma generate", "npx tsc", "pm2 restart thermotrap --update-env"],
    },
  ],
};

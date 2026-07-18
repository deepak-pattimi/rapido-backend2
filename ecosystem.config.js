module.exports = {
  apps: [
    {
      name: "rapido-backend",
      script: "./src/server.js",
      instances: "max", // Scale across all available CPU cores
      exec_mode: "cluster", // Enable cluster load-balancing
      watch: false,
      max_memory_restart: "1G", // Prevent memory leaks from crashing the system
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};

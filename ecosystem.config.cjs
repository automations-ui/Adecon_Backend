module.exports = {
  apps: [
    {
      name: "Adecon-Backend",
      script: "./index.js",
      instances: "max",
      exec_mode: "cluster",
    },
  ],
};
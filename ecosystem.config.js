module.exports = {
  apps: [
    {
      name: "Printsmart",
      cwd: "E:/Skripsi/PrintSmart",
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 0.0.0.0",
      interpreter: "node",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
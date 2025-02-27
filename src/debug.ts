import express from "express";
import { ViteDevServer } from "vite";
import chalk from "chalk";

/**
 * 创建一个简单的调试 API 服务器
 * 这个函数会创建一个独立的 Express 应用，并挂载到 Vite 服务器上
 * 用于测试 API 功能是否正常工作
 */
export function createDebugServer(prefix: string = "/debug-api") {
  const app = express();

  // 添加一些基本的中间件
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 添加一些测试路由
  app.get(`${prefix}/test`, (req, res) => {
    res.json({
      status: "ok",
      message: "调试 API 服务器正常工作",
      timestamp: new Date().toISOString(),
    });
  });

  app.get(`${prefix}/echo`, (req, res) => {
    res.json({
      query: req.query,
      headers: req.headers,
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
    });
  });

  // 返回一个 Vite 插件
  return {
    name: "vite-plugin-debug-api",
    configureServer(server: ViteDevServer) {
      // 直接使用 use 方法挂载 Express 应用
      server.middlewares.use(app);

      console.log(
        `\n🔍 ${chalk.green("调试 API 服务已启动")} - ${chalk.cyan(
          `访问 ${prefix}/test 测试服务是否正常`
        )}\n`
      );
    },
  };
}

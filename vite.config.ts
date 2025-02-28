import { defineConfig } from "vite";
import { builtinModules } from "module";
import dts from "vite-plugin-dts";
import { createAdvanceApi } from "./src/index";
import { createDebugServer } from "./src/debug";
import path from "path";

// 获取所有 Node.js 内置模块
const nodeBuiltins = builtinModules.concat(
  builtinModules.map((m) => `node:${m}`)
);

export default defineConfig({
  plugins: [
    dts(),
    createDebugServer(),
    createAdvanceApi({
      prefix: "/api",
      logger: true,
      routerScan: {
        // 明确指定扫描路径
        paths: [
          path.resolve(__dirname, "server"), // 确保这是正确的路径
        ],
        // 明确指定文件模式
        pattern: "**/*.router.ts",
      },
    }),
  ],
  build: {
    ssr: true,
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: [
        // 所有 Node.js 内置模块
        ...nodeBuiltins,
        // 第三方依赖
        "reflect-metadata",
        "typeorm",
        "mysql2",
        "mongoose",
        "express",
        "cors",
        "axios",
        "lodash",
        "uuid",
        "socket.io",
        "chalk",
        "glob",
        "express-async-errors",
      ],
    },
    target: "node14",
    minify: false,
  },
  define: {
    "process.env.NODE_DEBUG": "false",
  },
});

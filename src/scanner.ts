import fs from "fs";
import path from "path";
import glob from "glob";
import { pathToFileURL } from "node:url";
import type { RouteDefinition } from "./types";
import chalk from "chalk";
import { build } from "esbuild";
import crypto from "crypto";

export interface ScanCallback {
  onStart?: (paths: string[]) => void;
  onFile?: (file: string) => void;
  onRoute?: (route: any) => void;
  onComplete?: (routes: any[]) => void;
  onError?: (error: Error, file?: string) => void;
}

async function loadTsFile(filePath: string): Promise<any> {
  try {
    // 使用 esbuild 编译 TypeScript 文件
    const result = await build({
      entryPoints: [filePath],
      bundle: true,
      write: false,
      format: "esm",
      target: "node14",
      platform: "node",
      outfile: "out.js",
      external: [
        // 排除 Node.js 内置模块
        "node:*",
        "crypto",
        "fs",
        "path",
        // 排除可能导致问题的依赖
        "@mapbox/node-pre-gyp",
        "mock-aws-s3",
        "aws-sdk",
        "nock",
        // 其他可能需要排除的模块
        "typeorm",
        "bcrypt",
        "jsonwebtoken",
      ],
      loader: {
        ".html": "text", // 处理 HTML 文件
      },
    });

    // 获取编译后的代码
    const { outputFiles } = result;
    if (!outputFiles || outputFiles.length === 0) {
      throw new Error("编译失败：没有输出文件");
    }

    // 创建临时文件
    const tempDir = path.join(
      process.cwd(),
      "node_modules",
      ".vite-advance-api-temp"
    );
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFile = path.join(
      tempDir,
      `${crypto.randomBytes(16).toString("hex")}.mjs`
    );
    fs.writeFileSync(tempFile, outputFiles[0].text);

    try {
      // 使用 import() 动态导入
      const module = await import(pathToFileURL(tempFile).href);
      return module;
    } finally {
      // 清理临时文件
      fs.unlinkSync(tempFile);
    }
  } catch (error) {
    throw new Error(
      `编译 TypeScript 文件失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 扫描并导入指定路径下的路由文件
 * @param scanConfig 扫描配置，包含扫描路径和文件匹配模式
 * @param callbacks 扫描过程中的回调函数
 * @param root 根目录，默认为当前工作目录
 * @returns 扫描到的所有路由定义
 */
export async function scanRouterFiles(
  scanConfig: {
    paths: string[];
    pattern?: string | string[];
  },
  callbacks?: ScanCallback,
  root: string = process.cwd()
): Promise<RouteDefinition[]> {
  // 处理模式数组
  const patterns = Array.isArray(scanConfig.pattern)
    ? scanConfig.pattern
    : [scanConfig.pattern || "**/*.router.ts"];

  const routes: RouteDefinition[] = [];
  const absolutePaths = scanConfig.paths.map((p) =>
    path.isAbsolute(p) ? p : path.resolve(root, p)
  );

  callbacks?.onStart?.(absolutePaths);
  console.log(`\n🔍 ${chalk.blue("开始扫描路由文件...")}`);
  console.log(`  📂 扫描路径:`, absolutePaths);
  console.log(`  🔎 匹配模式:`, patterns);

  for (const basePath of absolutePaths) {
    if (!fs.existsSync(basePath)) {
      console.warn(`⚠️ ${chalk.yellow(`路径不存在: ${basePath}`)}`);
      continue;
    }

    for (const pattern of patterns) {
      try {
        const files = glob.sync(pattern, {
          cwd: basePath,
          absolute: true,
          nodir: true,
        });

        console.log(`  📄 找到文件:`, files);

        for (const file of files) {
          const relativePath = path.relative(root, file);
          callbacks?.onFile?.(relativePath);

          try {
            // 使用 esbuild 加载 TypeScript 文件
            const module = await loadTsFile(file);

            if (!module || !module.default) {
              console.warn(
                `    ${chalk.yellow(`⚠️ 文件 ${relativePath} 没有默认导出`)}`
              );
              continue;
            }

            if (!Array.isArray(module.default)) {
              console.warn(
                `    ${chalk.yellow(`⚠️ 文件 ${relativePath} 的默认导出不是数组`)}`
              );
              continue;
            }

            const validRoutes = module.default.filter((route: any) => {
              const isValid =
                route &&
                typeof route.path === "string" &&
                typeof route.method === "string" &&
                typeof route.handler === "function";

              if (!isValid) {
                console.warn(
                  `    ${chalk.yellow(
                    `⚠️ 文件 ${relativePath} 中存在无效的路由定义`
                  )}`
                );
              }

              return isValid;
            });

            routes.push(...validRoutes);
            console.log(
              `    ✅ 已加载 ${chalk.green(
                validRoutes.length.toString()
              )} 个路由`
            );
          } catch (error: unknown) {
            console.error(
              `    ${chalk.red(`❌ 加载路由文件失败: ${relativePath}`)}`
            );

            if (error instanceof Error) {
              console.error(`      ${chalk.red(error.stack || error.message)}`);
              callbacks?.onError?.(error, relativePath);
            } else {
              const errorMessage = String(error);
              console.error(`      ${chalk.red(errorMessage)}`);
              callbacks?.onError?.(new Error(errorMessage), relativePath);
            }
          }
        }
      } catch (globError) {
        console.error(
          `    ${chalk.red(
            `❌ 文件匹配失败: ${
              (globError as Error).message || String(globError)
            }`
          )}`
        );
      }
    }
  }

  callbacks?.onComplete?.(routes);
  console.log(
    `\n📊 ${chalk.green(`扫描完成，共发现 ${routes.length} 个路由`)}\n`
  );

  return routes;
}

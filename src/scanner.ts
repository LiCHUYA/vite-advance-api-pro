import fs from "fs";
import path from "path";
import glob from "glob";
import { pathToFileURL } from "node:url";
import type { RouteDefinition } from "./types";
import chalk from "chalk";

export interface ScanCallback {
  onStart?: (paths: string[]) => void;
  onFile?: (file: string) => void;
  onRoute?: (route: any) => void;
  onComplete?: (routes: any[]) => void;
  onError?: (error: Error, file?: string) => void;
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
    pattern?: string | string[]; // 支持字符串或字符串数组
  },
  callbacks?: ScanCallback,
  root: string = process.cwd()
): Promise<RouteDefinition[]> {
  // 处理模式数组
  const patterns = Array.isArray(scanConfig.pattern)
    ? scanConfig.pattern
    : [scanConfig.pattern || "**/*.router.{js,ts}"];

  // 存储扫描到的所有路由
  const routes: RouteDefinition[] = [];

  // 将相对路径转换为绝对路径
  const absolutePaths = scanConfig.paths.map((p) =>
    path.isAbsolute(p) ? p : path.resolve(root, p)
  );

  // 触发扫描开始回调
  callbacks?.onStart?.(absolutePaths);

  console.log(`\n🔍 ${chalk.blue("开始扫描路由文件...")}`);

  // 遍历所有扫描路径
  for (const basePath of absolutePaths) {
    // 检查路径是否存在
    if (!fs.existsSync(basePath)) {
      console.warn(`⚠️ ${chalk.yellow(`路径不存在: ${basePath}`)}`);
      continue;
    }

    console.log(
      `  📂 扫描目录: ${chalk.cyan(path.relative(root, basePath) || ".")}`
    );

    // 遍历所有模式
    for (const pattern of patterns) {
      console.log(`    🔎 使用匹配模式: ${chalk.cyan(pattern)}`);

      try {
        // 使用 glob 查找匹配的文件
        const files = glob.sync(pattern, {
          cwd: basePath,
          absolute: true,
          nodir: true,
        });

        if (files.length === 0) {
          console.log(`    ${chalk.yellow("⚠️ 未找到匹配的文件")}`);
        }

        // 遍历找到的所有文件
        for (const file of files) {
          const relativePath = path.relative(root, file);

          // 触发文件发现回调
          callbacks?.onFile?.(relativePath);
          console.log(`    📄 找到路由文件: ${chalk.green(relativePath)}`);

          try {
            // 转换为 file:// URL，以支持 Windows 路径
            const fileUrl = pathToFileURL(file).href;

            // 动态导入路由文件
            const module = await import(fileUrl);

            // 检查模块是否导出了默认路由数组
            if (module.default) {
              if (Array.isArray(module.default)) {
                // 验证每个路由定义
                const validRoutes = module.default.filter((route: any) => {
                  const isValid =
                    route &&
                    typeof route.path === "string" &&
                    typeof route.method === "string" &&
                    typeof route.handler === "function";

                  if (!isValid) {
                    console.warn(
                      `    ${chalk.yellow(`⚠️ 文件 ${relativePath} 中存在无效的路由定义`)}`
                    );
                  }

                  return isValid;
                });

                // 添加到路由集合
                routes.push(...validRoutes);
                console.log(
                  `    ✅ 已加载 ${chalk.green(validRoutes.length.toString())} 个路由`
                );
              } else {
                console.warn(
                  `    ${chalk.yellow(`⚠️ 文件 ${relativePath} 的默认导出不是数组`)}`
                );
              }
            } else {
              console.warn(
                `    ${chalk.yellow(`⚠️ 文件 ${relativePath} 没有默认导出`)}`
              );
            }
          } catch (error) {
            // 处理导入错误
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.error(
              `    ${chalk.red(`❌ 加载路由文件失败: ${relativePath}`)}`
            );
            console.error(`      ${chalk.red(errorMessage)}`);

            // 触发错误回调
            callbacks?.onError?.(
              error instanceof Error ? error : new Error(errorMessage),
              relativePath
            );
          }
        }
      } catch (globError) {
        // 处理 glob 错误
        console.error(
          `    ${chalk.red(`❌ 文件匹配失败: ${(globError as Error).message || String(globError)}`)}`
        );
      }
    }
  }

  // 触发扫描完成回调
  callbacks?.onComplete?.(routes);

  console.log(
    `\n📊 ${chalk.green(`扫描完成，共发现 ${routes.length} 个路由`)}\n`
  );

  return routes;
}

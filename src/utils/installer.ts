import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function installDependency(packageName: string): Promise<boolean> {
  try {
    console.log(`正在安装依赖: ${packageName}...`);

    // 检测包管理器
    const packageManager = await detectPackageManager();

    // 执行安装命令
    const command =
      packageManager === "yarn"
        ? `yarn add ${packageName}`
        : packageManager === "pnpm"
          ? `pnpm add ${packageName}`
          : `npm install ${packageName}`;

    await execAsync(command);

    console.log(`依赖 ${packageName} 安装成功!`);
    return true;
  } catch (error) {
    console.error(`依赖 ${packageName} 安装失败:`, error);
    return false;
  }
}

async function detectPackageManager(): Promise<"npm" | "yarn" | "pnpm"> {
  try {
    // 检查是否存在 yarn.lock
    await execAsync("test -f yarn.lock");
    return "yarn";
  } catch {
    try {
      // 检查是否存在 pnpm-lock.yaml
      await execAsync("test -f pnpm-lock.yaml");
      return "pnpm";
    } catch {
      // 默认使用 npm
      return "npm";
    }
  }
}

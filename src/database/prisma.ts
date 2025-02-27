import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function initPrisma(options: any, driver?: any) {
  try {
    // 检查是否有 schema.prisma 文件
    const schemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");
    const hasSchema = fs.existsSync(schemaPath);

    if (!hasSchema) {
      console.log("未找到 Prisma schema 文件，尝试初始化...");

      // 创建 prisma 目录
      fs.mkdirSync(path.resolve(process.cwd(), "prisma"), { recursive: true });

      // 创建基本的 schema.prisma 文件
      const schemaContent = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${options.provider || "mysql"}"
  url      = env("DATABASE_URL")
}
      `;

      fs.writeFileSync(schemaPath, schemaContent.trim());

      // 创建 .env 文件
      const envPath = path.resolve(process.cwd(), ".env");
      if (!fs.existsSync(envPath)) {
        let dbUrl = "";
        if (options.provider === "mongodb") {
          dbUrl = `mongodb://${options.host || "localhost"}:${options.port || 27017}/${options.database || "test"}`;
        } else {
          dbUrl = `${options.provider || "mysql"}://${options.user || "root"}:${options.password || ""}@${options.host || "localhost"}:${options.port || 3306}/${options.database || "test"}`;
        }

        fs.writeFileSync(envPath, `DATABASE_URL="${dbUrl}"`);
      }

      // 生成 Prisma 客户端
      console.log("正在生成 Prisma 客户端...");
      await execAsync("npx prisma generate");
    }

    // 使用传入的驱动或尝试导入
    const prismaModule =
      driver ||
      (await import("@prisma/client").catch(() => {
        throw new Error("请先安装 Prisma: npm install prisma @prisma/client");
      }));

    const PrismaClient = prismaModule.PrismaClient;
    const prisma = new PrismaClient(options);
    await prisma.$connect();
    return prisma;
  } catch (error) {
    console.error("Prisma 初始化失败:", error);
    throw error;
  }
}

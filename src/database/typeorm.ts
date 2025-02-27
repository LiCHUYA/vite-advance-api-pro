import { DataSource } from "typeorm";
import glob from "glob";
import path from "path";

export async function initTypeorm(options: any, driver?: any) {
  try {
    // 使用传入的驱动或尝试导入
    const typeorm =
      driver ||
      (await import("typeorm").catch(() => {
        throw new Error(
          "请先安装 typeorm: npm install typeorm reflect-metadata"
        );
      }));

    // 自动扫描实体文件
    if (options.entities && typeof options.entities === "string") {
      const entitiesPath = options.entities;
      const files = glob.sync(entitiesPath);

      // 动态导入实体类
      const entities = await Promise.all(
        files.map(async (file) => {
          const entityModule = await import(path.resolve(file));
          return Object.values(entityModule).filter(
            (v) => typeof v === "function"
          );
        })
      );

      // 扁平化实体数组
      options.entities = entities.flat();
    }

    const dataSource = new typeorm.DataSource({
      type: options.type || "mysql",
      host: options.host || "localhost",
      ...options,
    });

    await dataSource.initialize();
    return dataSource;
  } catch (error) {
    console.error("TypeORM 初始化失败:", error);
    throw error;
  }
}

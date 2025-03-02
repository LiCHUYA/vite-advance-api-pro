import { DataSource, EntityTarget, Repository, ObjectLiteral } from "typeorm";
import glob from "glob";
import path from "path";

// 声明全局 AppDataSource
let AppDataSource: DataSource;

export async function initTypeorm(options: any, driver?: any) {
  try {
    const typeorm = driver || (await import("typeorm"));

    // 自动扫描实体文件
    if (options.entities && typeof options.entities === "string") {
      const entitiesPath = options.entities;
      const files = glob.sync(entitiesPath);

      const entities = await Promise.all(
        files.map(async (file) => {
          const entityModule = await import(path.resolve(file));
          return Object.values(entityModule).filter(
            (v) => typeof v === "function"
          );
        })
      );

      options.entities = entities.flat();
    }

    // 创建并保存 DataSource 实例
    AppDataSource = new typeorm.DataSource({
      type: options.type || "mysql",
      host: options.host || "localhost",
      ...options,
    });

    await AppDataSource.initialize();

    // 返回 typeorm 相关功能
    return {
      DataSource: typeorm.DataSource,
      getRepository: <T extends ObjectLiteral>(target: EntityTarget<T>) =>
        AppDataSource.getRepository<T>(target),
      AppDataSource,
    };
  } catch (error) {
    console.error("TypeORM 初始化失败:", error);
    throw error;
  }
}

// 导出 AppDataSource
export { AppDataSource };

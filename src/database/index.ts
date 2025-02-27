export { initMysql } from "./mysql";
export { initMongodb } from "./mongodb";
export { initTypeorm } from "./typeorm";

// 数据库配置类型
export interface DatabaseConfig {
  type: "mysql" | "mongodb" | "typeorm";
  options: any;
  onResult?: (error: Error | null, connection?: any) => void;
  required?: boolean;
}

// 数据库连接选项类型
export interface DatabaseOptions {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  uri?: string;
  [key: string]: any;
}

// 动态导入数据库驱动
export async function loadDatabaseDriver(type: string): Promise<any> {
  try {
    switch (type) {
      case "mysql":
        return await import("mysql2/promise").catch(() => null);
      case "mongodb":
        return await import("mongoose").catch(() => null);
      case "typeorm":
        try {
          // 加载 typeorm 和 reflect-metadata
          await import("reflect-metadata").catch(() => null);
          return await import("typeorm").catch(() => null);
        } catch (e) {
          return null;
        }
      default:
        return null;
    }
  } catch (e) {
    console.error(`加载数据库驱动 ${type} 失败:`, e);
    return null;
  }
}

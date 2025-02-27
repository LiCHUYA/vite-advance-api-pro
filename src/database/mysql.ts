import mysql from "mysql2/promise";

export async function initMysql(options: any, driver?: any) {
  try {
    // 使用传入的驱动或尝试导入
    const mysql =
      driver ||
      (await import("mysql2/promise").catch(() => {
        throw new Error("请先安装 mysql2: npm install mysql2");
      }));

    const connection = await mysql.createConnection({
      host: options.host || "localhost",
      user: options.user,
      password: options.password,
      database: options.database,
      ...options,
    });

    return connection;
  } catch (error) {
    console.error("MySQL 初始化失败:", error);
    throw error;
  }
}

import express, { Request, Response, NextFunction, Router } from "express";
import cors from "cors";
import axios from "axios";
import lodash from "lodash";
import { v4 as uuidv4 } from "uuid";
import "express-async-errors";
import type { ViteDevServer } from "vite";
import type {
  CreateAdvanceApiOptions,
  Utils,
  ModuleConfig,
  RouterDefiner,
  RouteDefinition,
  RouteHandler,
  ApiRequest,
  ExtendedResponse,
  NetworkInterfaceInfo,
  DatabaseConfig,
  ObjectModeModule,
  DirectModeModule,
  ScanCallback,
} from "./types";
import { CommonResponse, Code, CodeMessage } from "./response";
import chalk from "chalk";
import http from "http";
import { Server } from "socket.io";
import { scanRouterFiles } from "./scanner";
import {
  initMysql,
  initMongodb,
  initTypeorm,
  loadDatabaseDriver,
} from "./database";
import * as typeorm from "typeorm";
import mongoose from "mongoose";
import * as mysql from "mysql2/promise";
import crypto from "crypto";

// 在文件顶部添加类型声明
declare global {
  namespace Express {
    interface Response {
      success(data: any): Response;
      error(message: string, code?: number): Response;
    }
  }
}

// 内置的测试路由工厂函数
function createBuiltInRoutes(
  routeCollector: RouteCollector,
  serverInfo: any,
  utils: Utils
): RouteDefinition[] {
  return [
    {
      path: "/advance-api-test",
      method: "get",
      description: "测试 API 是否正常工作",
      handler: async (req, res) => {
        res.success({
          status: "ok",
          time: new Date().toISOString(),
          version: "1.0.0",
          message: "Vite Advance API is working!",
          serverInfo,
        });
      },
    },
    // API文档路由
    {
      path: "/docs",
      method: "get",
      description: "查看 API 文档",
      handler: async (req, res) => {
        const routes = routeCollector.getRoutes().map((route) => ({
          method: route.method,
          path: route.path,
          description: route.description || "暂无描述",
          module: route.moduleName || "未分类",
        }));

        // 生成 HTML 文档
        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API 文档</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            display: flex;
        }
        .sidebar {
            width: 250px;
            padding-right: 20px;
            border-right: 1px solid #eee;
            height: calc(100vh - 40px);
            overflow-y: auto;
            position: sticky;
            top: 20px;
        }
        .main {
            flex: 1;
            padding-left: 20px;
        }
        .header {
            margin-bottom: 30px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        .api-list {
            margin-top: 20px;
        }
        .api-item {
            margin-bottom: 30px;
            padding: 15px;
            border-radius: 5px;
            background-color: #f8f9fa;
            border-left: 4px solid #007bff;
        }
        .api-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .method-tag {
            padding: 3px 8px;
            border-radius: 3px;
            color: white;
            font-weight: bold;
            margin-right: 10px;
            font-size: 0.8em;
        }
        .get {
            background-color: #28a745;
        }
        .post {
            background-color: #007bff;
        }
        .put {
            background-color: #ffc107;
            color: #333;
        }
        .delete {
            background-color: #dc3545;
        }
        .path {
            font-family: monospace;
            font-size: 1.1em;
            font-weight: bold;
        }
        .description {
            margin: 10px 0;
            color: #666;
        }
        .meta {
            margin-top: 10px;
            font-size: 0.9em;
        }
        .meta-item {
            margin-bottom: 5px;
        }
        .meta-label {
            font-weight: bold;
            color: #666;
        }
        .nav-item {
            padding: 8px 10px;
            border-radius: 3px;
            margin-bottom: 5px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .nav-item:hover {
            background-color: #f0f0f0;
        }
        .nav-method {
            display: inline-block;
            width: 50px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .nav-path {
            font-family: monospace;
            font-size: 0.9em;
        }
        .search-box {
            margin-bottom: 20px;
            width: 100%;
        }
        #searchInput {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .example-code {
            margin-top: 15px;
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9em;
            overflow-x: auto;
        }
        .tabs {
            display: flex;
            margin-bottom: 10px;
        }
        .tab {
            padding: 5px 10px;
            cursor: pointer;
            border: 1px solid #ddd;
            border-bottom: none;
            border-radius: 4px 4px 0 0;
            background-color: #f5f5f5;
            margin-right: 5px;
        }
        .tab.active {
            background-color: #fff;
            border-bottom: 1px solid #fff;
            margin-bottom: -1px;
            z-index: 1;
        }
        .tab-content {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 0 4px 4px 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <div class="search-box">
                <input type="text" id="searchInput" placeholder="搜索 API...">
            </div>
            <div class="nav-list">
                ${routes
                  .map(
                    (route, index) => `
                    <div class="nav-item" data-index="${index}">
                        <span class="nav-method ${route.method.toLowerCase()}">${route.method}</span>
                        <span class="nav-path">${route.path}</span>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>
        <main class="main">
            <div class="header">
                <h1>API 文档</h1>
                <p>本文档列出了所有可用的 API 端点及其详细信息。</p>
            </div>
            <div class="api-list">
                ${routes
                  .map(
                    (route) => `
                    <div class="api-item">
                        <div class="api-header">
                            <span class="method-tag ${route.method.toLowerCase()}">${route.method}</span>
                            <span class="path">${route.path}</span>
                        </div>
                        <p class="description">${route.description || "暂无描述"}</p>
                        <div class="meta">
                            <div class="meta-item">
                                <span class="meta-label">所属模块：</span>
                                <span class="meta-value">${route.module}</span>
                            </div>
                        </div>
                        <div class="example-code">
                            <div class="tabs">
                                <div class="tab active" onclick="showTab(this, 'fetch-${route.path}')">Fetch</div>
                                <div class="tab" onclick="showTab(this, 'axios-${route.path}')">Axios</div>
                            </div>
                            <div id="fetch-${route.path}" class="tab-content">
<pre>// 使用 Fetch API 调用
fetch('${route.path}', {
  method: '${route.method}',
  headers: {
    'Content-Type': 'application/json'
  }${
    route.method !== "GET"
      ? `,
  body: JSON.stringify({
    // 请求参数
  })`
      : ""
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));</pre>
                            </div>
                            <div id="axios-${route.path}" class="tab-content" style="display: none;">
<pre>// 使用 Axios 调用
axios.${route.method.toLowerCase()}('${route.path}'${
                      route.method !== "GET"
                        ? `, {
  // 请求参数
}`
                        : ""
                    })
.then(response => {
  console.log(response.data);
})
.catch(error => {
  console.error('Error:', error);
});</pre>
                            </div>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </main>
    </div>

    <script>
        // 搜索功能
        const searchInput = document.getElementById('searchInput');
        const apiItems = document.querySelectorAll('.api-item');
        const navItems = document.querySelectorAll('.nav-item');

        searchInput.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            
            apiItems.forEach((item, index) => {
                const path = item.querySelector('.path').textContent.toLowerCase();
                const method = item.querySelector('.method-tag').textContent.toLowerCase();
                const description = item.querySelector('.description').textContent.toLowerCase();
                const visible = path.includes(value) || method.includes(value) || description.includes(value);
                
                item.style.display = visible ? 'block' : 'none';
                navItems[index].style.display = visible ? 'block' : 'none';
            });
        });

        // 导航点击
        navItems.forEach((item) => {
            item.addEventListener('click', () => {
                const index = item.getAttribute('data-index');
                const targetItem = apiItems[index];
                targetItem.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // 标签切换
        function showTab(tabElement, contentId) {
            // 获取所有同级标签和内容
            const tabContainer = tabElement.parentElement;
            const tabs = tabContainer.querySelectorAll('.tab');
            const contents = tabContainer.parentElement.querySelectorAll('.tab-content');
            
            // 移除所有活动状态
            tabs.forEach(tab => tab.classList.remove('active'));
            contents.forEach(content => content.style.display = 'none');
            
            // 设置当前标签和内容为活动状态
            tabElement.classList.add('active');
            document.getElementById(contentId).style.display = 'block';
        }
    </script>
</body>
</html>`;

        res.send(html);
      },
    },
  ];
}

// 路径拼接工具改进
function joinPaths(...paths: string[]): string {
  return (
    "/" +
    paths
      .map((path) => path.replace(/^\/+|\/+$/g, "")) // 去除首尾斜杠
      .filter(Boolean) // 过滤空字符串
      .join("/")
  );
}

// 路由收集器
class RouteCollector {
  private routes: Array<{
    method: string;
    path: string;
    moduleName?: string;
    description?: string;
  }> = [];

  add(method: string, path: string, moduleName?: string, description?: string) {
    this.routes.push({ method, path, moduleName, description });
  }

  getRoutes() {
    return this.routes;
  }

  printRoutes() {
    if (this.routes.length === 0) {
      console.log("  没有注册的路由");
      return;
    }

    // 按模块分组
    const moduleGroups: Record<string, typeof this.routes> = {};
    this.routes.forEach((route) => {
      const moduleName = route.moduleName || "未分类";
      if (!moduleGroups[moduleName]) {
        moduleGroups[moduleName] = [];
      }
      moduleGroups[moduleName].push(route);
    });

    // 打印分组后的路由
    Object.entries(moduleGroups).forEach(([moduleName, routes]) => {
      console.log(`  📁 ${chalk.yellow(moduleName)}`);
      routes.forEach((route) => {
        const methodColor =
          route.method === "GET"
            ? chalk.green
            : route.method === "POST"
              ? chalk.blue
              : route.method === "PUT"
                ? chalk.yellow
                : chalk.red;
        console.log(
          `    ${methodColor(route.method.padEnd(6))} ${route.path}${
            route.description ? ` - ${route.description}` : ""
          }`
        );
      });
    });
  }
}

// 统一的路由处理函数
function createRouteHandler(
  router: express.Router,
  method: string,
  basePath: string = "",
  path: string,
  handler: RouteHandler,
  prefix: string,
  routeCollector: RouteCollector,
  moduleName: string,
  description?: string,
  utils?: Utils
) {
  const fullPath = joinPaths(basePath, path);

  // 确保方法名小写并且是有效的 HTTP 方法
  const httpMethod = method.toLowerCase();
  if (
    !["get", "post", "put", "delete", "patch", "options", "head"].includes(
      httpMethod
    )
  ) {
    console.error(`无效的 HTTP 方法: ${method}`);
    return;
  }

  // 使用类型断言确保 router[httpMethod] 是一个函数
  const routerMethod = router[httpMethod as keyof typeof router];
  if (typeof routerMethod !== "function") {
    console.error(`路由器没有方法: ${httpMethod}`);
    return;
  }

  // 注册路由处理函数
  (routerMethod as Function).call(
    router,
    fullPath,
    async (req: Request, res: Response) => {
      try {
        // 使用类型断言来扩展 res 对象
        const extendedRes = res as ExtendedResponse;

        // 添加 success 方法
        extendedRes.success = function (data: any) {
          return this.json({
            code: 200,
            data,
            message: "success",
            success: true,
          });
        };

        // 添加 error 方法
        extendedRes.error = function (message: string, code: number = 500) {
          return this.status(code).json({
            code,
            message,
            data: null,
            success: false,
          });
        };

        // 调用处理函数，传递 utils
        await handler(req as ApiRequest, extendedRes, utils);
      } catch (error) {
        console.error(
          `路由处理错误 [${method.toUpperCase()} ${fullPath}]:`,
          error
        );
        res.status(500).json({
          code: 500,
          message:
            error instanceof Error ? error.message : "Internal Server Error",
          data: null,
          success: false,
        });
      }
    }
  );

  // 添加到路由收集器
  routeCollector.add(
    method.toUpperCase(),
    `${prefix}${fullPath}`,
    moduleName,
    description
  );
}

function createRouterDefiner(
  router: express.Router,
  basePath: string,
  prefix: string,
  routeCollector: RouteCollector,
  utils?: Utils
): RouterDefiner {
  return {
    get: (path, handler, description) =>
      createRouteHandler(
        router,
        "get",
        basePath,
        path,
        handler,
        prefix,
        routeCollector,
        "direct模式",
        description,
        utils
      ),
    post: (path, handler, description) =>
      createRouteHandler(
        router,
        "post",
        basePath,
        path,
        handler,
        prefix,
        routeCollector,
        "direct模式",
        description,
        utils
      ),
    put: (path, handler, description) =>
      createRouteHandler(
        router,
        "put",
        basePath,
        path,
        handler,
        prefix,
        routeCollector,
        "direct模式",
        description,
        utils
      ),
    delete: (path, handler, description) =>
      createRouteHandler(
        router,
        "delete",
        basePath,
        path,
        handler,
        prefix,
        routeCollector,
        "direct模式",
        description,
        utils
      ),
  };
}

// 获取服务器信息
async function getServerInfo() {
  const os = await import("os");
  const interfaces = os.networkInterfaces();
  const addresses: NetworkInterfaceInfo[] = [];

  // 收集所有网络接口信息
  Object.values(interfaces).forEach((iface) => {
    if (iface) {
      iface.forEach((info) => {
        if (info.family === "IPv4" && !info.internal) {
          addresses.push({
            family: info.family,
            address: info.address,
            internal: info.internal,
          });
        }
      });
    }
  });

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + "GB",
    nodeVersion: process.version,
    addresses,
  };
}

// 设置数据库连接
async function setupDatabase(config: DatabaseConfig, utilsObj: Utils) {
  try {
    console.log(`  🔌 正在连接 ${chalk.blue(config.type)} 数据库...`);

    // 加载数据库驱动
    const driver = await loadDatabaseDriver(config.type);
    let db: any;

    switch (config.type) {
      case "mysql":
        utilsObj.mysql = driver;
        db = await initMysql(config.options, driver);

        // 添加 MySQL 常用操作
        utilsObj.dbUtils = {
          query: async (sql: string, params?: any[]) => {
            return await db.query(sql, params);
          },
          findById: async (table: string, id: number | string) => {
            const [rows] = await db.query(
              `SELECT * FROM ${table} WHERE id = ?`,
              [id]
            );
            return rows[0];
          },
          findAll: async (table: string, where?: Record<string, any>) => {
            if (!where) {
              const [rows] = await db.query(`SELECT * FROM ${table}`);
              return rows;
            }

            const conditions = Object.entries(where)
              .map(([key, _]) => `${key} = ?`)
              .join(" AND ");
            const values = Object.values(where);
            const [rows] = await db.query(
              `SELECT * FROM ${table} WHERE ${conditions}`,
              values
            );
            return rows;
          },
          insert: async (table: string, data: Record<string, any>) => {
            const keys = Object.keys(data).join(", ");
            const placeholders = Object.keys(data)
              .map(() => "?")
              .join(", ");
            const values = Object.values(data);

            const [result] = await db.query(
              `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`,
              values
            );
            return result;
          },
          update: async (
            table: string,
            id: number | string,
            data: Record<string, any>
          ) => {
            const setClause = Object.keys(data)
              .map((key) => `${key} = ?`)
              .join(", ");
            const values = [...Object.values(data), id];

            const [result] = await db.query(
              `UPDATE ${table} SET ${setClause} WHERE id = ?`,
              values
            );
            return result;
          },
          delete: async (table: string, id: number | string) => {
            const [result] = await db.query(
              `DELETE FROM ${table} WHERE id = ?`,
              [id]
            );
            return result;
          },
        };
        break;

      case "mongodb":
        utilsObj.mongoose = driver;
        db = await initMongodb(config.options);

        // 添加 MongoDB 常用操作
        utilsObj.dbUtils = {
          model: (name: string, schema?: any) => {
            try {
              return db.model(name);
            } catch (e) {
              return db.model(name, schema);
            }
          },
          findById: async (model: string | any, id: string | number) => {
            const Model = typeof model === "string" ? db.model(model) : model;
            return await Model.findById(id);
          },
          findAll: async (model: string | any, where = {}) => {
            const Model = typeof model === "string" ? db.model(model) : model;
            return await Model.find(where);
          },
          create: async (model: string | any, data: Record<string, any>) => {
            const Model = typeof model === "string" ? db.model(model) : model;
            return await Model.create(data);
          },
          update: async (
            model: string | any,
            id: string | number,
            data: Record<string, any>
          ) => {
            const Model = typeof model === "string" ? db.model(model) : model;
            return await Model.findByIdAndUpdate(id, data, { new: true });
          },
          delete: async (model: string | any, id: string | number) => {
            const Model = typeof model === "string" ? db.model(model) : model;
            return await Model.findByIdAndDelete(id);
          },
        };
        break;

      case "typeorm":
        utilsObj.typeorm = driver;
        db = await initTypeorm(config.options, driver);

        // 添加 TypeORM 常用操作
        utilsObj.dbUtils = {
          getRepository: (entity: any) => db.getRepository(entity),
          findById: async (entity: any, id: number | string) => {
            const repository = db.getRepository(entity);
            return await repository.findOne({ where: { id } });
          },
          findAll: async (entity: any, where = {}) => {
            const repository = db.getRepository(entity);
            return await repository.find({ where });
          },
          create: async (entity: any, data: Record<string, any>) => {
            const repository = db.getRepository(entity);
            const newEntity = repository.create(data);
            return await repository.save(newEntity);
          },
          update: async (
            entity: any,
            id: number | string,
            data: Record<string, any>
          ) => {
            const repository = db.getRepository(entity);
            await repository.update(id, data);
            return await repository.findOne({ where: { id } });
          },
          delete: async (entity: any, id: number | string) => {
            const repository = db.getRepository(entity);
            const entityToRemove = await repository.findOne({ where: { id } });
            if (!entityToRemove) return null;
            return await repository.remove(entityToRemove);
          },
          query: async (sql: string, parameters?: any[]) => {
            return await db.query(sql, parameters);
          },
        };
        break;

      default:
        throw new Error(`不支持的数据库类型: ${config.type}`);
    }

    utilsObj.db = db;

    console.log(`  ✅ ${chalk.green(config.type)} 数据库连接成功`);

    // 对所有数据库类型都调用回调函数
    if (config.onResult) {
      config.onResult(null, db);
    }

    return db;
  } catch (error) {
    console.error(`  ❌ ${chalk.red(config.type)} 数据库连接失败:`);
    console.error(
      `    ${chalk.red(error instanceof Error ? error.message : String(error))}`
    );

    // 对所有数据库类型都调用回调函数
    if (config.onResult) {
      config.onResult(
        error instanceof Error ? error : new Error(String(error))
      );
    }

    if (config.required) {
      throw error;
    }

    return null;
  }
}

// 完整的 createAdvanceApi 函数实现
export async function createAdvanceApi(options: CreateAdvanceApiOptions = {}) {
  const app = express();
  const router = express.Router();
  const prefix = options.prefix || "/api";

  // 启用 CORS
  app.use(cors(options.cors || { origin: "*" }));

  // 解析 JSON 请求体
  app.use(express.json());

  // 解析 URL 编码的请求体
  app.use(express.urlencoded({ extended: true }));

  // 根据配置添加日志中间件
  if (options.logger) {
    app.use((req, res, next) => {
      const startTime = Date.now();

      // 响应结束时记录日志
      res.on("finish", () => {
        const duration = Date.now() - startTime;
        console.log(
          `[API] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`
        );
      });

      next();
    });
  }

  // 添加响应处理中间件
  app.use((req: Request, res: Response, next: NextFunction) => {
    // 扩展 Response 对象
    res.success = function (data: any) {
      return res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    };

    res.error = function (message: string, code = 400) {
      return res.status(code).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    };

    next();
  });

  // 创建 HTTP 服务器
  const httpServer = http.createServer(app);

  // 路由收集器
  const routeCollector = new RouteCollector();

  // 工具对象
  const utils: Utils = {
    router,
    app,
    express,
    uuid: uuidv4,
    _: lodash,
    axios: axios.create(),
    getRoutes: () => routeCollector.getRoutes(),
    printRoutes: () => routeCollector.printRoutes(),
    httpServer,
  };

  // 获取服务器信息
  const serverInfo = await getServerInfo();

  // 初始化数据库连接
  if (options.database) {
    try {
      await setupDatabase(options.database, utils);
    } catch (error) {
      console.error("数据库初始化失败:", error);
    }
  }

  // 初始化 Socket.IO
  if (options.socket?.enable) {
    const io = new Server(httpServer, options.socket.options || {});
    utils.io = io;
    console.log("  🔌 Socket.IO 已启用");
  }

  // 添加一个简单的测试路由
  router.get("/test", (req, res) => {
    res.json({
      status: "ok",
      message: "API 服务器正常工作",
      timestamp: new Date().toISOString(),
    });
  });

  // 添加内置路由
  const builtInRoutes = createBuiltInRoutes(routeCollector, serverInfo, utils);

  // 注册内置路由
  builtInRoutes.forEach((route) => {
    const { path, method, handler, description } = route;
    const fullPath = path; // 不需要添加前缀，因为我们会将整个路由器挂载到前缀路径

    // 使用明确的方法调用而不是动态方法
    if (method.toLowerCase() === "get") {
      router.get(fullPath, async (req: Request, res: Response) => {
        await handler(req as ApiRequest, res as ExtendedResponse, utils);
      });
    } else if (method.toLowerCase() === "post") {
      router.post(fullPath, async (req: Request, res: Response) => {
        await handler(req as ApiRequest, res as ExtendedResponse, utils);
      });
    } else if (method.toLowerCase() === "put") {
      router.put(fullPath, async (req: Request, res: Response) => {
        await handler(req as ApiRequest, res as ExtendedResponse, utils);
      });
    } else if (method.toLowerCase() === "delete") {
      router.delete(fullPath, async (req: Request, res: Response) => {
        await handler(req as ApiRequest, res as ExtendedResponse, utils);
      });
    }

    routeCollector.add(
      method.toUpperCase(),
      `${prefix}${fullPath}`,
      "内置",
      description
    );
  });

  // 扫描路由文件
  if (options.routerScan) {
    try {
      console.log(`\n🔍 ${chalk.blue("开始扫描路由文件...")}`);
      const scannedRoutes = await scanRouterFiles(
        options.routerScan,
        options.routerScan.callbacks
      );

      // 注册扫描到的路由
      scannedRoutes.forEach((route) => {
        const { path, method, handler, description } = route;
        const fullPath = path; // 不需要添加前缀，因为我们会将整个路由器挂载到前缀路径

        // 使用明确的方法调用而不是动态方法
        if (method.toLowerCase() === "get") {
          router.get(fullPath, async (req: Request, res: Response) => {
            await handler(req as ApiRequest, res as ExtendedResponse, utils);
          });
        } else if (method.toLowerCase() === "post") {
          router.post(fullPath, async (req: Request, res: Response) => {
            await handler(req as ApiRequest, res as ExtendedResponse, utils);
          });
        } else if (method.toLowerCase() === "put") {
          router.put(fullPath, async (req: Request, res: Response) => {
            await handler(req as ApiRequest, res as ExtendedResponse, utils);
          });
        } else if (method.toLowerCase() === "delete") {
          router.delete(fullPath, async (req: Request, res: Response) => {
            await handler(req as ApiRequest, res as ExtendedResponse, utils);
          });
        }

        routeCollector.add(
          method.toUpperCase(),
          `${prefix}${fullPath}`,
          "扫描",
          description
        );
      });

      console.log(
        `✅ ${chalk.green(`扫描完成，共发现 ${scannedRoutes.length} 个路由`)}`
      );
    } catch (error) {
      console.error(`❌ ${chalk.red("路由扫描失败:")}`, error);
    }
  }

  // 设置自定义路由
  if (options.setup) {
    console.log(`\n🔧 ${chalk.blue("设置自定义路由...")}`);
    const modules = options.setup(utils);

    modules.forEach((module) => {
      if (module.type === "object") {
        // 对象模式
        const routes = module.routes || [];
        const base = module.base || "";

        console.log(`  📁 ${chalk.yellow(`模块: ${base || "根路径"}`)}`);

        routes.forEach((route) => {
          const { path, method, handler, description } = route;
          const fullPath = joinPaths(base, path);

          // 使用明确的方法调用而不是动态方法
          if (method.toLowerCase() === "get") {
            router.get(fullPath, async (req: Request, res: Response) => {
              await handler(req as ApiRequest, res as ExtendedResponse, utils);
            });
          } else if (method.toLowerCase() === "post") {
            router.post(fullPath, async (req: Request, res: Response) => {
              await handler(req as ApiRequest, res as ExtendedResponse, utils);
            });
          } else if (method.toLowerCase() === "put") {
            router.put(fullPath, async (req: Request, res: Response) => {
              await handler(req as ApiRequest, res as ExtendedResponse, utils);
            });
          } else if (method.toLowerCase() === "delete") {
            router.delete(fullPath, async (req: Request, res: Response) => {
              await handler(req as ApiRequest, res as ExtendedResponse, utils);
            });
          }

          routeCollector.add(
            method.toUpperCase(),
            `${prefix}${fullPath}`,
            base,
            description
          );

          console.log(
            `    ${chalk.green(`${method.toUpperCase()}`)} ${fullPath} ${description ? `- ${description}` : ""}`
          );
        });
      } else if (module.type === "direct") {
        // 直接模式
        const base = module.base || "";
        console.log(
          `  📁 ${chalk.yellow(`直接模式模块: ${base || "根路径"}`)}`
        );

        // 创建路由定义器
        const routerDefiner: RouterDefiner = {
          get: (path, handler, description) => {
            const fullPath = joinPaths(base, path);
            router.get(fullPath, async (req: Request, res: Response) => {
              await handler(req as ApiRequest, res as ExtendedResponse, utils);
            });
            routeCollector.add(
              "GET",
              `${prefix}${fullPath}`,
              base,
              description
            );
            console.log(
              `    ${chalk.green("GET")} ${fullPath} ${description ? `- ${description}` : ""}`
            );
          },
          post: (path, handler, description) => {
            const fullPath = joinPaths(base, path);
            router.post(fullPath, async (req: Request, res: Response) => {
              await handler(req as ApiRequest, res as ExtendedResponse, utils);
            });
            routeCollector.add(
              "POST",
              `${prefix}${fullPath}`,
              base,
              description
            );
            console.log(
              `    ${chalk.green("POST")} ${fullPath} ${description ? `- ${description}` : ""}`
            );
          },
          put: (path, handler, description) => {
            const fullPath = joinPaths(base, path);
            router.put(fullPath, async (req: Request, res: Response) => {
              await handler(req as ApiRequest, res as ExtendedResponse, utils);
            });
            routeCollector.add(
              "PUT",
              `${prefix}${fullPath}`,
              base,
              description
            );
            console.log(
              `    ${chalk.green("PUT")} ${fullPath} ${description ? `- ${description}` : ""}`
            );
          },
          delete: (path, handler, description) => {
            const fullPath = joinPaths(base, path);
            router.delete(fullPath, async (req: Request, res: Response) => {
              await handler(req as ApiRequest, res as ExtendedResponse, utils);
            });
            routeCollector.add(
              "DELETE",
              `${prefix}${fullPath}`,
              base,
              description
            );
            console.log(
              `    ${chalk.green("DELETE")} ${fullPath} ${description ? `- ${description}` : ""}`
            );
          },
        };

        // 调用路由定义函数
        module.routes(routerDefiner);
      }
    });

    console.log(`✅ ${chalk.green("自定义路由设置完成")}`);
  }

  // 挂载路由
  app.use(prefix, router);

  // 添加错误处理中间件
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("API 错误:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error",
      timestamp: new Date().toISOString(),
    });
  });

  // 返回 Vite 插件
  return {
    name: "vite-plugin-advance-api",
    configureServer(server: ViteDevServer) {
      // 直接使用 use 方法挂载 Express 应用
      server.middlewares.use(app);

      // 如果启用了 Socket.IO
      if (options.socket?.enable && utils.io && server.httpServer) {
        utils.io.attach(server.httpServer);
      }

      console.log(
        `\n🚀 ${chalk.green("API 服务已启动")} - ${chalk.cyan(
          `http://localhost:${server.config.server.port}${prefix}/test`
        )}\n`
      );

      // 打印路由信息
      console.log(`\n📋 ${chalk.yellow("已注册的 API 路由:")}`);
      routeCollector.printRoutes();
    },
  };
}

// 类型导出
export type {
  CreateAdvanceApiOptions,
  Utils,
  ModuleConfig,
  RouterDefiner,
  RouteDefinition,
  RouteHandler,
  ApiRequest,
  ExtendedResponse,
  DatabaseConfig,
  ObjectModeModule,
  DirectModeModule,
} from "./types";

// 直接从 scanner.ts 导出 ScanCallback
export type { ScanCallback } from "./scanner";

// 其他导出
export { CommonResponse, Code, CodeMessage } from "./response";
export {
  initMysql,
  initMongodb,
  initTypeorm,
  loadDatabaseDriver,
} from "./database";

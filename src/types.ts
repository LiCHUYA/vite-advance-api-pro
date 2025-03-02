import { Request, Response, Router } from "express";
import { CorsOptions } from "cors";
import { CommonResponse } from "./response";
import axios from "axios";
import { AxiosInstance } from "axios";
import type { Express } from "express";
import http from "http";
import { Server } from "socket.io";
import { ScanCallback } from "./scanner";
import type {
  DataSource,
  EntityTarget,
  Repository,
  ObjectLiteral,
} from "typeorm";

// 自定义请求和响应类型
export interface ApiRequest extends Request {
  // 可以在这里扩展请求类型
}

// 扩展 Response 接口
export interface ExtendedResponse extends Response {
  success(data: any): Response;
  error(message: string, code?: number): Response;
}

// 路由处理函数的类型定义
export type RouteHandler = (
  req: ApiRequest,
  res: ExtendedResponse,
  utils?: Utils
) => Promise<void> | void;

// 1. 对象模式的类型
export interface ApiConfig {
  path: string;
  method: "get" | "post" | "put" | "delete";
  handler: RouteHandler;
}

export interface ObjectModeModule {
  type: "object";
  base: string;
  apis?: ApiConfig[]; // 支持 apis 写法
  routes?: RouteDefinition[]; // 支持 routes 写法
}

// 2. 路由组模式的类型
export interface RouteDefinition {
  path: string;
  method: "get" | "post" | "put" | "delete";
  handler: RouteHandler;
  description?: string; // 接口描述
  params?: {
    // 参数说明
    [key: string]: {
      type: string;
      required?: boolean;
      description?: string;
    };
  };
  response?: {
    // 响应示例
    success?: any;
    error?: any;
  };
}

// 3. 直接路由模式的类型
export interface RouterDefiner {
  get: (path: string, handler: RouteHandler, description?: string) => void;
  post: (path: string, handler: RouteHandler, description?: string) => void;
  put: (path: string, handler: RouteHandler, description?: string) => void;
  delete: (path: string, handler: RouteHandler, description?: string) => void;
}

export interface DirectModeModule {
  type: "direct";
  base: string;
  routes: (router: RouterDefiner) => void;
}

// 添加数据库工具类型
export interface DbUtils {
  // 通用方法
  findById?: (entity: any, id: number | string) => Promise<any>;
  findAll?: (entity: any, where?: any) => Promise<any[]>;
  create?: (entity: any, data: Record<string, any>) => Promise<any>;
  update?: (
    entity: any,
    id: number | string,
    data: Record<string, any>
  ) => Promise<any>;
  delete?: (entity: any, id: number | string) => Promise<any>;

  // 特定数据库方法
  query?: (sql: string, params?: any[]) => Promise<any>;
  getRepository?: (entity: any) => any;
  model?: (name: string, schema?: any) => any;

  // 其他可能的方法
  [key: string]: any;
}

// 核心工具集合
export interface Utils {
  router: Router;
  app: Express;
  express: any;
  uuid: () => string;
  _: typeof import("lodash");
  axios: AxiosInstance;
  getRoutes: () => Array<{ method: string; path: string; moduleName?: string }>;
  printRoutes: () => void;
  httpServer?: http.Server;
  io?: Server;
  db?: any;

  // TypeORM 相关
  typeorm?: {
    DataSource: typeof DataSource;
    getRepository: <T extends ObjectLiteral>(
      target: EntityTarget<T>
    ) => Repository<T>;
    AppDataSource?: DataSource;
  };

  // 其他数据库
  mongoose?: typeof import("mongoose");
  mysql?: typeof import("mysql2/promise");
  dbUtils?: DbUtils;
}

// 修改 SetupContext 类型，直接继承 Utils
export interface SetupContext extends Utils {
  typeorm: NonNullable<Utils["typeorm"]>; // 确保 typeorm 存在
}

// 修改 SetupResult 类型，不再嵌套 utils
export interface SetupResult extends SetupContext {
  // 可以添加其他你想要存储的内容
}

export interface CreateAdvanceApiOptions {
  prefix?: string;
  cors?: CorsOptions;
  logger?: boolean;
  routerScan?: {
    paths: string[];
    pattern?: string | string[];
    callbacks?: ScanCallback;
  };
  socket?: {
    enable: boolean;
    options?: any;
  };
  database?: DatabaseConfig & {
    onResult?: (error: Error | null, connection?: any) => void; // 数据库连接回调
  };
  onSetup?: (setupResult: SetupResult) => void; // 新增 setup 回调
  setup?: (context: SetupContext) => ModuleConfig[];
}

// 添加API文档相关的类型定义
export interface ApiDoc {
  title: string; // API标题
  description?: string; // API描述
  params?: Record<string, string>; // 参数说明
  response?: Record<string, any>; // 返回值示例
}

// 模块文档
export interface ModuleDoc {
  name: string; // 模块名称
  description?: string; // 模块描述
}

// 添加 NetworkInterfaceInfo 类型并导出
export interface NetworkInterfaceInfo {
  family: string;
  internal: boolean;
  address: string;
}

// 修改数据库配置类型
export interface DatabaseConfig {
  type: "mysql" | "mongodb" | "typeorm";
  options: any;
  onResult?: (error: Error | null, connection?: any) => void; // 添加回调函数
  required?: boolean; // 是否必需，如果为 true 则连接失败时抛出错误
}

// 模块类型联合
export type ModuleConfig = ObjectModeModule | DirectModeModule;

export { ScanCallback } from "./scanner";

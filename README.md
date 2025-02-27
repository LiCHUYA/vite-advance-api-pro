<div align="center">
<h1>🚀  vite-advance-api-pro </h1>
<p> Vite插件 零配置开发 Node 接口方案 </p>
</div>

> **痛点直击**：你是否也遇到过这些场景？
>
> - 需要临时开发几个 Node 接口却不想新建后端项目
> - 想用 Express 但受限于 Vite 插件的简陋配置
> - 被重复的 try-catch 和错误处理折磨到崩溃

---

在前端工程化的开发中，会有一些需求要使用node编写辅助接口 ,比如 node接口转发,状态存储等等,而因为几个接口去创建一个后端项目并且部署,显然是不符合预期的,虽然Vite支持直接使用plugin编写express接口,但是不够模块化,也不够简洁(想造轮子了) 它们往往无法完全满足特定需求。于是，我开发了一个 **Vite 插件** —— **vite-advance-api-pro**，它旨在简化前端 API 开发，支持多种路由定义方式，并提供统一的响应处理机制。

## 🌟 核心价值

**让前端开发者快速构建全栈应用**，通过 Vite 插件形式提供企业级后端能力，无需复杂配置即可获得：

- 🚪多种路由定义方式
- 🗄️ 主流数据库集成 支持 MySQL、MongoDB、TypeORM 和 Prisma
- 📡 实时通信能力 WebSocket 支持：通过 Socket.IO 提供实时通信能力
- 🧩 模块化架构支持
- 🚀 内置工具集：提供常用工具函数，如 UUID 生成、HTTP 客户端等
  API 文档生成：自动生成接口文档页面

---

github地址: https://github.com/LiCHUYA/vite-advance-api-pro/tree/master

## 🚀 5分钟快速入门

### 安装指南

```bash
# 使用 npm
npm install vite-advance-api-pro --save-dev

# 使用 Yarn
yarn add vite-advance-api-pro -D

# 使用 PNPM
pnpm add vite-advance-api-pro -D
```

### **最简配置**

在 `vite.config.ts` 中配置插件：

```ts
import { defineConfig } from "vite";
import { createAdvanceApi } from "vite-advance-api-pro";

import type {
  CreateAdvanceApiOptions,
  Utils,
  RouteHandler,
} from "vite-advance-api-pro";

export default defineConfig({
  plugins: [
    createAdvanceApi({
      prefix: "/api", // 定义 API 路由前缀
    }),
  ],
});
```

这样就配置好了一个简单的 API 服务器,然后启动项目,启动后了会默认内置2个路由
插件提供了两个内置路由：

1. 测试路由 /api/advance-api-test
   这是一个简单的测试路由，用于验证插件是否正常工作

2. 文档路由 /api/docs

   这是一个文档路由,可以查看定义路由的文档

### 路由定义方式(2种)

#### 对象模式

路由定义在 `routes` 中,在handler函数中有三个参数,第三个参数是我们的核心`utils`参数,在后续会详细的介绍

- `type: "object"` 表示使用对象模式
- `base: "/users"` 定义了基础路径
- `routes` 数组包含了具体的路由定义

```ts
createAdvanceApi({
  prefix: "/api",
  setup: (utils) => [
    {
      type: "object",
      base: "/users", // 定义基础路径
      routes: [
        {
          path: "/",
          method: "get",
          description: "获取所有用户",
          handler: (req, res, utils) => {
            res.success({ users: [{ id: 1, name: "John" }] });
          },
        },
      ],
    },
  ],
});
```

#### **直接模式**

提供更灵活的 API 定义方式，类似于 Express 的路由定义：

- `type: "direct"` 表示使用直接模式
- `routes` 是一个函数，接收 `router` 对象

```ts
createAdvanceApi({
  prefix: "/api",
  setup: (utils) => [
    {
      type: "direct",
      base: "/products",
      routes: (router) => {
        router.get("/", (req, res,utils) => {
          res.send({ products: [{ id: 1, name: "Product 1" }] });
        }, "获取所有产品");

        router.put("/:id", (req, res) => {
          res.success({ message: "Product updated", id: req.params.id });
        }, "更新产品");

        router.delete("/:id", (req, res) => {
          res.success({ message: "Product deleted", id: req.params.id });
        }, "删除产品");

    },
  ],
});
```

#### **自动扫描模式**

我们经常会将一个个模块抽离出去 做到高内聚低耦合的效果, 而在 `routerScan` 中 我们可以配置统一的文件路径 这样 我们的插件会自动的将`.router.{ts,js}`命名的文件 添加到路由中 达到自动扫描的功能。

---

在使用`对象模式`进行配置的时候, 允许你将路由分散到不同的文件中，而满足条件的时候,插件会自动加载这些路由配置：

```ts
createAdvanceApi({
  prefix: "/api",
  routerScan: {
    paths: ["src/server"],
    pattern: "**/*.router.{ts,js}",
  },
});
```

> 在下图中 我们可以看出 user.router.js 满足配置条件,会自动将路由读取出来

```js
// 路径 : src/server/user.router.js
let userRoutes = [
  {
    description: "获取状态",
    path: "/status", // 路由路径
    method: "get", // HTTP 方法
    handler: async (req, res, utils) => {
      res.success({ status: "ok", data: utils });
    },
  },
];

export default userRoutes;
```

![](https://pic1.imgdb.cn/item/67c01a1dd0e0a243d407002e.png)

---

#### description 字段的作用

路由定义中的 `description` 字段用于描述 API 的功能和用途：

```
{
  path: "/users/:id",
  method: "get",
  description: "获取指定 ID 的用户信息",
  handler: async (req, res) => {
    // 处理逻辑...
  },
}
```

这个描述字段有两个主要作用：

- **API 文档生成**：描述会显示在自动生成的 API 文档页面上，帮助开发者理解 API 的用途。
- **控制台日志**：在服务器启动时，描述会显示在控制台日志中，方便开发者查看所有可用的 API。

![image-20250227135917087](https://pic1.imgdb.cn/item/67c01a1cd0e0a243d407002b.png)

### setup 函数详解

`setup` 函数是插件的核心配置项，它允许你以编程方式定义 API 路由。这个函数接收一个 `utils` 对象作为参数，并返回一个或多个模块配置。

#### utils 对象详解

`utils` 对象包含了许多有用的工具和引用：

- router
- express
- app
- db
- io

```ts
/ 核心工具集合
export interface Utils {
  router: Router;
  app: Express;
  express: any;
  uuid: () => string;
  _: {
    pick: <T>(obj: T, paths: string[]) => Partial<T>;
    omit: <T extends object | null | undefined>(
      obj: T,
      paths: string[]
    ) => Partial<T>;
    get: (obj: any, path: string, defaultValue?: any) => any;
  };
  axios: AxiosInstance;
  getRoutes: () => Array<{ method: string; path: string; moduleName?: string }>;
  printRoutes: () => void;
  httpServer?: http.Server;
  io?: Server;
  db?: any;
  // ORM 工具
  typeorm?: typeof import("typeorm");
  mongoose?: typeof import("mongoose");
  mysql?: typeof import("mysql2/promise");

  // 添加数据库工具
  dbUtils?: DbUtils;
}
```

#### 在 setup 中使用 utils

```ts
createAdvanceApi({
  setup: (utils) => {
    // 在 setup 中使用 utils
    console.log("可用路由:", utils.getRoutes());

    // 使用 Express 实例添加中间件
    utils.app.use((req, res, next) => {
      console.log("请求时间:", new Date());
      next();
    });

    return [
      // 模块配置...
    ];
  },
});
```

#### 模块配置详解

`setup` 函数返回的模块配置可以是单个对象或对象数组，每个对象定义了一组相关的路由：

```ts
// 对象模式
interface ObjectModeModule {
  type: "object";
  base: string; // 基础路径
  apis?: ApiConfig[]; // 旧版 API 配置（向后兼容）
  routes?: RouteDefinition[]; // 路由定义
}

// 直接模式
interface DirectModeModule {
  type: "direct";
  base: string; // 基础路径
  routes: (router: RouterDefiner) => void; // 路由定义函数
}
```

## 🧩 核心特性深度解析

### 1. 智能路由系统

#### 模式对比表

| 模式         | 适用场景     | 优势                         | 示例复杂度 |
| ------------ | ------------ | ---------------------------- | ---------- |
| 对象模式     | CRUD 接口    | 声明式配置，结构清晰         | ⭐         |
| 直接模式     | 复杂业务逻辑 | 灵活性强，支持中间件链式调用 | ⭐⭐⭐     |
| 自动扫描模式 | 大型项目     | 模块化管理，自动发现路由     | ⭐⭐       |

#### 完整示例

```typescript
// 用户模块路由示例
{
  type: "object",
  base: "/users",
  middlewares: [authMiddleware], // 全局中间件
  routes: [
    {
      path: "/:id",
      method: "get",
      description: "获取用户详情",
      handler: async (req, res, utils) => {
        const user = await userService.getById(req.params.id);
        res.wrap(user); // 统一响应包装
      }
    },
    {
      path: "/search",
      method: "post",
      schema: userSearchSchema, // Joi 校验 schema
      handler: searchHandler
    }
  ]
}
```

### 2.集成cors

跨域资源共享 (CORS) 是一种机制，允许不同源的网页访问你的 API。vite-advance-api-pro 提供了简单的 CORS 配置选项。

```js
// vite.config.ts
createAdvanceApi({
  prefix: "/api",
  cors: {
    origin: "*", // 允许所有源访问
    // 或者指定特定域名
    // origin: "https://example.com",
    // 或者多个域名
    // origin: ["https://example.com", "https://app.example.com"],
    methods: ["GET", "POST", "PUT", "DELETE"], // 允许的 HTTP 方法
    allowedHeaders: ["Content-Type", "Authorization"], // 允许的请求头
    credentials: true, // 允许携带凭证（如 cookies）
  },
});
```

**安全提示：**

在生产环境中，应该避免使用 `origin: "*"`，而是明确指定允许访问的域名。这可以防止未授权的网站访问你的 API。

### 2. 集成SocketIo

```typescript
createAdvanceApi({
  prefix: "/api",
  socket: {
    enable: true, // 启用 WebSocket
    options: {
      path: "/socket.io", // Socket.IO 路径
      cors: {
        origin: "*", // 允许的源
      },
    },
  },
  // 其他配置...
});
```

#### 示例使用

当我们开启配置后,可以在setup函数中直接使用到`io`实例,它和我们前端服务器的端口一致

```js
createAdvanceApi({
      prefix: "/api",
      // 配置 Socket.IO
      socket: {
        enable: true,
        options: {
          cors: { origin: "*" },
        },
      },
      // 扫描路由
      routerScan: {
        paths: ["server"],
        pattern: "**/*.router.js",
      },
      // 设置 Socket.IO 事件处理
      setup: (utils) => {
        const { io, db } = utils;

        if (io) {
          console.log(io);

          io.on("connection", (socket) => {
            console.log("用户连接:", socket.id);

            // 断开连接
            socket.on("disconnect", () => {
              console.log("用户断开连接:", socket.id);
            });
          });
        }
      },
    }),
```

#### 前端使用

安装`socket.io-client`库之后,便可以直接进行使用,不需要在填入url,配置等。

```js
import { io } from "socket.io-client";

const socket = io();

onMounted(async () => {
  socket.on("connect", () => {
    console.log("连接成功");
  });
});
```

![image-20250227135602821](https://pic1.imgdb.cn/item/67c01a1dd0e0a243d407002f.png)

## 🗄️ 数据库集成指南

vite-advance-api-pro 支持多种数据库和 ORM，使你能够轻松地在 API 中使用数据库功能。

**三大模式:**

支持原生的Mysql,MongoDB ,更支持typeorm对数据库进行操作

### 配置数据库

#### 基本配置

#### MySQL 集成

```js
// vite.config.ts
import { createAdvanceApi } from "vite-advance-api-pro";

export default createAdvanceApi({
  // 其他配置...
  database: {
    type: "mysql",
    options: {
      // 数据库连接选项
      host: "localhost",
      port: 3306,
      user: "root",
      password: "password",
      database: "mydb",
    },
    required: true, // 如果为 true，连接失败时会抛出错误
    onResult: (error, connection) => {
      // 连接结果回调
      if (error) {
        console.error("数据库连接失败:", error);
      } else {
        console.log("数据库连接成功!");
      }
    },
  },
});
```

```js
// server/user.router.js
export default [
  {
    path: "/users",
    method: "get",
    description: "获取所有用户",
    handler: async (req, res, utils) => {
      try {
        // 方式1: 使用原始连接
        const [rows] = await utils.db.query("SELECT * FROM users");

        // 方式2: 使用封装的工具方法
        const users = await utils.dbUtils.findAll("users");

        // 方式3: 使用条件查询
        const activeUsers = await utils.dbUtils.findAll("users", {
          status: "active",
        });

        res.success({ users });
      } catch (error) {
        res.error(error.message);
      }
    },
  },
];
```

当我们测试连接成功后,看看接口是否正常运行呢

![image-20250227144818963](https://pic1.imgdb.cn/item/67c01a1cd0e0a243d407002c.png)

![image-20250227144840436](https://pic1.imgdb.cn/item/67c01a1dd0e0a243d407002d.png)

#### MongoDB 集成

```js
// vite.config.ts
database: {
  type: "mongodb",
  options: {
    uri: "mongodb://localhost:27017/mydb",
    // 或者使用详细配置
    host: "localhost",
    port: 27017,
    database: "mydb",
    user: "admin",
    password: "password",
    // 其他 Mongoose 连接选项
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
}
```

使用方式

```js
// server/user.router.js
// 首先定义模型 Schema
const UserSchema = new utils.mongoose.Schema({
  name: String,
  email: String,
  age: Number,
  createdAt: { type: Date, default: Date.now }
});

export default {
  type: "direct",
  base: "/mongodb",
  routes: (router) => {
    // 注册模型
    router.get("/users", async (req, res, utils) => {
      try {
        // 获取或创建模型
        const User = utils.dbUtils.model("User", UserSchema);

        // 查询所有用户
        const users = await utils.dbUtils.findAll(User);
        res.success(users);
      } catch (error) {
        res.error("获取用户失败: " + error.message);
      }
    });
};
```

#### TypeORM 集成

更多使用方式可查看 typeorm官网

```js
database: {
  type: "typeorm",
  options: {
    type: "mysql", // 或 "postgres", "sqlite", 等
    host: "localhost",
    port: 3306,
    username: "root",
    password: "password",
    database: "mydb",
    synchronize: true,
    logging: true,
    entities: [
       UserSchema,
      // 实体类路径
      "src/entities/**/*.ts"
    ]
  }
}
```

基本使用

```js
import { EntitySchema } from "typeorm";

// 定义用户实体的接口
export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  createdAt: Date;
}

// 使用 EntitySchema 定义实体
export const UserSchema = new EntitySchema<User>({
  name: "User",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    age: {
      type: Number,
    },
    createdAt: {
      type: Date,
      createDate: true,
    },
  },
});

```

使用:

```js
 		{
            type: "direct",
            routes: (router) => {
              router.get("/users", async (req, res) => {
                try {
                  const userRepository = utils.db.getRepository(UserSchema);
                  const users = await userRepository.find();
                  res.success(users);
                } catch (error) {
                  res.error(error.message);
                }
              });
          },
```

![image-20250227145924457](https://pic1.imgdb.cn/item/67c01a1fd0e0a243d4070030.png)

### 完整使用

```js
// vite.config.ts
import { defineConfig } from "vite";
import { createAdvanceApi } from "vite-advance-api-pro";

export default defineConfig({
  plugins: [
    createAdvanceApi({
      prefix: "/api",
      cors: { origin: "*" },

      // 数据库配置
      database: {
        type: "typeorm",
        options: {
          type: "mysql",
          host: "localhost",
          port: 3306,
          username: "root",
          password: "password",
          database: "myapp",
          synchronize: true,
          entities: ["src/entities/*.ts"],
        },
      },

      // WebSocket 配置
      socket: {
        enable: true,
        options: {
          cors: { origin: "*" },
        },
      },

      // 自动扫描路由
      routerScan: {
        paths: ["src/server"],
        pattern: "**/*.router.{ts,js}",
        callbacks: {
          onStart: (paths) => console.log("开始扫描路径:", paths),
          onFile: (file) => console.log("发现路由文件:", file),
          onComplete: (routes) =>
            console.log("扫描完成，发现路由:", routes.length),
          onError: (error, file) => console.error("扫描错误:", file, error),
        },
      },

      // 手动设置路由
      setup: (utils) => [
        // 用户模块
        {
          type: "object",
          base: "/users",
          routes: [
            {
              path: "/",
              method: "get",
              description: "获取所有用户列表",
              handler: async (req, res, utils) => {
                try {
                  // 使用 TypeORM 查询用户
                  const userRepo = utils.typeorm.getRepository("User");
                  const users = await userRepo.find();

                  // 过滤敏感字段
                  const safeUsers = users.map((user) =>
                    utils._.omit(user, ["password"])
                  );

                  res.success({ users: safeUsers });
                } catch (error) {
                  res.error(error.message);
                }
              },
            },
            {
              path: "/:id",
              method: "get",
              description: "获取指定 ID 的用户信息",
              handler: async (req, res, utils) => {
                try {
                  const userRepo = utils.typeorm.getRepository("User");
                  const user = await userRepo.findOne({
                    where: { id: req.params.id },
                  });

                  if (!user) {
                    return res.error("User not found", 404);
                  }

                  const safeUser = utils._.omit(user, ["password"]);
                  res.success({ user: safeUser });
                } catch (error) {
                  res.error(error.message);
                }
              },
            },
          ],
        },

        // 认证模块
        {
          type: "direct",
          base: "/auth",
          routes: (router) => {
            router.post(
              "/login",
              async (req, res, utils) => {
                try {
                  const { username, password } = req.body;

                  // 验证用户
                  const userRepo = utils.typeorm.getRepository("User");
                  const user = await userRepo.findOne({ where: { username } });

                  if (!user || user.password !== password) {
                    return res.error("Invalid username or password", 401);
                  }

                  // 生成 token
                  const token = `token-${utils.uuid()}`;

                  res.success({ token });
                } catch (error) {
                  res.error(error.message);
                }
              },
              "用户登录"
            );

            router.post(
              "/register",
              async (req, res, utils) => {
                try {
                  const { username, password, email } = req.body;

                  // 创建用户
                  const userRepo = utils.typeorm.getRepository("User");
                  const newUser = userRepo.create({
                    username,
                    password,
                    email,
                  });
                  await userRepo.save(newUser);

                  res.success({ message: "User registered successfully" });
                } catch (error) {
                  res.error(error.message);
                }
              },
              "用户注册"
            );
          },
        },
      ],
    }),
  ],
});
```

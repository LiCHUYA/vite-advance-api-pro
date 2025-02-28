import type { RouteDefinition } from "vite-advance-api-pro";

export default [
  {
    path: "/users",
    method: "get",
    handler: async (req, res) => {
      res.success({ message: "Get users" });
    },
    description: "获取用户列表",
  },
] as RouteDefinition[];

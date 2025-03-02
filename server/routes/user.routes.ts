import { RouteDefinition } from "vite-advance-api-pro";
import { UserSchema } from "../entities/User";

// 可以在路由文件外部使用 AppDataSource
import { AppDataSource } from "vite-advance-api-pro";

// 创建用户 Repository
const userRepository = AppDataSource.getRepository(UserSchema);

// 抽离业务逻辑
export async function createUser(userData: any) {
  const existingUser = await userRepository.findOne({
    where: { email: userData.email },
  });

  if (existingUser) {
    throw new Error("该邮箱已被注册");
  }

  return await userRepository.save(userData);
}

// 路由定义
export default [
  {
    path: "/register",
    method: "post",
    description: "用户注册",
    handler: async (req, res, { typeorm }) => {
      try {
        const userRepository = typeorm.getRepository(UserSchema);
        const { email } = req.body;

        const existingUser = await userRepository.findOne({ where: { email } });
        if (existingUser) {
          return res.error("该邮箱已被注册", 400);
        }

        const user = await userRepository.save(req.body);
        res.success(user);
      } catch (error) {
        res.error(error.message);
      }
    },
  },
] as RouteDefinition[];

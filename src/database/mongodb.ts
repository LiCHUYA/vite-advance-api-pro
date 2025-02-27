import mongoose from "mongoose";

export async function initMongodb(options: any) {
  try {
    // 检查是否安装了 mongoose
    try {
      require.resolve("mongoose");
    } catch (e) {
      throw new Error("请先安装 mongoose: npm install mongoose");
    }

    const uri = options.uri || "mongodb://localhost:27017";
    await mongoose.connect(uri, options);
    return mongoose;
  } catch (error) {
    console.error("MongoDB 初始化失败:", error);
    throw error;
  }
}

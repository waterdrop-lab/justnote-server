const { v4: uuid } = require("uuid");
const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

tokenSchema.statics.generate = async function (user) {
  const token = "jn-" + uuid();
  const authToken = new this({
    token,
    userId: user._id,
    expiresAt: new Date(Date.now() + 3600 * 1000 * 24), // expire in one day
  });
  await authToken.save();
  return token;
};
tokenSchema.statics.toUser = async function (token) {
  const result = await this.aggregate([
    { $match: { token } },
    {
      $lookup: {
        from: "users", // 要连接的集合名称
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" }, // 展开 user 数组
    { $project: { token: 1, user: 1 } }, // 投影需要的字段
  ]);

  if (result.length === 0) {
    return null;
  }

  return result[0].user;
};

module.exports = mongoose.model("authToken", tokenSchema);

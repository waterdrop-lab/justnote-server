const { v4: uuid } = require("uuid");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const AuthToken = require("./AuthToken");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Password hashing middleware
userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.statics.register = async function (username, password) {
  const user = new this({ username, password });
  await user.save();
  const token = await AuthToken.generate(user);
  return { user, token };
};
userSchema.statics.login = async function (username, password) {
  const user = await this.findOne({ username });
  if (!user) {
    throw new Error("Incorrect username.");
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error("Incorrect password.");
  }
  const token = await AuthToken.generate(user);
  return { user, token };
};

module.exports = mongoose.model("User", userSchema);

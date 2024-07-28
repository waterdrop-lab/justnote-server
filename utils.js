const SystemLog = require("./models/SystemLog");

async function errorLog(error) {
  console.log("errorLog", error);
  const systemLog = new SystemLog({
    data: errorToJSON(error),
  });
  await systemLog.save();
}
function errorToJSON(error) {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
    ...error,
  };
}
exports.errorToJSON = errorToJSON;
exports.errorLog = errorLog;

const asyncHandler = require("../utils/asyncHandler");
const {
  createOrUpdateDailyLog,
  getDailyLogByDate,
} = require("../services/log.service");

const createLog = asyncHandler(async (request, response) => {
  const log = await createOrUpdateDailyLog(request.user.userId, request.body);

  response.status(201).json({
    success: true,
    message: "Daily log saved successfully",
    data: log,
  });
});

const getLogByDate = asyncHandler(async (request, response) => {
  const log = await getDailyLogByDate(request.user.userId, request.params.date);

  response.status(200).json({
    success: true,
    data: log,
  });
});

module.exports = {
  createLog,
  getLogByDate,
};

const asyncHandler = require("../utils/asyncHandler");
const {
  createOrUpdateDailyLog,
  getDailyLogByDate,
  getDashboardSummary,
  getWeightTracker,
  getWeeklySummary,
  getWeeklyReport,
  getProgressReport,
  createSharedProgressReport,
  getSharedProgressReport,
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

const getDashboard = asyncHandler(async (request, response) => {
  const data = await getDashboardSummary(
    request.user.userId,
    request.query.date || new Date()
  );

  response.status(200).json({
    success: true,
    data,
  });
});

const getWeightTrackerSummary = asyncHandler(async (request, response) => {
  const data = await getWeightTracker(
    request.user.userId,
    Number(request.query.days) || 7,
    request.query.endDate || new Date()
  );

  response.status(200).json({
    success: true,
    data,
  });
});

const getWeeklySummaryController = asyncHandler(async (request, response) => {
  const data = await getWeeklySummary(
    request.user.userId,
    request.query.endDate || new Date()
  );

  response.status(200).json({
    success: true,
    data,
  });
});

const getWeeklyReportController = asyncHandler(async (request, response) => {
  const data = await getWeeklyReport(
    request.user.userId,
    request.query.endDate || new Date()
  );

  response.status(200).json({
    success: true,
    data,
  });
});

const getProgressReportController = asyncHandler(async (request, response) => {
  const data = await getProgressReport(request.user.userId, {
    period: request.query.period || "weekly",
    endDate: request.query.endDate || new Date(),
    startDate: request.query.startDate,
    dates: request.query.dates
      ? String(request.query.dates)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : undefined,
  });

  response.status(200).json({
    success: true,
    data,
  });
});

const createSharedReportController = asyncHandler(async (request, response) => {
  const data = await createSharedProgressReport(request.user.userId, request.body);

  response.status(201).json({
    success: true,
    message: "Share report created successfully",
    data,
  });
});

const getSharedReportController = asyncHandler(async (request, response) => {
  const data = await getSharedProgressReport(request.params.token);

  response.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  createLog,
  getLogByDate,
  getDashboard,
  getWeightTrackerSummary,
  getWeeklySummaryController,
  getWeeklyReportController,
  getProgressReportController,
  createSharedReportController,
  getSharedReportController,
};

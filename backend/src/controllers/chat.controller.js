const asyncHandler = require("../utils/asyncHandler");
const { handleChatTurn, getMessagesByDate } = require("../services/chat.service");

const createChatMessage = asyncHandler(async (request, response) => {
  if (request.file?.path && !request.body.imageUrl) {
    request.body.imageUrl = request.file.path;
    request.body.type = "image";
  }

  const result = await handleChatTurn(request.user.userId, request.body);

  response.status(201).json({
    success: true,
    message: "Chat message processed successfully",
    data: result,
  });
});

const getChatHistory = asyncHandler(async (request, response) => {
  const date = request.query.date || new Date().toISOString().slice(0, 10);
  const messages = await getMessagesByDate(request.user.userId, date);

  response.status(200).json({
    success: true,
    message: "Chat history retrieved successfully",
    data: { messages },
  });
});

module.exports = {
  createChatMessage,
  getChatHistory,
};

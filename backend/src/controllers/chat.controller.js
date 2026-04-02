const asyncHandler = require("../utils/asyncHandler");
const { handleChatTurn } = require("../services/chat.service");

const createChatMessage = asyncHandler(async (request, response) => {
  const result = await handleChatTurn(request.user.userId, request.body);

  response.status(201).json({
    success: true,
    message: "Chat message processed successfully",
    data: result,
  });
});

module.exports = {
  createChatMessage,
};

const { buildTimestamps, removeUndefinedValues } = require("./model.utils");

const ReminderModel = {
  collectionName: "reminders",

  createPayload(input, existingData = null) {
    return removeUndefinedValues({
      userId: input.userId ?? existingData?.userId ?? null,
      title: input.title ?? existingData?.title ?? "",
      message: input.message ?? existingData?.message ?? "",
      reminderTime: input.reminderTime ?? existingData?.reminderTime ?? null,
      status: input.status ?? existingData?.status ?? "pending",
      triggeredAt: input.triggeredAt ?? existingData?.triggeredAt ?? null,
      ...buildTimestamps(existingData),
    });
  },
};

module.exports = ReminderModel;

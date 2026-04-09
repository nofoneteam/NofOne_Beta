const { removeUndefinedValues } = require("./model.utils");

const SharedReportModel = {
  collectionName: "sharedReports",

  createPayload(id, input) {
    return removeUndefinedValues({
      id,
      userId: input.userId,
      token: input.token,
      period: input.period,
      startDate: input.startDate,
      endDate: input.endDate,
      encryptedPayload: input.encryptedPayload,
      iv: input.iv,
      tag: input.tag,
      createdAt: new Date().toISOString(),
    });
  },
};

module.exports = SharedReportModel;

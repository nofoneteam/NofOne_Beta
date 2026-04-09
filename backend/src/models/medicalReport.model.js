const { buildTimestamps, removeUndefinedValues } = require("./model.utils");

const MedicalReportModel = {
  collectionName: "medicalReports",

  createPayload(id, input, existingData = null) {
    return removeUndefinedValues({
      userId: input.userId,
      title: input.title ?? existingData?.title ?? null,
      fileName: input.fileName,
      mimeType: input.mimeType,
      resourceType: input.resourceType,
      secureUrl: input.secureUrl,
      publicId: input.publicId ?? null,
      assetId: input.assetId ?? null,
      bytes: input.bytes ?? null,
      summary: input.summary ?? null,
      extractedTextPreview: input.extractedTextPreview ?? null,
      source: input.source ?? existingData?.source ?? "upload",
      ...buildTimestamps(existingData),
    });
  },
};

module.exports = MedicalReportModel;

const { PDFParse } = require("pdf-parse");

const env = require("../config/env");
const MedicalReportModel = require("../models/medicalReport.model");
const UserModel = require("../models/user.model");
const ApiError = require("../utils/apiError");
const {
  getFirestore,
  serializeDocument,
  serializeQuerySnapshot,
} = require("../utils/firestore");
const { saveChatMemory } = require("./chatMemory.service");

const MAX_TEXT_CHARS = 14000;
const MAX_PREVIEW_CHARS = 420;

async function getGroqClient() {
  if (!env.groq.apiKey) {
    throw new ApiError(503, "GROQ_API_KEY is required to parse medical reports");
  }

  const { default: Groq } = await import("groq-sdk");

  return new Groq({
    apiKey: env.groq.apiKey,
  });
}

function buildPreview(text = "") {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_PREVIEW_CHARS) || null;
}

async function summarizeReportText(text, fileName) {
  const normalizedText = String(text || "").trim();

  if (!normalizedText) {
    return "Report uploaded successfully. No readable report text could be extracted.";
  }

  const groq = await getGroqClient();
  const completion = await groq.chat.completions.create({
    model: env.groq.chatModel,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You summarize medical and health reports for a personal wellness assistant. Be concise, factual, and safe. Output 3-6 short bullet-style sentences in plain text covering the main findings, flagged values, diagnoses or risks if explicitly present, and practical follow-up topics the assistant can remember. Do not invent values. If the content is ambiguous, say that clearly.",
      },
      {
        role: "user",
        content: `Filename: ${fileName}\n\nReport text:\n${normalizedText.slice(0, MAX_TEXT_CHARS)}`,
      },
    ],
  });

  return completion.choices?.[0]?.message?.content?.trim() || "Report uploaded successfully.";
}

async function summarizeReportImage(imageUrl, promptText, fileName) {
  const groq = await getGroqClient();
  const completion = await groq.chat.completions.create({
    model: env.groq.visionModel,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You analyze uploaded medical report images for a health assistant. Extract only visible medical-report information. Summarize the main readings, names of tests or documents, abnormal findings if visible, and useful follow-up context. If the image is unreadable or not a medical report, say so clearly. Keep the response concise plain text.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              promptText ||
              `Summarize this uploaded medical report image named ${fileName}. Focus only on the report contents.`,
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
  });

  return completion.choices?.[0]?.message?.content?.trim() || "Report uploaded successfully.";
}

async function parseReportFile(file, title) {
  if (file.mimetype === "application/pdf") {
    const parser = new PDFParse({
      data: file.buffer,
    });

    try {
      const parsed = await parser.getText();
      const extractedText = parsed?.text || "";
      const preview = buildPreview(extractedText);
      const summary = await summarizeReportText(
        extractedText,
        title || file.originalname
      );

      return {
        summary,
        extractedTextPreview: preview,
      };
    } finally {
      await parser.destroy().catch(() => null);
    }
  }

  if (file.mimetype === "text/plain") {
    const text = file.buffer.toString("utf8");
    const summary = await summarizeReportText(text, title || file.originalname);

    return {
      summary,
      extractedTextPreview: buildPreview(text),
    };
  }

  if (file.mimetype.startsWith("image/")) {
    const summary = await summarizeReportImage(
      file.path,
      `Summarize this medical report image called ${title || file.originalname}. Focus on visible tests, values, diagnoses, and notable findings.`,
      title || file.originalname
    );

    return {
      summary,
      extractedTextPreview: null,
    };
  }

  return {
    summary: "Report uploaded successfully. Parsing is not available for this file type yet.",
    extractedTextPreview: null,
  };
}

async function createMedicalReport(userId, file, title) {
  const db = getFirestore();
  const userSnapshot = await db.collection(UserModel.collectionName).doc(userId).get();
  const user = serializeDocument(userSnapshot);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const parsed = await parseReportFile(file, title);
  const reportRef = db.collection(MedicalReportModel.collectionName).doc();
  const payload = MedicalReportModel.createPayload(reportRef.id, {
    userId,
    title: String(title || file.originalname || "Medical Report").trim(),
    fileName: file.originalname || "report",
    mimeType: file.mimetype,
    resourceType: file.cloudinary?.resourceType || "auto",
    secureUrl: file.path,
    publicId: file.cloudinary?.publicId,
    assetId: file.cloudinary?.assetId,
    bytes: file.cloudinary?.bytes || file.size || null,
    summary: parsed.summary,
    extractedTextPreview: parsed.extractedTextPreview,
    source: "upload",
  });

  await reportRef.set(payload);
  await saveChatMemory({
    userId,
    kind: "medical_report",
    role: "user",
    content: `Medical report ${payload.title}: ${payload.summary}`,
    metadata: {
      reportId: reportRef.id,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      secureUrl: payload.secureUrl,
    },
  });

  return serializeDocument(await reportRef.get());
}

async function listMedicalReports(userId) {
  const db = getFirestore();
  const snapshot = await db
    .collection(MedicalReportModel.collectionName)
    .where("userId", "==", userId)
    .get();

  return serializeQuerySnapshot(snapshot).sort((first, second) =>
    String(second.createdAt || "").localeCompare(String(first.createdAt || ""))
  );
}

module.exports = {
  createMedicalReport,
  listMedicalReports,
};

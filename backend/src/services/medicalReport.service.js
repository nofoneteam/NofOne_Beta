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
const MEDICAL_NUTRITION_UNITS = {
  protein: "g",
  carbs: "g",
  fat: "g",
  dietaryFibre: "g",
  starch: "g",
  sugar: "g",
  addedSugars: "g",
  sugarAlcohols: "g",
  otherCarbs: "g",
  netCarbs: "g",
  saturatedFat: "g",
  transFat: "g",
  polyunsaturatedFat: "g",
  monounsaturatedFat: "g",
  otherFat: "g",
  vitaminA: "IU",
  vitaminC: "mg",
  vitaminD: "IU",
  calcium: "mg",
  iron: "mg",
  potassium: "mg",
  sodium: "mg",
  cholesterol: "mg",
};

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

function normaliseInsightPayload(payload, reports) {
  if (!payload || typeof payload !== "object" || payload.hasInsight !== true) {
    return null;
  }

  const nutrientKey =
    typeof payload.nutrientKey === "string" ? payload.nutrientKey.trim() : "";
  const unit = MEDICAL_NUTRITION_UNITS[nutrientKey];
  const targetValue = Number(payload.targetValue);

  if (!unit || !Number.isFinite(targetValue) || targetValue <= 0) {
    return null;
  }

  const reportTitle =
    typeof payload.reportTitle === "string" && payload.reportTitle.trim()
      ? payload.reportTitle.trim()
      : reports[0]?.title || reports[0]?.fileName || null;
  const condition =
    typeof payload.condition === "string" && payload.condition.trim()
      ? payload.condition.trim()
      : null;
  const nutrientLabel =
    typeof payload.nutrientLabel === "string" && payload.nutrientLabel.trim()
      ? payload.nutrientLabel.trim()
      : nutrientKey;
  const rationale =
    typeof payload.rationale === "string" && payload.rationale.trim()
      ? payload.rationale.trim()
      : null;
  const evidence =
    typeof payload.evidence === "string" && payload.evidence.trim()
      ? payload.evidence.trim()
      : null;

  return {
    reportTitle,
    condition,
    nutrientKey,
    nutrientLabel,
    targetValue: Number(targetValue.toFixed(2)),
    unit,
    rationale,
    evidence,
  };
}

async function getMedicalNutritionInsight(userId) {
  const reports = await listMedicalReports(userId);

  if (!reports.length || !env.groq.apiKey) {
    return null;
  }

  const usableReports = reports
    .filter((report) => report.summary || report.extractedTextPreview)
    .slice(0, 3)
    .map((report) => ({
      title: report.title || report.fileName,
      summary: report.summary || null,
      extractedTextPreview: report.extractedTextPreview || null,
    }));

  if (!usableReports.length) {
    return null;
  }

  try {
    const groq = await getGroqClient();
    const completion = await groq.chat.completions.create({
      model: env.groq.chatModel,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You extract one diet-friendly nutrient focus from uploaded medical reports for a wellness dashboard. Return strict JSON with shape {"hasInsight": boolean, "reportTitle": string|null, "condition": string|null, "nutrientKey": string|null, "nutrientLabel": string|null, "targetValue": number|null, "rationale": string|null, "evidence": string|null}. Allowed nutrientKey values: protein, carbs, fat, dietaryFibre, starch, sugar, addedSugars, sugarAlcohols, otherCarbs, netCarbs, saturatedFat, transFat, polyunsaturatedFat, monounsaturatedFat, otherFat, vitaminA, vitaminC, vitaminD, calcium, iron, potassium, sodium, cholesterol. You may use any of these when clearly relevant to a disease, diagnosis, deficiency, abnormal lab pattern, or doctor-noted risk in the report. Prefer nutrient deficiencies or meaningful disease-linked nutrient tracking such as iron, calcium, potassium, vitamin A, vitamin D, sodium, cholesterol, fibre, or protein when supported. Only set hasInsight=true when the report text clearly supports a relevant condition or deficiency and a single nutrient target would be useful for day-to-day tracking. targetValue must be a conservative general daily dietary target, never a treatment dose, megadose, or prescription. If evidence is weak, ambiguous, unreadable, or not actionable, return hasInsight=false and null for the other fields.',
        },
        {
          role: "user",
          content: `Report snapshots:\n${JSON.stringify(usableReports, null, 2)}`,
        },
      ],
    });
    const content = completion.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content);
    return normaliseInsightPayload(parsed, usableReports);
  } catch {
    return null;
  }
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
  getMedicalNutritionInsight,
  listMedicalReports,
};

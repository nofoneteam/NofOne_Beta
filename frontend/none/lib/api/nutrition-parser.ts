export interface ParsedFoodItem {
    name: string;
    weight: number | string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface ParsedNutritionData {
    items: ParsedFoodItem[];
    totals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        dietaryFibre?: number;
        starch?: number;
        otherCarbs?: number;
        sugar?: number;
        addedSugars?: number;
        sugarAlcohols?: number;
        netCarbs?: number;
        saturatedFat?: number;
        transFat?: number;
        polyunsaturatedFat?: number;
        monounsaturatedFat?: number;
        otherFat?: number;
        cholesterol?: number;
        sodium?: number;
        calcium?: number;
        iron?: number;
        potassium?: number;
        vitaminA?: number;
        vitaminC?: number;
        vitaminD?: number;
        exerciseMinutes: number;
        exerciseCalories: number;
    };
    originalText: string;
    dishName?: string;
}

type NutritionTotals = ParsedNutritionData["totals"];

const STRUCTURED_NUTRIENT_LABELS: Array<{
    key: keyof NutritionTotals;
    patterns: RegExp[];
}> = [
    { key: "calories", patterns: [/^calories?$/i, /^energy$/i, /^kcal$/i] },
    { key: "protein", patterns: [/^protein$/i] },
    { key: "carbs", patterns: [/^carbs?$/i, /^total carbohydrates?$/i, /^carbohydrates?$/i] },
    { key: "dietaryFibre", patterns: [/^dietary fibre$/i, /^dietary fiber$/i, /^fibre$/i, /^fiber$/i] },
    { key: "starch", patterns: [/^starch$/i] },
    { key: "otherCarbs", patterns: [/^other carbs$/i, /^other carbohydrates$/i, /^remaining carbs$/i] },
    { key: "sugar", patterns: [/^sugars?$/i] },
    { key: "addedSugars", patterns: [/^added sugars?$/i] },
    { key: "sugarAlcohols", patterns: [/^sugar alcohols?$/i] },
    { key: "netCarbs", patterns: [/^net carbs?$/i] },
    { key: "fat", patterns: [/^fat$/i, /^fats$/i, /^total fat$/i] },
    { key: "saturatedFat", patterns: [/^saturated fat$/i] },
    { key: "transFat", patterns: [/^trans fat$/i] },
    { key: "polyunsaturatedFat", patterns: [/^polyunsaturated fat$/i] },
    { key: "monounsaturatedFat", patterns: [/^monounsaturated fat$/i] },
    { key: "otherFat", patterns: [/^other fat$/i, /^remaining fat$/i] },
    { key: "cholesterol", patterns: [/^cholesterol$/i] },
    { key: "sodium", patterns: [/^sodium$/i] },
    { key: "calcium", patterns: [/^calcium$/i] },
    { key: "iron", patterns: [/^iron$/i] },
    { key: "potassium", patterns: [/^potassium$/i] },
    { key: "vitaminA", patterns: [/^vitamin a$/i] },
    { key: "vitaminC", patterns: [/^vitamin c$/i] },
    { key: "vitaminD", patterns: [/^vitamin d$/i] },
    { key: "exerciseMinutes", patterns: [/^exercise minutes$/i, /^duration$/i] },
    { key: "exerciseCalories", patterns: [/^burned calories$/i, /^calories burned$/i] },
];

function toAverageValueFloat(first: number, second?: number): number {
    if (Number.isNaN(first)) {
        return 0;
    }

    if (second == null || Number.isNaN(second)) {
        return Number(first.toFixed(2));
    }

    return Number(((first + second) / 2).toFixed(2));
}

function extractFloatEstimate(text: string, patterns: RegExp[], fallback = 0): number {
    const normalised = text
        .replace(/~|≈/g, "")
        .replace(/\b(approximately|approx\.?|about|roughly|around|estimated|estimate[ds]?)[\s:]*/gi, "");

    for (const pattern of patterns) {
        const match = normalised.match(pattern);

        if (!match) continue;

        const first = Number.parseFloat((match[1] || "").replace(/,/g, ""));
        const second = match[2] ? Number.parseFloat(match[2].replace(/,/g, "")) : undefined;

        if (!Number.isNaN(first)) {
            return toAverageValueFloat(first, second);
        }
    }

    return fallback;
}

function extractOptionalFloat(text: string, patterns: RegExp[]): number | undefined {
    const val = extractFloatEstimate(text, patterns, -1);
    return val === -1 ? undefined : val;
}

function parseValueFromLine(line: string): number | undefined {
    const valueMatch = line
        .replace(/,/g, "")
        .replace(/~|≈/g, "")
        .match(/(-?\d+(?:\.\d+)?)(?:\s*[-–]\s*(-?\d+(?:\.\d+)?))?/);

    if (!valueMatch) {
        return undefined;
    }

    const first = Number.parseFloat(valueMatch[1]);
    const second = valueMatch[2] ? Number.parseFloat(valueMatch[2]) : undefined;

    if (Number.isNaN(first)) {
        return undefined;
    }

    return toAverageValueFloat(first, second);
}

function parseStructuredNutritionValues(text: string): Partial<NutritionTotals> {
    const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const parsed: Partial<NutritionTotals> = {};

    for (const rawLine of lines) {
        const line = rawLine
            .replace(/^[-*]\s*/, "")
            .replace(/^\d+\.\s*/, "")
            .replace(/\*\*/g, "")
            .trim();

        if (!line.includes(":")) {
            continue;
        }

        const separatorIndex = line.indexOf(":");
        const label = line.slice(0, separatorIndex).trim();
        const valueSegment = line.slice(separatorIndex + 1).trim();
        const numericValue = parseValueFromLine(valueSegment);

        if (numericValue == null) {
            continue;
        }

        const matchingDefinition = STRUCTURED_NUTRIENT_LABELS.find((definition) =>
            definition.patterns.some((pattern) => pattern.test(label))
        );

        if (matchingDefinition) {
            parsed[matchingDefinition.key] = numericValue as never;
        }
    }

    return parsed;
}

function pickNumericValue<T extends number | undefined>(...values: T[]): number | undefined {
    return values.find((value) => value != null && !Number.isNaN(value));
}

function roundNutritionValue(value: number): number {
    return Number(value.toFixed(2));
}

function sumDefinedValues(...values: Array<number | undefined>): number | undefined {
    const definedValues = values.filter((value): value is number => value != null && !Number.isNaN(value));

    if (!definedValues.length) {
        return undefined;
    }

    return roundNutritionValue(definedValues.reduce((sum, value) => sum + value, 0));
}

function normaliseNutritionTotals(input: ParsedNutritionData["totals"]): ParsedNutritionData["totals"] {
    const carbComponentSum = sumDefinedValues(
        input.dietaryFibre,
        input.starch,
        input.sugar,
        input.sugarAlcohols,
        input.otherCarbs,
    );
    const netCarbDerivedTotal = sumDefinedValues(
        input.netCarbs,
        input.dietaryFibre,
        input.sugarAlcohols,
    );
    const fatComponentSum = sumDefinedValues(
        input.saturatedFat,
        input.transFat,
        input.polyunsaturatedFat,
        input.monounsaturatedFat,
        input.otherFat,
    );

    return {
        ...input,
        carbs: carbComponentSum ?? netCarbDerivedTotal ?? input.carbs,
        fat: fatComponentSum ?? input.fat,
    };
}

function removeRecapSections(text: string): string {
    return text
        .split(/\n\s*\n/)
        .filter((section) => !/\b(earlier|previous|previously|recap|recalling|i recall|let'?s review)\b/i.test(section))
        .join("\n\n");
}

export function parseNutritionFromText(text: string): ParsedNutritionData | null {
    if (!text) return null;

    const currentTurnText = removeRecapSections(text);

    const hasFood = /(meal|food|eat|ate|breakfast|lunch|dinner|snack|dal|roti|curry|rice|bread|pasta|pizza|salad|soup|dosa|chole|paneer|chicken|fish|meat|vegetables?|fruits?|protein|carbs?|fats?|macr|ingredient|portion|serving|calorie|kcal|nutrition|nutrient|buttermilk|milk|curd|yogurt|egg|oats|banana)/i.test(currentTurnText);
    const hasExercise = /(?:exercise|burned|workout|exercised|ran|walked|cycled|trained|cardio|gym|run|walk)/i.test(currentTurnText);

    const hasMacroLines = /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*(?:\*\*)?(?:dish name|calories|protein|carbs?|fat|total carbohydrates|total fat|dietary fibre|dietary fiber|sugar|sodium|exercise minutes|burned calories)\b/i.test(currentTurnText);

    if (!hasFood && !hasMacroLines && !hasExercise) {
        return null;
    }

    const structuredValues = parseStructuredNutritionValues(currentTurnText);

    const exerciseMinutes = pickNumericValue(structuredValues.exerciseMinutes, extractFloatEstimate(currentTurnText, [
        /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*exercise minutes\**[^\d]*(\d+(?:\.\d+)?)/im,
        /(?:exercise minutes)[^\d]*(\d+(?:\.\d+)?)/i,
        /(\d+(?:\.\d+)?)\s*(?:min|minutes?)\s*(?:exercise|workout|exercised)/i,
    ])) ?? 0;
    const exerciseCalories = pickNumericValue(structuredValues.exerciseCalories, extractFloatEstimate(currentTurnText, [
        /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*burned calories\**[^\d]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?/im,
        /(?:burned calories|calories burned)[^\d]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?/i,
        /(?:burned)[^\d]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:kcal|calories?)/i,
    ])) ?? 0;

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let dishName: string | undefined;

    let dietaryFibre = structuredValues.dietaryFibre;
    let starch = structuredValues.starch;
    let otherCarbs = structuredValues.otherCarbs;
    let sugar = structuredValues.sugar;
    let addedSugars = structuredValues.addedSugars;
    let sugarAlcohols = structuredValues.sugarAlcohols;
    let netCarbs = structuredValues.netCarbs;
    let saturatedFat = structuredValues.saturatedFat;
    let transFat = structuredValues.transFat;
    let polyunsaturatedFat = structuredValues.polyunsaturatedFat;
    let monounsaturatedFat = structuredValues.monounsaturatedFat;
    let otherFat = structuredValues.otherFat;
    let cholesterol = structuredValues.cholesterol;
    let sodium = structuredValues.sodium;
    let calcium = structuredValues.calcium;
    let iron = structuredValues.iron;
    let potassium = structuredValues.potassium;
    let vitaminA = structuredValues.vitaminA;
    let vitaminC = structuredValues.vitaminC;
    let vitaminD = structuredValues.vitaminD;

    if (hasFood || hasMacroLines) {
        const dishMatch = currentTurnText.match(/(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*dish name\**[\s:*_-]*([^\n]+)/i)
            || currentTurnText.match(/(?:^|\n)\s*#{1,6}\s+([^\n]+)/);
        if (dishMatch) {
            dishName = dishMatch[1].replace(/\*+/g, '').trim();
        }

        const foodText = currentTurnText.replace(/^.*(?:burned|exercise minutes).*$/gim, "");

        totalCalories = pickNumericValue(structuredValues.calories, extractFloatEstimate(foodText, [
            /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*calories\**[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?/im,
            /(?:total calories|calories|kcal|cal)[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?/i,
            /(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:kcal|calories|cal)\b/i,
            /(\d{3,4}(?:\.\d+)?)\s*(?:total)?\s*(?:kcal|calories|cal)?/i,
        ])) ?? 0;
        totalProtein = pickNumericValue(structuredValues.protein, extractFloatEstimate(foodText, [
            /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*protein\**[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?/im,
            /(?:total protein|protein)[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?/i,
            /(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?\s*protein/i,
        ])) ?? 0;
        totalCarbs = pickNumericValue(structuredValues.carbs, extractFloatEstimate(foodText, [
            /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*(?:carbs|carbohydrates|total carbohydrates)\**[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?/im,
            /(?:total carbs|carbs|total carbohydrates|carbohydrates)[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?/i,
            /(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?\s*(?:carbs|carbohydrates|total carbohydrates)/i,
        ])) ?? 0;
        totalFat = pickNumericValue(structuredValues.fat, extractFloatEstimate(foodText, [
            /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*(?:fat|total fat)\**[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?/im,
            /(?:total fat|fat|fats)[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?/i,
            /(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?\s*(?:fat|fats|total fat)/i,
        ])) ?? 0;

        dietaryFibre = pickNumericValue(dietaryFibre, extractOptionalFloat(foodText, [/(?:fiber|fibre|dietary fibre)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        starch = pickNumericValue(starch, extractOptionalFloat(foodText, [/(?:starch)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        otherCarbs = pickNumericValue(otherCarbs, extractOptionalFloat(foodText, [/(?:other carbs|other carbohydrates|remaining carbs)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        sugar = pickNumericValue(sugar, extractOptionalFloat(foodText, [/(?:sugar)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        addedSugars = pickNumericValue(addedSugars, extractOptionalFloat(foodText, [/(?:added sugar[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        sugarAlcohols = pickNumericValue(sugarAlcohols, extractOptionalFloat(foodText, [/(?:sugar alcohol[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        netCarbs = pickNumericValue(netCarbs, extractOptionalFloat(foodText, [/(?:net carb[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        
        saturatedFat = pickNumericValue(saturatedFat, extractOptionalFloat(foodText, [/(?:saturated fat[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        transFat = pickNumericValue(transFat, extractOptionalFloat(foodText, [/(?:trans fat[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        polyunsaturatedFat = pickNumericValue(polyunsaturatedFat, extractOptionalFloat(foodText, [/(?:polyunsaturated fat[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        monounsaturatedFat = pickNumericValue(monounsaturatedFat, extractOptionalFloat(foodText, [/(?:monounsaturated fat[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        otherFat = pickNumericValue(otherFat, extractOptionalFloat(foodText, [/(?:other fat|remaining fat)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        
        cholesterol = pickNumericValue(cholesterol, extractOptionalFloat(foodText, [/(?:cholesterol)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        sodium = pickNumericValue(sodium, extractOptionalFloat(foodText, [/(?:sodium)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        calcium = pickNumericValue(calcium, extractOptionalFloat(foodText, [/(?:calcium)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        iron = pickNumericValue(iron, extractOptionalFloat(foodText, [/(?:iron)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        potassium = pickNumericValue(potassium, extractOptionalFloat(foodText, [/(?:potassium)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        
        vitaminA = pickNumericValue(vitaminA, extractOptionalFloat(foodText, [/(?:vitamin a)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        vitaminC = pickNumericValue(vitaminC, extractOptionalFloat(foodText, [/(?:vitamin c)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
        vitaminD = pickNumericValue(vitaminD, extractOptionalFloat(foodText, [/(?:vitamin d)[\s:*_-]*(\d+(?:\.\d+)?)/i]));
    }

    if (
        totalCalories === 0 &&
        totalProtein === 0 &&
        totalCarbs === 0 &&
        totalFat === 0 &&
        exerciseMinutes === 0 &&
        exerciseCalories === 0
    ) {
        return null;
    }

    const items: ParsedFoodItem[] = [];

    return {
        items,
        totals: normaliseNutritionTotals({
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
            dietaryFibre,
            starch,
            otherCarbs,
            sugar,
            addedSugars,
            sugarAlcohols,
            netCarbs,
            saturatedFat,
            transFat,
            polyunsaturatedFat,
            monounsaturatedFat,
            otherFat,
            cholesterol,
            sodium,
            calcium,
            iron,
            potassium,
            vitaminA,
            vitaminC,
            vitaminD,
            exerciseMinutes: exerciseMinutes,
            exerciseCalories: exerciseCalories,
        }),
        originalText: text,
        dishName,
    };
}

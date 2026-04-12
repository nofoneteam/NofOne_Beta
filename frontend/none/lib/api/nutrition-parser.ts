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
        exerciseMinutes: number;
        exerciseCalories: number;
    };
    originalText: string;
}

function toAverageValue(first: number, second?: number): number {
    if (Number.isNaN(first)) {
        return 0;
    }

    if (second == null || Number.isNaN(second)) {
        return Math.round(first);
    }

    return Math.round((first + second) / 2);
}

function extractEstimate(
    text: string,
    patterns: RegExp[],
): number {
    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (!match) {
            continue;
        }

        const first = Number.parseInt((match[1] || "").replace(/,/g, ""), 10);
        const second = match[2]
            ? Number.parseInt(match[2].replace(/,/g, ""), 10)
            : undefined;

        if (!Number.isNaN(first)) {
            return toAverageValue(first, second);
        }
    }

    return 0;
}

function extractLastEstimate(
    text: string,
    patterns: RegExp[],
): number {
    for (const pattern of patterns) {
        const matches = Array.from(text.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`)));

        if (matches.length === 0) {
            continue;
        }

        const match = matches[matches.length - 1];
        const first = Number.parseInt((match[1] || "").replace(/,/g, ""), 10);
        const second = match[2]
            ? Number.parseInt(match[2].replace(/,/g, ""), 10)
            : undefined;

        if (!Number.isNaN(first)) {
            return toAverageValue(first, second);
        }
    }

    return 0;
}

/**
 * Extracts nutritional data from the assistant's standard output.
 * It looks for typical markdown patterns like lists or tables of macros.
 */
export function parseNutritionFromText(text: string): ParsedNutritionData | null {
    if (!text) return null;

    const hasCalories = /calories?/i.test(text) || /kcal/i.test(text);
    const hasMacros = /(protein|carbs?|fats?)/i.test(text);
    const hasExercise = /(?:exercise|burned|workout)/i.test(text);

    // If it's a general text not talking about food macros or exercise, don't parse it as a block
    if (!hasCalories && !hasMacros && !hasExercise) {
        return null;
    }

    const exerciseMinutes = extractLastEstimate(text, [
        /(?:exercise minutes)[^\d]*(\d+)/i,
        /(\d+)\s*(?:min|minutes?)\s*(?:exercise|workout)/i,
    ]);
    const exerciseCalories = extractLastEstimate(text, [
        /(?:burned calories|calories burned)[^\d]*(\d+)(?:\s*[-–]\s*(\d+))?/i,
        /(?:burned)[^\d]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:kcal|calories?)/i,
    ]);

    // Strip out exercise lines to prevent them from confusing the food macro parser
    const foodText = text.replace(/^.*(?:burned|exercise minutes).*$/gim, "");

    const totalCalories = extractEstimate(foodText, [
        /(?:total calories|calories|kcal)[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?/i,
        /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:kcal|calories?)/i,
    ]);
    const totalProtein = extractEstimate(foodText, [
        /(?:total protein|protein)[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?/i,
        /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?\s*protein/i,
    ]);
    const totalCarbs = extractEstimate(foodText, [
        /(?:total carbs|carbs|carbohydrates)[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?/i,
        /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?\s*(?:carbs|carbohydrates)/i,
    ]);
    const totalFat = extractEstimate(foodText, [
        /(?:total fat|fat|fats)[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?/i,
        /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?\s*(?:fat|fats)/i,
    ]);

    // If we found absolute zero totals everywhere, it might not be a valid nutrition response
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

    // Attempt to parse food items (Basic extraction for typical bulleted lists: - Item (100g): 100 kcal, x protein, etc)
    const items: ParsedFoodItem[] = [];

    // We skip complex item parsing for now and just rely on the totals,
    // but we provide the structure for the modal to display.

    return {
        items,
        totals: {
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
            exerciseMinutes: exerciseMinutes,
            exerciseCalories: exerciseCalories,
        },
        originalText: text,
    };
}

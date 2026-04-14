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

function removeRecapSections(text: string): string {
    return text
        .split(/\n\s*\n/)
        .filter((section) => !/\b(earlier|previous|previously|recap|recalling|i recall|let'?s review)\b/i.test(section))
        .join("\n\n");
}

/**
 * Extracts nutritional data from the assistant's standard output.
 * It looks for typical markdown patterns like lists or tables of macros.
 */
export function parseNutritionFromText(text: string): ParsedNutritionData | null {
    if (!text) return null;

    const currentTurnText = removeRecapSections(text);

    const hasFood = /(meal|food|eat|ate|breakfast|lunch|dinner|snack|dal|roti|curry|rice|bread|pasta|pizza|salad|soup|dosa|chole|paneer|chicken|fish|meat|vegetables?|fruits?|protein|carbs?|fats?|macr)/i.test(currentTurnText);
    const hasMacros = /(protein|carbs?|fats?)/i.test(currentTurnText);
    const hasExercise = /(?:exercise|burned|workout|exercised|ran|walked|cycled|trained|cardio|gym|run|walk)/i.test(currentTurnText);

    // If it's a general text not talking about food or exercise, don't parse it as a block
    if (!hasFood && !hasExercise) {
        return null;
    }

    const exerciseMinutes = extractEstimate(currentTurnText, [
        /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*exercise minutes\**[^\d]*(\d+)/im,
        /(?:exercise minutes)[^\d]*(\d+)/i,
        /(\d+)\s*(?:min|minutes?)\s*(?:exercise|workout|exercised)/i,
    ]);
    const exerciseCalories = extractEstimate(currentTurnText, [
        /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*burned calories\**[^\d]*(\d+)(?:\s*[-–]\s*(\d+))?/im,
        /(?:burned calories|calories burned)[^\d]*(\d+)(?:\s*[-–]\s*(\d+))?/i,
        /(?:burned)[^\d]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:kcal|calories?)/i,
    ]);

    // If response is only about exercise (no food keywords), don't parse food calories
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    // Check if this is purely exercise-only response (has exercise keywords but no food/meal keywords)
    const isPurelyExercise = hasExercise && !/(meal|food|eat|ate|breakfast|lunch|dinner|snack|dal|roti|curry|rice|bread|pasta|pizza|salad|soup|dosa|chole|paneer|chicken|fish|meat|vegetables?|fruits?)/i.test(currentTurnText);

    if (hasFood && !isPurelyExercise) {
        // Strip out exercise lines to prevent them from confusing the food macro parser
        const foodText = currentTurnText.replace(/^.*(?:burned|exercise minutes).*$/gim, "");

        totalCalories = extractEstimate(foodText, [
            /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*calories\**[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?/im,
            /(?:total calories|kcal)[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?/i,
            /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:kcal)/i,
        ]);
        totalProtein = extractEstimate(foodText, [
            /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*protein\**[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?/im,
            /(?:total protein|protein)[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?/i,
            /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?\s*protein/i,
        ]);
        totalCarbs = extractEstimate(foodText, [
            /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*(?:carbs|carbohydrates)\**[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?/im,
            /(?:total carbs|carbs|carbohydrates)[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?/i,
            /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?\s*(?:carbs|carbohydrates)/i,
        ]);
        totalFat = extractEstimate(foodText, [
            /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*fat\**[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?/im,
            /(?:total fat|fat|fats)[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?/i,
            /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?\s*(?:fat|fats)/i,
        ]);
    }

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

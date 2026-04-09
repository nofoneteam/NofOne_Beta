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

/**
 * Extracts nutritional data from the assistant's standard output.
 * It looks for typical markdown patterns like lists or tables of macros.
 */
export function parseNutritionFromText(text: string): ParsedNutritionData | null {
    if (!text) return null;

    // For this initial parser, we look for key terms that strongly indicate a nutrition breakdown
    const hasCalories = /calories?/i.test(text) || /kcal/i.test(text);
    const hasMacros = /(protein|carbs?|fats?)/i.test(text);

    // If it's a general text not talking about food macros, don't parse it as a nutrition block
    if (!hasCalories || !hasMacros) {
        return null;
    }

    const totalCalories = extractEstimate(text, [
        /(?:total calories|calories|kcal)[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?/i,
        /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:kcal|calories?)/i,
    ]);
    const totalProtein = extractEstimate(text, [
        /(?:total protein|protein)[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?/i,
        /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?\s*protein/i,
    ]);
    const totalCarbs = extractEstimate(text, [
        /(?:total carbs|carbs|carbohydrates)[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?/i,
        /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?\s*(?:carbs|carbohydrates)/i,
    ]);
    const totalFat = extractEstimate(text, [
        /(?:total fat|fat|fats)[\s:*_-]*(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?/i,
        /(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:g|grams)?\s*(?:fat|fats)/i,
    ]);

    // If we found absolute zero totals, it might not be a valid nutrition response,
    // but if we at least found Calories > 0, we can show the chip.
    if (totalCalories === 0 && totalProtein === 0 && totalCarbs === 0 && totalFat === 0) {
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
        },
        originalText: text,
    };
}

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
        sugar?: number;
        addedSugars?: number;
        sugarAlcohols?: number;
        netCarbs?: number;
        saturatedFat?: number;
        transFat?: number;
        polyunsaturatedFat?: number;
        monounsaturatedFat?: number;
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

function removeRecapSections(text: string): string {
    return text
        .split(/\n\s*\n/)
        .filter((section) => !/\b(earlier|previous|previously|recap|recalling|i recall|let'?s review)\b/i.test(section))
        .join("\n\n");
}

export function parseNutritionFromText(text: string): ParsedNutritionData | null {
    if (!text) return null;

    const currentTurnText = removeRecapSections(text);

    const hasFood = /(meal|food|eat|ate|breakfast|lunch|dinner|snack|dal|roti|curry|rice|bread|pasta|pizza|salad|soup|dosa|chole|paneer|chicken|fish|meat|vegetables?|fruits?|protein|carbs?|fats?|macr|ingredient|portion|serving|calorie|kcal)/i.test(currentTurnText);
    const hasMacros = /(protein|carbs?|fats?|calories|kcal)/i.test(currentTurnText);
    const hasExercise = /(?:exercise|burned|workout|exercised|ran|walked|cycled|trained|cardio|gym|run|walk)/i.test(currentTurnText);

    const hasMacroLines = /[-*]\s*(?:calories|protein|carbs?|fat)[\s:]/i.test(currentTurnText);

    if (!hasFood && !hasMacroLines && !hasExercise) {
        return null;
    }

    const exerciseMinutes = extractFloatEstimate(currentTurnText, [
        /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*exercise minutes\**[^\d]*(\d+(?:\.\d+)?)/im,
        /(?:exercise minutes)[^\d]*(\d+(?:\.\d+)?)/i,
        /(\d+(?:\.\d+)?)\s*(?:min|minutes?)\s*(?:exercise|workout|exercised)/i,
    ]);
    const exerciseCalories = extractFloatEstimate(currentTurnText, [
        /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*burned calories\**[^\d]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?/im,
        /(?:burned calories|calories burned)[^\d]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?/i,
        /(?:burned)[^\d]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:kcal|calories?)/i,
    ]);

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let dishName: string | undefined;

    let dietaryFibre, sugar, addedSugars, sugarAlcohols, netCarbs;
    let saturatedFat, transFat, polyunsaturatedFat, monounsaturatedFat;
    let cholesterol, sodium, calcium, iron, potassium;
    let vitaminA, vitaminC, vitaminD;

    if (hasFood || hasMacroLines) {
        const dishMatch = currentTurnText.match(/(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*dish name\**[\s:*_-]*([^\n]+)/i);
        if (dishMatch) {
            dishName = dishMatch[1].replace(/\*+/g, '').trim();
        }

        const foodText = currentTurnText.replace(/^.*(?:burned|exercise minutes).*$/gim, "");

        totalCalories = extractFloatEstimate(foodText, [
            /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*calories\**[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?/im,
            /(?:total calories|calories|kcal|cal)[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?/i,
            /(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:kcal|calories|cal)\b/i,
            /(\d{3,4}(?:\.\d+)?)\s*(?:total)?\s*(?:kcal|calories|cal)?/i,
        ]);
        totalProtein = extractFloatEstimate(foodText, [
            /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*protein\**[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?/im,
            /(?:total protein|protein)[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?/i,
            /(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?\s*protein/i,
        ]);
        totalCarbs = extractFloatEstimate(foodText, [
            /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*(?:carbs|carbohydrates|total carbohydrates)\**[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?/im,
            /(?:total carbs|carbs|total carbohydrates|carbohydrates)[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?/i,
            /(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?\s*(?:carbs|carbohydrates|total carbohydrates)/i,
        ]);
        totalFat = extractFloatEstimate(foodText, [
            /(?:^|\n)\s*(?:[-*]|\d+\.)?\s*\**\s*(?:fat|total fat)\**[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?/im,
            /(?:total fat|fat|fats)[\s:*_-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?/i,
            /(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:g|grams)?\s*(?:fat|fats|total fat)/i,
        ]);

        dietaryFibre = extractOptionalFloat(foodText, [/(?:fiber|fibre|dietary fibre)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        sugar = extractOptionalFloat(foodText, [/(?:sugar)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        addedSugars = extractOptionalFloat(foodText, [/(?:added sugar[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        sugarAlcohols = extractOptionalFloat(foodText, [/(?:sugar alcohol[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        netCarbs = extractOptionalFloat(foodText, [/(?:net carb[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        
        saturatedFat = extractOptionalFloat(foodText, [/(?:saturated fat[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        transFat = extractOptionalFloat(foodText, [/(?:trans fat[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        polyunsaturatedFat = extractOptionalFloat(foodText, [/(?:polyunsaturated fat[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        monounsaturatedFat = extractOptionalFloat(foodText, [/(?:monounsaturated fat[s]?)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        
        cholesterol = extractOptionalFloat(foodText, [/(?:cholesterol)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        sodium = extractOptionalFloat(foodText, [/(?:sodium)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        calcium = extractOptionalFloat(foodText, [/(?:calcium)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        iron = extractOptionalFloat(foodText, [/(?:iron)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        potassium = extractOptionalFloat(foodText, [/(?:potassium)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        
        vitaminA = extractOptionalFloat(foodText, [/(?:vitamin a)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        vitaminC = extractOptionalFloat(foodText, [/(?:vitamin c)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
        vitaminD = extractOptionalFloat(foodText, [/(?:vitamin d)[\s:*_-]*(\d+(?:\.\d+)?)/i]);
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
        totals: {
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
            dietaryFibre,
            sugar,
            addedSugars,
            sugarAlcohols,
            netCarbs,
            saturatedFat,
            transFat,
            polyunsaturatedFat,
            monounsaturatedFat,
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
        },
        originalText: text,
        dishName,
    };
}

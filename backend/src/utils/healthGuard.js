const HEALTH_TOPIC_PATTERN =
  /\b(health|healthy|fitness|fit|nutrition|nutritional|nutrient|nutrients|calorie|calories|macro|macros|carb|carbs|carbohydrate|carbohydrates|protein|fat|fats|fiber|fibre|meal|food|diet|exercise|workout|training|muscle|weight|bmi|hydration|water|sleep|vitamin|vitamins|mineral|minerals|body fat|steps|wellness|glucose|blood pressure|cholesterol|diabetes|fasting|intermittent|keto|vegan|vegetarian|gluten|lactose|supplement|multivitamin|tablet|capsule|pill|protein shake|gym|cardio|steps|running|walking|walk|run|jog|cycling|cycle|yoga|meditation|stress|recovery|injury|pain|inflammation|dal|makhni|roti|tandoori|dosa|chole|paneer|chicken|fish|egg|eggs|meat|vegetables|fruits|rice|bread|pasta|pizza|salad|soup|curry|milk|curd|yogurt|yoghurt|buttermilk|lassi|tea|coffee|juice|oats|banana|apple|ate|drank|took)\b/i;
const GENERAL_ALLOWED_PATTERN =
  /\b(hi|hello|hey|hii|hiii|good morning|good afternoon|good evening|thanks|thank you|ok|okay|cool|great|nice|who are you|what can you do|help|my name is|i am|i'm)\b/i;
const MEAL_LOG_PATTERN =
  /\b(i had|i ate|i drank|i took|ate|had|drank|took|for breakfast|for lunch|for dinner|for snack|my breakfast|my lunch|my dinner|my meal|today i had)\b/i;
const CONTEXTUAL_FOLLOW_UP_PATTERN =
  /\b(it|this|that|these|those|same|again|continue|continued|previous|earlier|before|last|above|here|there|also|too|them|they)\b/i;
const EXPLICIT_RECALL_PATTERN =
  /\b(what did i|what all i|what have i|what i (ate|had|drank|consumed|eaten)|my (meals?|food|diet|intake|log|logs)|today('s| i)|show me|list my|recap|review)\b/i;
const STORED_CONTEXT_PATTERN =
  /\b(report|reports|record|records|medical|lab|labs|bloodwork|blood work|scan|test|tests|history|past|context|summary|condition|allergy|allergies|profile)\b/i;
const ABUSIVE_PATTERN =
  /\b(fuck|fucking|shit|bitch|asshole|bastard|mc|bc|madarchod|behenchod|chutiya|gandu|randi|harami|kamine|sala|haramkhor|idiot|stupid|dumb|moron|loser|kill|murder|rape|sex|porn|nude|naked|hack|scam|spam|jailbreak|ignore previous|act as|pretend you are|you are now|dan mode|dev mode|bypass|override instructions)\b/i;
const DISALLOWED_ASSISTANT_TONE_PATTERN =
  /\b(fuck|fucking|shit|bitch|asshole|bastard|mc|bc|madarchod|behenchod|chutiya|gandu|randi|harami|kamine|sala|haramkhor|idiot|stupid|dumb|moron|loser)\b/i;
const MIN_MEANINGFUL_LENGTH = 4;
const QUANTITY_UNIT_PATTERN =
  /\b\d+(?:\.\d+)?\s*(?:g|gm|grams?|kg|kgs|ml|l|litre|litres|liter|liters|cup|cups|tbsp|tsp|teaspoon|teaspoons|tablespoon|tablespoons|slice|slices|piece|pieces|roti|rotis|chapati|chapatis|egg|eggs|glass|glasses|bowl|bowls|plate|plates|serving|servings|min|mins|minute|minutes|hr|hrs|hour|hours|km|kilometer|kilometers|mile|miles|steps?)\b/i;
const FOOD_ITEM_PATTERN =
  /\b(dal|makhni|roti|chapati|paratha|tandoori|dosa|idli|uttapam|chole|paneer|rajma|sabzi|poha|upma|khichdi|biryani|pulao|khichdi|samosa|kachori|pakora|vada|pav|pav bhaji|misal|thepla|dhokla|jalebi|halwa|kheer|chutney|pickle|chawal|naan|kulcha|bhatura|wrap|roll|burger|fries|noodles|momos|dumplings|omelette|omelet|chicken|fish|egg|eggs|meat|mutton|beef|pork|soyabean|soybean|soya|tofu|lentils?|beans?|chickpeas?|vegetable|vegetables|fruit|fruits|rice|bread|pasta|pizza|salad|soup|curry|milk|curd|yogurt|yoghurt|buttermilk|lassi|tea|coffee|juice|oats|banana|apple|orange|mango|grapes|smoothie|shake|sandwich|almonds?|peanuts?|walnuts?)\b/i;
const EXERCISE_ITEM_PATTERN =
  /\b(exercise|workout|training|gym|cardio|walk|walked|walking|run|ran|running|jog|jogged|jogging|cycle|cycled|cycling|swim|swimming|yoga|stretching|tennis|badminton|football|cricket|lifted|lifting|steps?)\b/i;
const SINGLE_NUTRIENT_PATTERN =
  /\b(vitamin\s*[a-z0-9+-]+|vitamins\s*[a-z0-9+-]+|b12|b-12|folate|folic acid|iron|calcium|potassium|magnesium|zinc|sodium|cholesterol|protein|carbs?|fat|fats|fiber|fibre|omega\s*3|omega-3|mineral|mineral[s]?)\b/i;

function messageMentionsHealthTopic(message = "") {
  return HEALTH_TOPIC_PATTERN.test(message);
}

function messageIsAllowedGeneralConversation(message = "") {
  return GENERAL_ALLOWED_PATTERN.test(message);
}

function messageLooksLikeMealLog(message = "") {
  return MEAL_LOG_PATTERN.test(message);
}

function messageLooksLikeQuantifiedHealthLog(message = "") {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    return false;
  }

  return (
    QUANTITY_UNIT_PATTERN.test(normalized) &&
    (FOOD_ITEM_PATTERN.test(normalized) ||
      EXERCISE_ITEM_PATTERN.test(normalized) ||
      /\b(calories?|protein|carbs?|fat|fibre|fiber|sugar|sodium|cholesterol|hydration|water)\b/i.test(normalized))
  );
}

function messageLooksLikeGeneralNutritionQuery(message = "") {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    return false;
  }

  return (
    FOOD_ITEM_PATTERN.test(normalized) ||
    SINGLE_NUTRIENT_PATTERN.test(normalized) ||
    /\b(how many|how much|nutrition|nutritional|nutrients?|macros?|calories?|protein|carbs?|fat|fats|fiber|fibre|sugar|sodium|cholesterol|vitamin|minerals?)\b/i.test(normalized)
  );
}

function messageLooksLikeStandaloneFoodName(message = "") {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    return false;
  }

  if (
    messageLooksLikeMealLog(normalized) ||
    messageLooksLikeQuantifiedHealthLog(normalized) ||
    messageIsAllowedGeneralConversation(normalized) ||
    ABUSIVE_PATTERN.test(normalized)
  ) {
    return false;
  }

  const words = normalized
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const lettersOnly = normalized.replace(/[^a-z]/g, "");

  if (words.length === 0 || words.length > 7) {
    return false;
  }

  if (!FOOD_ITEM_PATTERN.test(normalized) && !SINGLE_NUTRIENT_PATTERN.test(normalized)) {
    return false;
  }

  if (lettersOnly.length < MIN_MEANINGFUL_LENGTH) {
    return false;
  }

  if (words.some((word) => word.length < 2)) {
    return false;
  }

  if (words.every((word) => word.length <= 20 && /[aeiou]/.test(word))) {
    return true;
  }

  return false;
}

function normalizeMessage(message = "") {
  return String(message).trim().toLowerCase();
}

function isLikelyNonsense(message = "") {
  const normalized = normalizeMessage(message);
  const lettersOnly = normalized.replace(/[^a-z]/g, "");

  if (!lettersOnly) {
    return true;
  }

  if (
    messageIsAllowedGeneralConversation(normalized) ||
    messageLooksLikeMealLog(normalized) ||
    messageLooksLikeQuantifiedHealthLog(normalized) ||
    messageLooksLikeGeneralNutritionQuery(normalized) ||
    messageMentionsHealthTopic(normalized) ||
    messageLooksLikeStandaloneFoodName(normalized)
  ) {
    return false;
  }

  if (lettersOnly.length < MIN_MEANINGFUL_LENGTH) {
    return true;
  }

  const uniqueLetters = new Set(lettersOnly).size;
  const vowelCount = (lettersOnly.match(/[aeiou]/g) || []).length;
  const repeatedRuns = /(.)\1{3,}/.test(lettersOnly);

  return repeatedRuns || uniqueLetters <= 2 || vowelCount === 0;
}

function isAbusiveOrNonsensicalMessage(message = "") {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    return true;
  }

  return ABUSIVE_PATTERN.test(normalized) || isLikelyNonsense(normalized);
}

function isAbusiveMessage(message = "") {
  return ABUSIVE_PATTERN.test(normalizeMessage(message));
}

function isHealthDomainRequest(payload, previousMessages = []) {
  if (payload.type === "image") {
    if (!payload.message) {
      return true;
    }

    return (
      messageMentionsHealthTopic(payload.message) ||
      messageLooksLikeMealLog(payload.message) ||
      messageLooksLikeQuantifiedHealthLog(payload.message) ||
      messageLooksLikeGeneralNutritionQuery(payload.message) ||
      messageLooksLikeStandaloneFoodName(payload.message) ||
      messageIsAllowedGeneralConversation(payload.message)
    );
  }

  if (
    messageMentionsHealthTopic(payload.message) ||
    messageLooksLikeMealLog(payload.message) ||
    messageLooksLikeQuantifiedHealthLog(payload.message) ||
    messageLooksLikeGeneralNutritionQuery(payload.message) ||
    messageLooksLikeStandaloneFoodName(payload.message) ||
    messageIsAllowedGeneralConversation(payload.message)
  ) {
    return true;
  }

  if (
    payload.message &&
    !isAbusiveOrNonsensicalMessage(payload.message) &&
    payload.message.trim().length <= 120 &&
    previousMessages.some((message) => messageMentionsHealthTopic(message.message))
  ) {
    return true;
  }

  return false;
}

function messageNeedsConversationContext(message = "") {
  const normalized = normalizeMessage(message);

  if (!normalized || normalized.length <= 3) {
    return false;
  }

  // If the message is a clear standalone food/supplement log entry, it does NOT
  // need conversation context even if it contains a pronoun like "it" or "one".
  if (messageLooksLikeStandaloneFoodLog(normalized)) {
    return false;
  }

  return (
    CONTEXTUAL_FOLLOW_UP_PATTERN.test(normalized) ||
    EXPLICIT_RECALL_PATTERN.test(normalized) ||
    STORED_CONTEXT_PATTERN.test(normalized)
  );
}

function messageLooksLikeStandaloneFoodLog(message = "") {
  const normalized = normalizeMessage(message);
  if (!normalized) return false;

  // Messages like "I had one multivitamin", "took potassium tablet",
  // "100g paneer", "2 eggs" are standalone food/supplement entries.
  // They should NOT pull in previous conversation context.
  const isLog = messageLooksLikeMealLog(normalized) ||
    messageLooksLikeQuantifiedHealthLog(normalized);
  const isFoodOrSupplement = FOOD_ITEM_PATTERN.test(normalized) ||
    SINGLE_NUTRIENT_PATTERN.test(normalized) ||
    /\b(multivitamin|supplement|tablet|capsule|pill)\b/i.test(normalized);
  const isRecall = EXPLICIT_RECALL_PATTERN.test(normalized);

  return (isLog || isFoodOrSupplement) && !isRecall;
}

function shouldKeepReplyFocusedOnCurrentMessage(message = "") {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    return false;
  }

  // Standalone food/supplement logs should stay focused on current message
  if (messageLooksLikeStandaloneFoodLog(normalized)) {
    return true;
  }

  return (
    messageIsAllowedGeneralConversation(normalized) &&
    !messageNeedsConversationContext(normalized) &&
    !messageMentionsHealthTopic(normalized) &&
    !messageLooksLikeMealLog(normalized)
  );
}

function hasDisallowedAssistantTone(message = "") {
  return DISALLOWED_ASSISTANT_TONE_PATTERN.test(normalizeMessage(message));
}

function buildHealthDomainRefusal() {
  return "Can you express it a bit more clearly? If this is a food item or nutrient, send the name, serving size, or whether you had it, and I’ll help from there.";
}

function buildInvalidMessageRefusal() {
  return "That's not something I'm here for. I'm a health assistant and I only respond to clear, respectful questions about health, nutrition, meals, exercise, hydration, or wellness. Please send a proper health-related question.";
}

function buildAbusiveLanguageRefusal() {
  return "I can help with health and wellness questions, but I won't respond to abusive or insulting language. Please rephrase respectfully.";
}

module.exports = {
  isHealthDomainRequest,
  isAbusiveMessage,
  isAbusiveOrNonsensicalMessage,
  messageNeedsConversationContext,
  hasDisallowedAssistantTone,
  buildHealthDomainRefusal,
  buildInvalidMessageRefusal,
  buildAbusiveLanguageRefusal,
  shouldKeepReplyFocusedOnCurrentMessage,
};

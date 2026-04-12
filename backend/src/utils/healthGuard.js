const HEALTH_TOPIC_PATTERN =
  /\b(health|healthy|fitness|fit|nutrition|nutritional|calorie|calories|macro|macros|carb|carbs|protein|fat|fats|fiber|meal|food|diet|exercise|workout|training|muscle|weight|bmi|hydration|water|sleep|vitamin|vitamins|mineral|minerals|body fat|steps|wellness|glucose|blood pressure|cholesterol|diabetes|fasting|intermittent|keto|vegan|vegetarian|gluten|lactose|supplement|protein shake|gym|cardio|steps|running|walking|yoga|meditation|stress|recovery|injury|pain|inflammation)\b/i;
const GENERAL_ALLOWED_PATTERN =
  /\b(hi|hello|hey|hii|hiii|good morning|good afternoon|good evening|thanks|thank you|ok|okay|cool|great|nice|who are you|what can you do|help|my name is|i am|i'm)\b/i;
const MEAL_LOG_PATTERN =
  /\b(i had|i ate|i drank|ate|had|drank|for breakfast|for lunch|for dinner|for snack|my breakfast|my lunch|my dinner|my meal|today i had)\b/i;
const STANDALONE_FOOD_NAME_PATTERN =
  /\b(chole|bhature|bhatura|dosa|idli|poha|upma|paratha|pizza|burger|pasta|biryani|khichdi|paneer|roti|chapati|naan|dal|rice|rajma|samosa|sandwich|noodles|momos|omelette|omelet|salad|oats|shake|smoothie|coffee|tea|juice)\b/i;
const CONTEXTUAL_FOLLOW_UP_PATTERN =
  /\b(it|this|that|these|those|same|again|continue|continued|previous|earlier|before|last|above|here|there|also|too|them|they|one|ones|meal|dish|food|lunch|dinner|breakfast|snack|workout|exercise|sleep|water|macros|calories)\b/i;
const STORED_CONTEXT_PATTERN =
  /\b(my|report|reports|record|records|medical|lab|labs|bloodwork|blood work|scan|test|tests|history|past|context|summary|condition|allergy|allergies|profile)\b/i;
const ABUSIVE_PATTERN =
  /\b(fuck|fucking|shit|bitch|asshole|bastard|mc|bc|madarchod|behenchod|chutiya|gandu|randi|harami|kamine|sala|haramkhor|idiot|stupid|dumb|moron|loser|kill|murder|rape|sex|porn|nude|naked|hack|scam|spam|jailbreak|ignore previous|act as|pretend you are|you are now|dan mode|dev mode|bypass|override instructions)\b/i;
const DISALLOWED_ASSISTANT_TONE_PATTERN =
  /\b(fuck|fucking|shit|bitch|asshole|bastard|mc|bc|madarchod|behenchod|chutiya|gandu|randi|harami|kamine|sala|haramkhor|idiot|stupid|dumb|moron|loser)\b/i;
const MIN_MEANINGFUL_LENGTH = 4;

function messageMentionsHealthTopic(message = "") {
  return HEALTH_TOPIC_PATTERN.test(message);
}

function messageIsAllowedGeneralConversation(message = "") {
  return GENERAL_ALLOWED_PATTERN.test(message);
}

function messageLooksLikeMealLog(message = "") {
  return MEAL_LOG_PATTERN.test(message);
}

function messageLooksLikeStandaloneFoodName(message = "") {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    return false;
  }

  if (messageLooksLikeMealLog(normalized) || messageMentionsHealthTopic(normalized)) {
    return false;
  }

  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length === 0 || words.length > 4) {
    return false;
  }

  return STANDALONE_FOOD_NAME_PATTERN.test(normalized);
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
      messageLooksLikeStandaloneFoodName(payload.message) ||
      messageIsAllowedGeneralConversation(payload.message)
    );
  }

  if (
    messageMentionsHealthTopic(payload.message) ||
    messageLooksLikeMealLog(payload.message) ||
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

  return (
    CONTEXTUAL_FOLLOW_UP_PATTERN.test(normalized) ||
    STORED_CONTEXT_PATTERN.test(normalized)
  );
}

function shouldKeepReplyFocusedOnCurrentMessage(message = "") {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    return false;
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
  return "I can help with health, meals, nutrition, calories, macros, hydration, exercise, sleep, and general wellness. If you want, ask about food, a meal you had, your goals, or what I can help with.";
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

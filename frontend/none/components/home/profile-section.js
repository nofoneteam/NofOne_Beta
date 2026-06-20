"use client";
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileSection = ProfileSection;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var card_1 = require("@/components/ui/card");
var spinner_1 = require("@/components/ui/spinner");
var toast_1 = require("@/components/ui/toast");
var utils_1 = require("@/lib/utils");
var yesNoOptions = [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
];
var genderOptions = [
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" },
    { label: "Non-binary", value: "Non-binary" },
    { label: "Prefer not to say", value: "Prefer not to say" },
];
var activityOptions = [
    { label: "Sedentary", value: "sedentary" },
    { label: "Light", value: "light" },
    { label: "Moderate", value: "moderate" },
    { label: "Active", value: "active" },
    { label: "Very Active", value: "very_active" },
];
var goalOptions = [
    { label: "Lose Weight", value: "lose_weight" },
    { label: "Gain Weight", value: "gain_weight" },
    { label: "Maintain", value: "maintain" },
    { label: "Loss", value: "loss" },
    { label: "Gain", value: "gain" },
];
var dietOptions = [
    { label: "Balanced", value: "Balanced" },
    { label: "High-Protein", value: "High-Protein" },
    { label: "Low-Carb", value: "Low-Carb" },
    { label: "Low-Fat", value: "Low-Fat" },
    { label: "Low-Sodium", value: "Low-Sodium" },
    { label: "Diabetic-Friendly", value: "Diabetic-Friendly" },
    { label: "Heart-Healthy", value: "Heart-Healthy" },
    { label: "Keto", value: "Keto" },
    { label: "Vegan", value: "Vegan" },
    { label: "Vegetarian", value: "Vegetarian" },
    { label: "Pescatarian", value: "Pescatarian" },
    { label: "Paleo", value: "Paleo" },
    { label: "Mediterranean", value: "Mediterranean" },
    { label: "Low-FODMAP", value: "Low-FODMAP" },
    { label: "Gluten-Free", value: "Gluten-Free" },
    { label: "Dairy-Free", value: "Dairy-Free" },
    { label: "Jain", value: "Jain" },
    { label: "Halal", value: "Halal" },
    { label: "Kosher", value: "Kosher" },
    { label: "Intermittent Fasting", value: "Intermittent Fasting" },
    { label: "Other", value: "Other" },
];
var presetDietValues = new Set(dietOptions.map(function (option) { return option.value; }));
var aiUpdatableFields = new Set([
    "age",
    "gender",
    "height",
    "weight",
    "location",
    "city",
    "ethnicityCuisine",
    "activityLevel",
    "goal",
    "dietType",
    "diabetes",
    "hypertension",
    "cholesterol",
    "cancerSurvivor",
    "hrt",
    "otherConditions",
    "allergies",
    "foodDislikes",
    "targetCalories",
    "targetBurn",
    "targetCarbs",
    "targetProtein",
    "targetFat",
]);
function calculateBmi(weight, height) {
    if (!weight || !height) {
        return null;
    }
    var heightInMeters = height / 100;
    if (!heightInMeters) {
        return null;
    }
    return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
}
function getBmiCategory(bmi) {
    if (bmi == null) {
        return null;
    }
    if (bmi < 18.5) {
        return "Underweight";
    }
    if (bmi < 25) {
        return "Normal";
    }
    if (bmi < 30) {
        return "Overweight";
    }
    return "Obese";
}
function normalizeDraftProfile(draft) {
    var bmi = calculateBmi(draft.weight != null ? Number(draft.weight) : null, draft.height != null ? Number(draft.height) : null);
    return __assign(__assign({}, draft), { targetWeight: null, bmi: bmi, bmiCategory: getBmiCategory(bmi) });
}
function sanitizeAiSuggestionUpdates(updates) {
    return Object.entries(updates).reduce(function (accumulator, _a) {
        var key = _a[0], value = _a[1];
        var typedKey = key;
        if (!aiUpdatableFields.has(typedKey)) {
            return accumulator;
        }
        // Convert null to undefined to match field type definitions
        var normalizedValue = value === null ? undefined : value;
        accumulator[typedKey] =
            normalizedValue;
        return accumulator;
    }, {});
}
function toDraftProfile(profile) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    var resolvedDietType = (_a = profile.dietType) !== null && _a !== void 0 ? _a : null;
    var isCustomDietType = resolvedDietType != null && !presetDietValues.has(resolvedDietType);
    return normalizeDraftProfile({
        age: (_b = profile.age) !== null && _b !== void 0 ? _b : undefined,
        gender: profile.gender,
        height: (_c = profile.height) !== null && _c !== void 0 ? _c : undefined,
        weight: (_d = profile.weight) !== null && _d !== void 0 ? _d : undefined,
        targetWeight: null,
        targetCalories: (_e = profile.targetCalories) !== null && _e !== void 0 ? _e : undefined,
        targetBurn: (_f = profile.targetBurn) !== null && _f !== void 0 ? _f : undefined,
        targetCarbs: (_g = profile.targetCarbs) !== null && _g !== void 0 ? _g : undefined,
        targetProtein: (_h = profile.targetProtein) !== null && _h !== void 0 ? _h : undefined,
        targetFat: (_j = profile.targetFat) !== null && _j !== void 0 ? _j : undefined,
        bmi: profile.bmi,
        bmiCategory: profile.bmiCategory,
        location: profile.location,
        city: profile.city,
        ethnicityCuisine: profile.ethnicityCuisine,
        activityLevel: (_k = profile.activityLevel) !== null && _k !== void 0 ? _k : undefined,
        goal: (_l = profile.goal) !== null && _l !== void 0 ? _l : undefined,
        dietType: isCustomDietType ? "Other" : resolvedDietType,
        diabetes: profile.diabetes,
        hypertension: profile.hypertension,
        cholesterol: profile.cholesterol,
        cancerSurvivor: profile.cancerSurvivor,
        hrt: profile.hrt,
        otherConditions: profile.otherConditions,
        allergies: (Array.isArray(profile.allergies) ? profile.allergies : profile.allergies ? [String(profile.allergies)] : []).filter(function (item) { return typeof item === "string" && item.trim().length > 0; }),
        foodDislikes: (Array.isArray(profile.foodDislikes) ? profile.foodDislikes : profile.foodDislikes ? [String(profile.foodDislikes)] : []).filter(function (item) { return typeof item === "string" && item.trim().length > 0; }),
        aiNotes: (Array.isArray(profile.aiNotes) ? profile.aiNotes : profile.aiNotes ? [String(profile.aiNotes)] : []).filter(function (item) { return typeof item === "string" && item.trim().length > 0; }),
    });
}
function normalizeValue(kind, value) {
    if (kind === "tags") {
        return value
            .split(",")
            .map(function (item) { return item.trim(); })
            .filter(Boolean);
    }
    if (kind === "number") {
        if (!value.trim()) {
            return null;
        }
        return Number(value);
    }
    return value.trim() ? value.trim() : null;
}
function formatDisplayValue(field, value) {
    if (Array.isArray(value)) {
        return value.length > 0 ? value.join(", ") : "None";
    }
    if (value == null || value === "") {
        return "—";
    }
    if (field === "goal" || field === "activityLevel") {
        return String(value)
            .split("_")
            .map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1); })
            .join(" ");
    }
    return String(value);
}
function formatSuggestionLabel(key) {
    return key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, function (value) { return value.toUpperCase(); })
        .trim();
}
function formatSuggestionValue(value) {
    if (Array.isArray(value)) {
        return value.length > 0 ? value.join(", ") : "None";
    }
    if (value == null || value === "") {
        return "—";
    }
    if (typeof value === "string") {
        return value
            .split("_")
            .map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1); })
            .join(" ");
    }
    return String(value);
}
function SectionCard(_a) {
    var title = _a.title, children = _a.children;
    return (<card_1.Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
      <card_1.CardContent className="p-5 sm:p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9ca3ad]">
          {title}
        </p>
        <div className="mt-3">{children}</div>
      </card_1.CardContent>
    </card_1.Card>);
}
function MetricStat(_a) {
    var label = _a.label, tone = _a.tone, value = _a.value;
    return (<div className="px-2 sm:px-4 text-center flex flex-col items-center justify-center">
      <p className={(0, utils_1.cn)("text-[28px] sm:text-[40px] font-semibold leading-none truncate w-full", tone)}>{value}</p>
      <p className="mt-2 text-[11px] sm:text-[14px] text-[#8d949c] leading-tight">{label}</p>
    </div>);
}
function EditableRow(_a) {
    var field = _a.field, label = _a.label, value = _a.value, _b = _a.kind, kind = _b === void 0 ? "text" : _b, options = _a.options, onApply = _a.onApply;
    var _c = (0, react_1.useState)(false), editing = _c[0], setEditing = _c[1];
    var _d = (0, react_1.useState)(Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value)), inputValue = _d[0], setInputValue = _d[1];
    var _e = (0, react_1.useState)(Array.isArray(value) ? value : []), tagValues = _e[0], setTagValues = _e[1];
    function addTag(tag) {
        if (tag === void 0) { tag = inputValue; }
        var nextTag = String(tag !== null && tag !== void 0 ? tag : "").trim();
        if (!nextTag) {
            return;
        }
        setTagValues(function (current) {
            return current.includes(nextTag) ? current : __spreadArray(__spreadArray([], current, true), [nextTag], false);
        });
        setInputValue("");
    }
    function commit() {
        if (kind === "tags") {
            var nextTagValue = String(inputValue !== null && inputValue !== void 0 ? inputValue : "").trim();
            var nextValues = nextTagValue
                ? tagValues.includes(nextTagValue)
                    ? tagValues
                    : __spreadArray(__spreadArray([], tagValues, true), [nextTagValue], false)
                : tagValues;
            onApply(field, nextValues);
            setTagValues(nextValues);
        }
        else {
            onApply(field, normalizeValue(kind, inputValue));
        }
        setInputValue(Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value));
        setEditing(false);
    }
    function cancel() {
        setInputValue(Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value));
        if (kind === "tags") {
            setTagValues(Array.isArray(value) ? value : []);
        }
        setEditing(false);
    }
    function handleKeyDown(e) {
        if (kind === "tags" && e.key === "Enter") {
            e.preventDefault();
            addTag();
            return;
        }
        if (e.key === "Enter") {
            commit();
        }
    }
    function handleBlur(e) {
        if (e.relatedTarget &&
            e.relatedTarget.closest(".cancel-btn, .tag-add-button, .tag-remove-button, .commit-btn")) {
            return;
        }
        commit();
    }
    return (<div className="group flex items-center gap-4 border-b border-[#efeee7] py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-[#8e949d]">{label}</p>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {editing ? (<>
            {kind === "select" ? (<select className="min-w-[156px] rounded-xl border border-[#e7e5dd] bg-[#fbfbf7] px-3 py-2 text-right text-[15px] font-semibold text-[#111111] outline-none" onChange={function (event) { return setInputValue(event.target.value); }} onBlur={handleBlur} value={inputValue} autoFocus>
                <option value="">Select</option>
                {(options !== null && options !== void 0 ? options : []).map(function (option) { return (<option key={option.value} value={option.value}>
                    {option.label}
                  </option>); })}
              </select>) : kind === "tags" ? (<div className="flex w-full flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {tagValues.map(function (tag, index) { return (<span key={"".concat(tag, "-").concat(index)} className="inline-flex items-center gap-1 rounded-full bg-[#f4f4f7] px-3 py-1 text-[13px] text-[#4b5563]">
                      {tag}
                      <button className="tag-remove-button rounded-full p-1 text-[#6b7280] transition-colors hover:bg-[#e5e7eb]" onClick={function () { return setTagValues(function (current) { return current.filter(function (_, itemIndex) { return itemIndex !== index; }); }); }} type="button">
                        <lucide_react_1.X className="h-3 w-3"/>
                      </button>
                    </span>); })}
                </div>
                <div className="flex items-center gap-2">
                  <input className="min-w-[156px] flex-1 rounded-xl border border-[#e7e5dd] bg-[#fbfbf7] px-3 py-2 text-[15px] font-semibold text-[#111111] outline-none" onChange={function (event) { return setInputValue(event.target.value); }} onKeyDown={function (event) {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        addTag();
                    }
                }} placeholder="Add value and press + or Enter" type="text" value={inputValue} autoFocus/>
                  <button className="tag-add-button flex h-10 w-10 items-center justify-center rounded-full bg-[#edf2f7] text-[#4b5563] transition-colors hover:bg-[#e2e8f0]" onClick={function () { return addTag(); }} type="button">
                    <lucide_react_1.Plus className="h-4 w-4"/>
                  </button>
                </div>
              </div>) : (<input className="min-w-[156px] rounded-xl border border-[#e7e5dd] bg-[#fbfbf7] px-3 py-2 text-right text-[15px] font-semibold text-[#111111] outline-none" onChange={function (event) { return setInputValue(event.target.value); }} onKeyDown={handleKeyDown} onBlur={handleBlur} placeholder={kind === "tags" ? "e.g. peanuts, dairy" : ""} step={kind === "number" ? "0.1" : undefined} type={kind === "number" ? "number" : "text"} value={inputValue} autoFocus/>)}
            <button className="commit-btn flex h-8 w-8 items-center justify-center rounded-full text-[#2d73ff] transition-colors hover:bg-[#eef4ff]" onClick={commit} type="button">
              <lucide_react_1.Check className="h-4 w-4"/>
            </button>
            <button className="cancel-btn flex h-8 w-8 items-center justify-center rounded-full text-[#df5b5b] transition-colors hover:bg-[#fff1f1]" onClick={cancel} type="button">
              <lucide_react_1.X className="h-4 w-4"/>
            </button>
          </>) : (<>
            <p className="text-right text-[15px] font-semibold text-[#171717]">
              {formatDisplayValue(field, value)}
            </p>
            <button className="flex h-7 w-7 items-center justify-center rounded-full text-[#9ba1aa] opacity-100 transition-all md:opacity-0 md:group-hover:opacity-100 hover:bg-[#f4f4ef]" onClick={function () {
                if (kind === "tags") {
                    setTagValues(Array.isArray(value) ? value : value ? [String(value)] : []);
                    setInputValue("");
                }
                else {
                    setInputValue(Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value));
                }
                setEditing(true);
            }} type="button">
              <lucide_react_1.Pencil className="h-3.5 w-3.5"/>
            </button>
          </>)}
      </div>
    </div>);
}
function ProfileSection(_a) {
    var _b, _c, _d, _e, _f;
    var loading = _a.loading, profile = _a.profile, reports = _a.reports, savingProfile = _a.savingProfile, analyzingAi = _a.analyzingAi, uploadingReport = _a.uploadingReport, onBack = _a.onBack, onAnalyzeAiNote = _a.onAnalyzeAiNote, onSaveProfile = _a.onSaveProfile, onUploadReport = _a.onUploadReport;
    var toast = (0, toast_1.useToast)().toast;
    var _g = (0, react_1.useState)(function () {
        return profile ? toDraftProfile(profile) : null;
    }), draft = _g[0], setDraft = _g[1];
    var draftRef = (0, react_1.useRef)(draft);
    draftRef.current = draft;
    var _h = (0, react_1.useState)(""), noteInput = _h[0], setNoteInput = _h[1];
    var _j = (0, react_1.useState)(null), aiError = _j[0], setAiError = _j[1];
    var _k = (0, react_1.useState)(null), pendingSuggestion = _k[0], setPendingSuggestion = _k[1];
    var _l = (0, react_1.useState)(""), pendingNote = _l[0], setPendingNote = _l[1];
    var _m = (0, react_1.useState)({}), selectedSuggestionKeys = _m[0], setSelectedSuggestionKeys = _m[1];
    var reportInputRef = (0, react_1.useRef)(null);
    var recognitionRef = (0, react_1.useRef)(null);
    var _o = (0, react_1.useState)(false), isListening = _o[0], setIsListening = _o[1];
    var _p = (0, react_1.useState)(""), liveTranscript = _p[0], setLiveTranscript = _p[1];
    var _q = (0, react_1.useState)(function () {
        var _a;
        var resolvedDietType = (_a = profile === null || profile === void 0 ? void 0 : profile.dietType) !== null && _a !== void 0 ? _a : "";
        return resolvedDietType && !presetDietValues.has(resolvedDietType) ? resolvedDietType : "";
    }), customDietType = _q[0], setCustomDietType = _q[1];
    (0, react_1.useEffect)(function () {
        return function () {
            var _a;
            (_a = recognitionRef.current) === null || _a === void 0 ? void 0 : _a.stop();
            recognitionRef.current = null;
        };
    }, []);
    var bmi = (_b = draft === null || draft === void 0 ? void 0 : draft.bmi) !== null && _b !== void 0 ? _b : null;
    var bmiCategory = (_c = draft === null || draft === void 0 ? void 0 : draft.bmiCategory) !== null && _c !== void 0 ? _c : "Normal";
    var currentWeight = (_d = draft === null || draft === void 0 ? void 0 : draft.weight) !== null && _d !== void 0 ? _d : null;
    var canSave = (0, react_1.useMemo)(function () {
        if (!draft) {
            return false;
        }
        return Boolean(draft.age != null &&
            draft.height != null &&
            draft.weight != null &&
            draft.activityLevel &&
            draft.goal);
    }, [draft]);
    function applyField(field, value) {
        if (field === "dietType" && value !== "Other") {
            setCustomDietType("");
        }
        setDraft(function (current) {
            var _a;
            var next = current ? normalizeDraftProfile(__assign(__assign({}, current), (_a = {}, _a[field] = value, _a.targetWeight = null, _a))) : current;
            draftRef.current = next;
            return next;
        });
    }
    function applyCustomDietType(value) {
        setCustomDietType(value);
    }
    function applySuggestion() {
        return __awaiter(this, void 0, void 0, function () {
            var selectedUpdates, nextDraft, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!pendingSuggestion || !draft) {
                            return [2 /*return*/];
                        }
                        selectedUpdates = Object.fromEntries(Object.entries(pendingSuggestion.updates).filter(function (_a) {
                            var key = _a[0];
                            return selectedSuggestionKeys[key];
                        }));
                        if (Object.keys(selectedUpdates).length === 0) {
                            setAiError("Select at least one suggested profile change before saving.");
                            return [2 /*return*/];
                        }
                        nextDraft = normalizeDraftProfile(__assign(__assign(__assign({}, draft), sanitizeAiSuggestionUpdates(selectedUpdates)), { aiNotes: pendingNote
                                ? Array.from(new Set(__spreadArray(__spreadArray([], (Array.isArray(draft.aiNotes) ? draft.aiNotes : []), true), [pendingNote], false)))
                                : Array.isArray(draft.aiNotes)
                                    ? draft.aiNotes
                                    : [], targetWeight: null }));
                        setDraft(nextDraft);
                        setAiError(null);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, onSaveProfile(nextDraft)];
                    case 2:
                        _a.sent();
                        setPendingSuggestion(null);
                        setPendingNote("");
                        setSelectedSuggestionKeys({});
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        setAiError(error_1 instanceof Error ? error_1.message : "Unable to save AI profile updates.");
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    function handleSpeechUnavailable(message) {
        toast({
            title: "Voice input unavailable",
            description: message,
            variant: "error",
        });
    }
    function handleMicToggle() {
        var _a;
        if (typeof window === "undefined") {
            return;
        }
        var speechWindow = window;
        var RecognitionConstructor = (_a = speechWindow.SpeechRecognition) !== null && _a !== void 0 ? _a : speechWindow.webkitSpeechRecognition;
        if (!RecognitionConstructor) {
            handleSpeechUnavailable("Speech recognition is not supported in this browser.");
            return;
        }
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
            return;
        }
        var recognition = new RecognitionConstructor();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = function (event) {
            var _a, _b;
            var transcript = "";
            var finalTranscript = "";
            for (var index = event.resultIndex; index < event.results.length; index += 1) {
                var nextTranscript = (_b = (_a = event.results[index][0]) === null || _a === void 0 ? void 0 : _a.transcript) !== null && _b !== void 0 ? _b : "";
                transcript += nextTranscript;
                if (event.results[index].isFinal) {
                    finalTranscript += nextTranscript;
                }
            }
            var nextValue = transcript.trim();
            setLiveTranscript(nextValue);
            setNoteInput(nextValue);
            if (finalTranscript.trim()) {
                setLiveTranscript(finalTranscript.trim());
            }
        };
        recognition.onerror = function (event) {
            setIsListening(false);
            setLiveTranscript("");
            recognitionRef.current = null;
            if (event.error === "not-allowed") {
                handleSpeechUnavailable("Microphone permission was denied. Please allow microphone access and try again.");
                return;
            }
            if (event.error === "no-speech") {
                handleSpeechUnavailable("No speech was detected. Try speaking a little closer to the microphone.");
                return;
            }
            handleSpeechUnavailable("Voice input could not start properly. Please try again.");
        };
        recognition.onend = function () {
            setIsListening(false);
            setLiveTranscript("");
            recognitionRef.current = null;
        };
        recognitionRef.current = recognition;
        setIsListening(true);
        recognition.start();
    }
    if (loading || !profile || !draft) {
        return (<div className="mx-auto w-full max-w-3xl space-y-4">
        {Array.from({ length: 5 }).map(function (_, index) { return (<div key={index} className="h-34 rounded-[26px] bg-[#f4f4ef] shimmer"/>); })}
      </div>);
    }
    return (<div className="mx-auto w-full max-w-3xl space-y-4 pb-10 animate-fade-up">
      <div className="flex items-center gap-3 px-1">
        <button className="flex h-8 w-8 items-center justify-center rounded-full text-[#4b4f55] transition-colors hover:bg-[#f3f3ee]" onClick={onBack} type="button">
          <lucide_react_1.ChevronLeft className="h-5 w-5"/>
        </button>
        <h1 className="text-[32px] font-semibold tracking-tight text-[#171717]">Profile</h1>
      </div>

      <card_1.Card className="rounded-[28px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
        <card_1.CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-18 w-18 items-center justify-center rounded-[22px] bg-[#edf5ee] text-green-800">
              <lucide_react_1.UserRound className="h-8 w-8"/>
            </div>
            <div>
              <p className="text-[16px] text-[#8b929b]">
                {(_e = draft.age) !== null && _e !== void 0 ? _e : "—"} yrs · {draft.gender || "—"} · {draft.city || "—"}
              </p>
              <p className="mt-1 text-[14px] text-[#a0a6af]">{profile.user.name || "NofOne user"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[42px] font-semibold leading-none text-green-800">
              {bmi ? bmi.toFixed(1) : "—"}
            </p>
            <p className="mt-2 text-[12px] uppercase tracking-[0.14em] text-[#9ca3ad]">BMI</p>
            <span className="mt-3 inline-flex rounded-full bg-[#edf5ee] px-3 py-1 text-[12px] font-semibold text-green-800">
              {bmiCategory}
            </span>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card className="rounded-[26px] border-[#ecece7] bg-white shadow-[0_10px_32px_rgba(17,17,17,0.04)]">
        <card_1.CardContent className="p-5 sm:p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9ca3ad]">
            Health Snapshot
          </p>
          <div className="mt-4 grid grid-cols-3 divide-x divide-[#ecece7]">
            <MetricStat label="Current (kg)" tone="text-[#171717]" value={currentWeight != null ? String(currentWeight) : "—"}/>
            <MetricStat label="Goal" tone="text-green-800" value={formatDisplayValue("goal", draft.goal)}/>
            <MetricStat label="Activity" tone="text-[#e49a46]" value={formatDisplayValue("activityLevel", draft.activityLevel)}/>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      <SectionCard title="Medical Records">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7b9480]">
            <lucide_react_1.FileText className="h-4 w-4"/>
            <span>Medical Records</span>
          </div>

          <div className="space-y-3">
            {reports.length === 0 ? (<div className="rounded-[18px] bg-[#f8f7f2] px-4 py-4 text-[14px] text-[#8c939b]">
                No reports uploaded yet.
              </div>) : (reports.map(function (report) { return (<a key={report.id} className="block rounded-[18px] border border-[#ecece7] bg-[#fbfbf8] px-4 py-4 transition-colors hover:bg-[#f7f7f2]" href={report.secureUrl} rel="noreferrer" target="_blank">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f2f2ed] text-[#8f97a1]">
                      <lucide_react_1.FileText className="h-4.5 w-4.5"/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-[#171717]">
                        {report.title || report.fileName}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[12px] text-[#9ca3ad]">
                        <lucide_react_1.CalendarDays className="h-3.5 w-3.5"/>
                        <span>
                          {new Date(report.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
            })}
                        </span>
                        <span>·</span>
                        <span>Lab Report</span>
                      </div>
                    </div>
                  </div>
                </a>); }))}
          </div>

          <button className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-[#e7e5dd] bg-white px-4 py-3.5 text-[14px] font-semibold text-[#8e949d] transition-colors hover:bg-[#faf9f4]" disabled={uploadingReport} onClick={function () { var _a; return (_a = reportInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} type="button">
            {uploadingReport ? <spinner_1.Spinner className="h-4 w-4"/> : <lucide_react_1.Upload className="h-4 w-4"/>}
            <span>{uploadingReport ? "Uploading Record" : "Upload Record"}</span>
          </button>
          <input ref={reportInputRef} accept=".pdf,.txt,image/*" className="hidden" onChange={function (event) {
            var _a;
            var file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
            if (file) {
                void onUploadReport(file, file.name.replace(/\.[^.]+$/, ""));
            }
            event.target.value = "";
        }} type="file"/>
        </div>
      </SectionCard>

      <SectionCard title="AI Notes">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7b9480]">
            <lucide_react_1.Sparkles className="h-4 w-4"/>
            <span>AI Notes</span>
          </div>
          <p className="text-[14px] leading-6 text-[#8c939b]">
            Tell Nofone about your body metrics, routine, health conditions, allergies, diet type, dislikes, and training goals. It will update your profile draft and refresh your daily calorie targets after save.
          </p>
          {aiError ? (<div className="rounded-[16px] border border-[#f0d7d7] bg-[#fff4f4] px-4 py-3 text-[13px] text-[#c05454]">
              {aiError}
            </div>) : null}
          <div className="rounded-[18px] bg-[#f7f4ed] px-4 py-3">
            <textarea className="min-h-[108px] w-full resize-none bg-transparent text-[15px] leading-6 text-[#171717] outline-none placeholder:text-[#a5abb4]" onChange={function (event) { return setNoteInput(event.target.value); }} placeholder="Tell me about yourself, your health conditions, allergies, diet, dislikes, and goals" value={noteInput}/>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[13px] text-[#7f8790]">
                Example: &quot;I am 29, 175 cm, 72 kg, vegetarian, allergic to peanuts, lactose intolerant, training for a marathon, and want my profile and daily goals set.&quot;
              </p>
              <div className="flex items-center gap-3">
                <button className={(0, utils_1.cn)("transition-colors", isListening ? "text-green-800" : "text-[#9aa0a8]")} onClick={handleMicToggle} type="button">
                  <lucide_react_1.Mic className="h-4.5 w-4.5"/>
                </button>
                <button className="flex items-center justify-center text-green-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={analyzingAi || !noteInput.trim()} onClick={function () {
            if (!noteInput.trim()) {
                return;
            }
            var nextNote = noteInput.trim();
            setAiError(null);
            void onAnalyzeAiNote(nextNote)
                .then(function (result) {
                setPendingSuggestion(result);
                setPendingNote(nextNote);
                setSelectedSuggestionKeys(Object.fromEntries(Object.keys(result.updates).map(function (key) { return [key, true]; })));
                setNoteInput("");
            })
                .catch(function (error) {
                setAiError(error instanceof Error ? error.message : "Unable to analyze note.");
            });
        }} type="button">
                  {analyzingAi ? <spinner_1.Spinner className="h-4 w-4"/> : <lucide_react_1.SendHorizonal className="h-4.5 w-4.5"/>}
                </button>
              </div>
            </div>
          </div>
          {isListening || liveTranscript ? (<p className="text-[12px] text-[#7f8790]">
              {isListening
                ? "Listening... ".concat(liveTranscript || "Start speaking to update your profile note.")
                : liveTranscript}
            </p>) : null}
          <div className="space-y-3">
            {((_f = draft.aiNotes) !== null && _f !== void 0 ? _f : []).map(function (note, index) { return (<div key={"".concat(note, "-").concat(index)} className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-[#b8d2bc]"/>
                <p className="flex-1 text-[14px] text-[#5b6067]">{note}</p>
                <button className="rounded-full p-1 text-[#d46363] transition-colors hover:bg-[#fff2f2]" onClick={function () {
                return setDraft(function (current) {
                    var _a;
                    return current
                        ? __assign(__assign({}, current), { aiNotes: ((_a = current.aiNotes) !== null && _a !== void 0 ? _a : []).filter(function (_, itemIndex) { return itemIndex !== index; }) }) : current;
                });
            }} type="button">
                  <lucide_react_1.X className="h-4 w-4"/>
                </button>
              </div>); })}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Basic Info">
        <EditableRow field="age" kind="number" label="Age" onApply={applyField} value={draft.age}/>
        <EditableRow field="gender" kind="select" label="Gender" onApply={applyField} options={genderOptions} value={draft.gender}/>
        <EditableRow field="height" kind="number" label="Height (cm)" onApply={applyField} value={draft.height}/>
        <EditableRow field="weight" kind="number" label="Weight (kg)" onApply={applyField} value={draft.weight}/>
      </SectionCard>

      <SectionCard title="Location & Background">
        <EditableRow field="city" label="City" onApply={applyField} value={draft.city}/>
        <EditableRow field="location" label="Location" onApply={applyField} value={draft.location}/>
        <EditableRow field="ethnicityCuisine" label="Ethnicity / Cuisine" onApply={applyField} value={draft.ethnicityCuisine}/>
      </SectionCard>

      <SectionCard title="Activity & Goals">
        <EditableRow field="activityLevel" kind="select" label="Activity Level" onApply={applyField} options={activityOptions} value={draft.activityLevel}/>
        <EditableRow field="goal" kind="select" label="Goal" onApply={applyField} options={goalOptions} value={draft.goal}/>
      </SectionCard>

      <SectionCard title="Daily Goal Targets">
        <EditableRow field="targetCalories" kind="number" label="Calories Target" onApply={applyField} value={draft.targetCalories}/>
        <EditableRow field="targetBurn" kind="number" label="Burn Target" onApply={applyField} value={draft.targetBurn}/>
        <EditableRow field="targetCarbs" kind="number" label="Carbs Target (g)" onApply={applyField} value={draft.targetCarbs}/>
        <EditableRow field="targetProtein" kind="number" label="Protein Target (g)" onApply={applyField} value={draft.targetProtein}/>
        <EditableRow field="targetFat" kind="number" label="Fat Target (g)" onApply={applyField} value={draft.targetFat}/>
      </SectionCard>

      <SectionCard title="Health Conditions">
        <EditableRow field="diabetes" kind="select" label="Diabetes" onApply={applyField} options={yesNoOptions} value={draft.diabetes}/>
        <EditableRow field="hypertension" kind="select" label="Hypertension" onApply={applyField} options={yesNoOptions} value={draft.hypertension}/>
        <EditableRow field="cholesterol" label="Cholesterol" onApply={applyField} value={draft.cholesterol}/>
        <EditableRow field="cancerSurvivor" kind="select" label="Cancer Survivor" onApply={applyField} options={yesNoOptions} value={draft.cancerSurvivor}/>
        <EditableRow field="hrt" kind="select" label="HRT" onApply={applyField} options={yesNoOptions} value={draft.hrt}/>
        <EditableRow field="otherConditions" label="Other Conditions" onApply={applyField} value={draft.otherConditions}/>
      </SectionCard>

      <SectionCard title="Allergies & Dislikes">
        <EditableRow field="allergies" kind="tags" label="Allergies" onApply={applyField} value={draft.allergies}/>
        <EditableRow field="foodDislikes" kind="tags" label="Food Dislikes" onApply={applyField} value={draft.foodDislikes}/>
      </SectionCard>

      <SectionCard title="Diet Preference">
        <EditableRow field="dietType" kind="select" label="Diet Type" onApply={applyField} options={dietOptions} value={draft.dietType}/>
        {draft.dietType === "Other" || (!!draft.dietType && !presetDietValues.has(String(draft.dietType))) ? (<EditableRow field="dietType" kind="text" label="Other Diet Type" onApply={function (_, value) { return applyCustomDietType(String(value !== null && value !== void 0 ? value : "")); }} value={draft.dietType === "Other" ? customDietType : draft.dietType}/>) : null}
      </SectionCard>

      <div className="sticky bottom-4 flex justify-end">
        <button className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-[18px] bg-green-800 px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_34px_rgba(22,34,18,0.14)] transition-opacity hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60" disabled={!canSave || savingProfile} onClick={function () {
            var _a;
            var resolvedDietType = draft.dietType === "Other"
                ? customDietType.trim()
                : (_a = draft.dietType) !== null && _a !== void 0 ? _a : null;
            if (draft.dietType === "Other" && !resolvedDietType) {
                toast({
                    title: "Add your diet type",
                    description: "Please enter your diet type when selecting Other.",
                    variant: "error",
                });
                return;
            }
            var currentDraft = draftRef.current || draft;
            void onSaveProfile(__assign(__assign({}, currentDraft), { dietType: resolvedDietType })).catch(function () { return null; });
        }} type="button">
          {savingProfile ? <spinner_1.Spinner className="h-4 w-4"/> : <lucide_react_1.Check className="h-4 w-4"/>}
          <span>{savingProfile ? "Saving Profile..." : "Save Profile"}</span>
        </button>
      </div>

      {pendingSuggestion ? (<div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c2f32]/18 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-[26px] border border-[#ecece7] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <div className="border-b border-[#efeee7] px-5 py-4">
              <p className="text-[18px] font-semibold text-[#171717]">AI Profile Suggestion</p>
              <p className="mt-1 text-[14px] text-[#7f8790]">{pendingSuggestion.summary}</p>
            </div>
            <div className="space-y-3 px-5 py-5">
              {(function () {
                var effectiveUpdates = Object.entries(pendingSuggestion.updates).filter(function (_a) {
                    var key = _a[0], value = _a[1];
                    var oldVal = formatDisplayValue(key, draft[key]);
                    var newVal = formatSuggestionValue(value);
                    return oldVal !== newVal;
                });
                if (effectiveUpdates.length === 0) {
                    return (<div className="rounded-[16px] bg-[#f8f7f2] px-4 py-4 text-[14px] text-[#707780]">
                      No changes made based on the provided note.
                    </div>);
                }
                return effectiveUpdates.map(function (_a) {
                    var _b;
                    var key = _a[0], value = _a[1];
                    return (<div key={key} className="rounded-[16px] bg-[#f8f7f2] px-4 py-3">
                    <label className="flex items-start gap-3">
                      <input checked={(_b = selectedSuggestionKeys[key]) !== null && _b !== void 0 ? _b : false} className="mt-1 h-4 w-4 rounded border-[#cfd4dc] text-green-800 focus:ring-green-700" onChange={function (event) {
                            return setSelectedSuggestionKeys(function (current) {
                                var _a;
                                return (__assign(__assign({}, current), (_a = {}, _a[key] = event.target.checked, _a)));
                            });
                        }} type="checkbox"/>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-[#8b929b]">
                          {formatSuggestionLabel(key)}
                        </p>
                        <p className="mt-1 text-[14px] text-[#5b6067]">
                          Change from{" "}
                          <span className="font-semibold text-[#171717]">
                            {formatDisplayValue(key, draft[key])}
                          </span>{" "}
                          to{" "}
                          <span className="font-semibold text-[#171717]">
                            {formatSuggestionValue(value)}
                          </span>
                        </p>
                      </div>
                    </label>
                  </div>);
                });
            })()}
            </div>
            <div className="flex justify-end gap-3 border-t border-[#efeee7] px-5 py-4">
              <button className="rounded-[14px] px-4 py-2.5 text-[14px] font-semibold text-[#7b828b] transition-colors hover:bg-[#f4f4ef]" onClick={function () {
                setPendingSuggestion(null);
                setPendingNote("");
                setSelectedSuggestionKeys({});
            }} type="button">
                Cancel
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-green-800 px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60" disabled={savingProfile} onClick={function () { return void applySuggestion(); }} type="button">
                {savingProfile ? <spinner_1.Spinner className="h-4 w-4"/> : <lucide_react_1.Check className="h-4 w-4"/>}
                {savingProfile ? "Saving..." : "Apply and Save"}
              </button>
            </div>
          </div>
        </div>) : null}
    </div>);
}

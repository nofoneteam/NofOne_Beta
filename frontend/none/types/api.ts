import type {
  AuthSession,
  ChatConfig,
  ChatPreferences,
  ChatMessage,
  ChatTurnResponse,
  CreatedSharedReport,
  DashboardSummary,
  DailyLog,
  HealthProfile,
  HealthProfileWithUser,
  MedicalReport,
  OtpRequestResult,
  ProfileAiSuggestion,
  SharedProgressReport,
  User,
  UserRole,
  WeeklyReport,
  WeeklySummary,
  WeightTrackerSummary,
  ProgressReport,
} from "@/types/domain";

export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Array<{
    type?: string;
    value?: unknown;
    msg?: string;
    path?: string;
    location?: string;
  }>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | object | null;
  token?: string | null;
  cookie?: string | null;
  query?: object;
}

export interface ContactIdentifier {
  email?: string;
  phoneNumber?: string;
}

export interface OtpRequestPayload extends ContactIdentifier {
  name?: string;
  referralCode?: string;
}

export interface VerifyOtpPayload extends ContactIdentifier {
  otp: string;
  name?: string;
  referralCode?: string;
}

export interface GoogleLoginPayload {
  idToken: string;
  name?: string;
  referralCode?: string;
}

export interface PhoneLoginPayload {
  idToken: string;
  mode: "signup" | "login";
  name?: string;
  referralCode?: string;
}

export interface RefreshSessionPayload {
  refreshToken?: string;
}

export interface UpsertHealthProfilePayload {
  name?: string | null;
  age: number;
  gender?: string | null;
  height: number;
  weight: number;
  targetWeight?: number | null;
  bmi?: number | null;
  bmiCategory?: string | null;
  location?: string | null;
  city?: string | null;
  ethnicityCuisine?: string | null;
  activityLevel: HealthProfile["activityLevel"];
  goal: HealthProfile["goal"];
  dietType?: string | null;
  diabetes?: HealthProfile["diabetes"];
  hypertension?: HealthProfile["hypertension"];
  cholesterol?: string | null;
  cancerSurvivor?: HealthProfile["cancerSurvivor"];
  hrt?: HealthProfile["hrt"];
  otherConditions?: string | null;
  allergies?: string[] | null;
  foodDislikes?: string[] | null;
  aiNotes?: string[] | null;
}

export interface UpsertDailyLogPayload {
  date: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  waterIntake?: number;
  sleepHours?: number;
  exerciseMinutes?: number;
  exerciseCalories?: number;
  weight?: number | null;
}

export interface WeightTrackerQuery {
  endDate?: string;
  days?: number;
}

export interface WeeklySummaryQuery {
  endDate?: string;
}

export interface ProgressReportQuery {
  period?: "weekly" | "monthly" | "custom";
  endDate?: string;
  startDate?: string;
  dates?: string[];
}

export interface ShareReportPayload {
  period: "weekly" | "monthly" | "custom";
  endDate?: string;
  startDate?: string;
  dates?: string[];
}

export interface ChatMessagePayload {
  message?: string | null;
  type: "text" | "audio";
  includeDebug?: boolean;
}

export interface ChatImagePayload {
  message?: string | null;
  image: File | Blob;
  includeDebug?: boolean;
}

export interface UploadMedicalReportPayload {
  title?: string | null;
  report: File | Blob;
}

export interface ProfileAiSuggestionPayload {
  note: string;
}

export type UpdateChatPreferencesPayload = Partial<ChatPreferences>;

export interface BootstrapAdminPayload {
  bootstrapSecret: string;
}

export interface UpdateUserRolePayload {
  role: UserRole;
}

export interface UpsertChatConfigPayload {
  systemPrompt?: string;
  imageSystemPrompt?: string;
}

export type RequestSignupOtpResponse = ApiSuccessResponse<OtpRequestResult>;
export type VerifySignupOtpResponse = ApiSuccessResponse<AuthSession>;
export type RequestLoginOtpResponse = ApiSuccessResponse<OtpRequestResult>;
export type VerifyLoginOtpResponse = ApiSuccessResponse<AuthSession>;
export type GoogleLoginResponse = ApiSuccessResponse<AuthSession>;
export type PhoneLoginResponse = ApiSuccessResponse<AuthSession>;
export type RefreshSessionResponse = ApiSuccessResponse<AuthSession>;
export type AuthMeResponse = ApiSuccessResponse<{ user: User }>;
export type SaveProfileResponse = ApiSuccessResponse<HealthProfile>;
export type GetProfileResponse = ApiSuccessResponse<HealthProfileWithUser>;
export type GetMedicalReportsResponse = ApiSuccessResponse<{ reports: MedicalReport[] }>;
export type UploadMedicalReportResponse = ApiSuccessResponse<MedicalReport>;
export type ProfileAiSuggestionResponse = ApiSuccessResponse<ProfileAiSuggestion>;
export type GetChatPreferencesResponse = ApiSuccessResponse<ChatPreferences>;
export type UpdateChatPreferencesResponse = ApiSuccessResponse<ChatPreferences>;
export type SaveDailyLogResponse = ApiSuccessResponse<DailyLog>;
export type GetDailyLogResponse = ApiSuccessResponse<DailyLog>;
export type GetDashboardResponse = ApiSuccessResponse<DashboardSummary>;
export type GetWeightTrackerResponse = ApiSuccessResponse<WeightTrackerSummary>;
export type GetWeeklySummaryResponse = ApiSuccessResponse<WeeklySummary>;
export type GetWeeklyReportResponse = ApiSuccessResponse<WeeklyReport>;
export type GetProgressReportResponse = ApiSuccessResponse<ProgressReport>;
export type CreateSharedReportResponse = ApiSuccessResponse<CreatedSharedReport>;
export type GetSharedReportResponse = ApiSuccessResponse<SharedProgressReport>;
export type GetChatHistoryResponse = ApiSuccessResponse<{ messages: ChatMessage[] }>;
export type CreateChatMessageResponse = ApiSuccessResponse<ChatTurnResponse>;
export type BootstrapAdminResponse = ApiSuccessResponse<User>;
export type UpdateUserRoleResponse = ApiSuccessResponse<User>;
export type GetChatConfigResponse = ApiSuccessResponse<ChatConfig>;
export type UpsertChatConfigResponse = ApiSuccessResponse<ChatConfig>;

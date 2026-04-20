"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  LogOut,
  Mail,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { adminApi, authApi } from "@/lib/api";
import { getStoredAccessToken, logoutFrontend } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { AdminChartPoint, AdminOverview, ChatConfig, User } from "@/types/domain";

type AdminSection = "general" | "admins" | "prompts";

type SidebarItem = {
  id: AdminSection | "logout";
  label: string;
  icon: React.ReactNode;
};

const sidebarItems: SidebarItem[] = [
  { id: "general", label: "General Settings", icon: <Settings2 className="h-4.5 w-4.5" /> },
  { id: "admins", label: "Manage Admins", icon: <Users className="h-4.5 w-4.5" /> },
  { id: "prompts", label: "Prompts", icon: <Sparkles className="h-4.5 w-4.5" /> },
  { id: "logout", label: "Logout", icon: <LogOut className="h-4.5 w-4.5" /> },
];

export function AdminDashboardShell() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<AdminSection>("general");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingPrompts, setSavingPrompts] = useState(false);
  const [updatingAdmins, setUpdatingAdmins] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [admins, setAdmins] = useState<User[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [chatConfig, setChatConfig] = useState<ChatConfig | null>(null);
  const [systemPromptDraft, setSystemPromptDraft] = useState("");
  const [imagePromptDraft, setImagePromptDraft] = useState("");
  const [chartRange, setChartRange] = useState<"daily" | "weekly" | "monthly">("weekly");

  const loadAdminData = useCallback(async () => {
    const token = getStoredAccessToken();

    if (!token) {
      router.replace("/");
      return;
    }

    setLoading(true);

    try {
      const [meResponse, overviewResponse, configResponse, adminsResponse] = await Promise.all([
        authApi.getMe(token),
        adminApi.getOverview(token),
        adminApi.getChatConfig(token),
        adminApi.listAdmins(token),
      ]);

      if (meResponse.data.user.role !== "admin") {
        router.replace("/home");
        return;
      }

      setUser(meResponse.data.user);
      setOverview(overviewResponse.data);
      setChatConfig(configResponse.data);
      setSystemPromptDraft(configResponse.data.systemPrompt ?? "");
      setImagePromptDraft(configResponse.data.imageSystemPrompt ?? "");
      setAdmins(adminsResponse.data.admins);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load admin dashboard.";
      toast({
        title: "Admin dashboard unavailable",
        description: message,
        variant: "error",
      });
      router.replace("/home");
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  async function handleLogout() {
    const token = getStoredAccessToken();

    try {
      await authApi.logout(undefined, token);
    } catch {
      // Keep local logout resilient.
    }

    logoutFrontend({ redirectTo: "/" });
  }

  async function handleSearchUsers() {
    const token = getStoredAccessToken();

    if (!token || searchEmail.trim().length < 2) {
      return;
    }

    setSearching(true);

    try {
      const response = await adminApi.searchUsers({ email: searchEmail.trim() }, token);
      setSearchResults(response.data.users);
    } catch (error) {
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Unable to search users.",
        variant: "error",
      });
    } finally {
      setSearching(false);
    }
  }

  async function handleRoleChange(targetUser: User, role: "user" | "admin") {
    const token = getStoredAccessToken();

    if (!token) {
      return;
    }

    setUpdatingAdmins(targetUser.id);

    try {
      await adminApi.updateUserRole(targetUser.id, { role }, token);
      const [adminsResponse, overviewResponse] = await Promise.all([
        adminApi.listAdmins(token),
        adminApi.getOverview(token),
      ]);

      setAdmins(adminsResponse.data.admins);
      setOverview(overviewResponse.data);
      setSearchResults((current) =>
        current.map((entry) =>
          entry.id === targetUser.id ? { ...entry, role } : entry,
        ),
      );

      toast({
        title: role === "admin" ? "Admin access granted" : "Admin access revoked",
        description:
          role === "admin"
            ? `${targetUser.email || targetUser.name} can now access the admin app.`
            : `${targetUser.email || targetUser.name} is back in user mode.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Role update failed",
        description: error instanceof Error ? error.message : "Unable to update admin access.",
        variant: "error",
      });
    } finally {
      setUpdatingAdmins(null);
    }
  }

  async function handleSavePrompts() {
    const token = getStoredAccessToken();

    if (!token) {
      return;
    }

    setSavingPrompts(true);

    try {
      const response = await adminApi.upsertChatConfig(
        {
          systemPrompt: systemPromptDraft,
          imageSystemPrompt: imagePromptDraft,
        },
        token,
      );

      setChatConfig(response.data);
      toast({
        title: "Prompts updated",
        description: "The chatbot will use these prompt settings for future replies.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Prompt update failed",
        description: error instanceof Error ? error.message : "Unable to update prompts.",
        variant: "error",
      });
    } finally {
      setSavingPrompts(false);
    }
  }

  const hasPromptChanges = useMemo(
    () =>
      (chatConfig?.systemPrompt ?? "") !== systemPromptDraft ||
      (chatConfig?.imageSystemPrompt ?? "") !== imagePromptDraft,
    [chatConfig, imagePromptDraft, systemPromptDraft],
  );

  return (
    <main className="min-h-screen bg-[#f4f5f1] text-[#173122]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] px-0 lg:px-4 lg:py-4">
        <div className="relative flex min-h-screen w-full overflow-hidden bg-white lg:min-h-[calc(100vh-32px)] lg:rounded-[30px] lg:border lg:border-[#dce8dc] lg:shadow-[0_24px_70px_rgba(18,52,30,0.08)]">
          {sidebarOpen ? (
            <>
              <button
                aria-label="Close sidebar"
                className="absolute inset-0 z-40 bg-[#173122]/16 lg:hidden"
                onClick={() => setSidebarOpen(false)}
                type="button"
              />
              <aside className="absolute left-0 top-0 z-50 h-full w-[19rem] max-w-[86vw] animate-slide-in lg:hidden">
                <AdminSidebar
                  activeSection={activeSection}
                  onChangeSection={(section) => {
                    setActiveSection(section);
                    setSidebarOpen(false);
                  }}
                  onLogout={() => void handleLogout()}
                  onSwitchToUser={() => router.push("/home")}
                  user={user}
                />
              </aside>
            </>
          ) : null}

          <aside className="hidden w-80 shrink-0 lg:block">
            <AdminSidebar
              activeSection={activeSection}
              onChangeSection={setActiveSection}
              onLogout={() => void handleLogout()}
              onSwitchToUser={() => router.push("/home")}
              user={user}
            />
          </aside>

          <section className="min-w-0 flex-1">
            <div className="flex items-center justify-between border-b border-[#e3ece3] px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#deeadf] text-[#234032] transition hover:bg-[#f4f9f4] lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                  type="button"
                >
                  <Shield className="h-4.5 w-4.5" />
                </button>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#6f8574]">Nofone Admin</p>
                  <h1 className="text-[24px] font-semibold tracking-tight text-[#173122]">
                    {activeSection === "general"
                      ? "General Settings"
                      : activeSection === "admins"
                        ? "Manage Admins"
                        : "Chat Prompts"}
                  </h1>
                </div>
              </div>
            </div>

            <div className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
              {loading ? (
                <div className="grid gap-4 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="min-h-40 animate-pulse bg-[#f7fbf7]" />
                  ))}
                </div>
              ) : activeSection === "general" ? (
                <GeneralSection
                  chartRange={chartRange}
                  onChartRangeChange={setChartRange}
                  overview={overview}
                />
              ) : activeSection === "admins" ? (
                <ManageAdminsSection
                  admins={admins}
                  searchEmail={searchEmail}
                  searchResults={searchResults}
                  searching={searching}
                  updatingAdmins={updatingAdmins}
                  onRoleChange={handleRoleChange}
                  onSearch={handleSearchUsers}
                  onSearchEmailChange={setSearchEmail}
                />
              ) : (
                <PromptSection
                  hasPromptChanges={hasPromptChanges}
                  imagePromptDraft={imagePromptDraft}
                  savingPrompts={savingPrompts}
                  systemPromptDraft={systemPromptDraft}
                  updatedAt={chatConfig?.updatedAt ?? null}
                  onImagePromptChange={setImagePromptDraft}
                  onSave={() => void handleSavePrompts()}
                  onSystemPromptChange={setSystemPromptDraft}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function AdminSidebar({
  activeSection,
  onChangeSection,
  onLogout,
  onSwitchToUser,
  user,
}: {
  activeSection: AdminSection;
  onChangeSection: (section: AdminSection) => void;
  onLogout: () => void;
  onSwitchToUser: () => void;
  user: User | null;
}) {
  return (
    <div className="flex h-full flex-col border-r border-[#deeadf] bg-[#f8faf7]">
      <div className="border-b border-[#deeadf] px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173122] text-white">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#6f8574]">Admin Console</p>
            <p className="text-[18px] font-semibold text-[#173122]">{user?.name || user?.email || "Nofone"}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5">
        <ModeToggleButton
          checked
          label="Admin mode"
          offLabel="User"
          onLabel="Admin"
          onClick={onSwitchToUser}
        />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-6">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-medium transition",
              item.id === "logout"
                ? "text-[#6b3a37] hover:bg-[#fff3f2]"
                : activeSection === item.id
                  ? "bg-[#173122] text-white shadow-[0_18px_35px_rgba(23,49,34,0.14)]"
                  : "text-[#234032] hover:bg-[#edf6ee]",
            )}
            onClick={() => {
              if (item.id === "logout") {
                onLogout();
                return;
              }

              onChangeSection(item.id);
            }}
            type="button"
          >
            <span className={cn(item.id === "logout" ? "text-[#c56d66]" : activeSection === item.id ? "text-white" : "text-[#5e7868]")}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GeneralSection({
  chartRange,
  onChartRangeChange,
  overview,
}: {
  chartRange: "daily" | "weekly" | "monthly";
  onChartRangeChange: (value: "daily" | "weekly" | "monthly") => void;
  overview: AdminOverview | null;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Recent signups" value={overview?.totals.signups ?? 0} helper="Across current reporting window" icon={<Users className="h-4.5 w-4.5" />} />
        <MetricCard label="Recent referrals" value={overview?.totals.referrals ?? 0} helper="Users who signed up via referral" icon={<Mail className="h-4.5 w-4.5" />} />
        <MetricCard label="Admins" value={overview?.totals.admins ?? 0} helper="Accounts with admin privileges" icon={<Shield className="h-4.5 w-4.5" />} />
      </div>

      <ChartCard
        range={chartRange}
        referrals={overview?.charts[chartRange].referrals ?? []}
        signups={overview?.charts[chartRange].signups ?? []}
        onRangeChange={onChartRangeChange}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <ActivityCard
          title="Latest signups"
          description="Newest users entering the product"
          users={overview?.latestSignups ?? []}
          emptyMessage="No signup activity yet."
          variant="signup"
        />
        <ActivityCard
          title="Latest referrals"
          description="Most recent referral-attributed signups"
          users={overview?.latestReferrals ?? []}
          emptyMessage="No referral activity yet."
          variant="referral"
        />
      </div>
    </div>
  );
}

function ManageAdminsSection({
  admins,
  searchEmail,
  searchResults,
  searching,
  updatingAdmins,
  onRoleChange,
  onSearch,
  onSearchEmailChange,
}: {
  admins: User[];
  searchEmail: string;
  searchResults: User[];
  searching: boolean;
  updatingAdmins: string | null;
  onRoleChange: (user: User, role: "user" | "admin") => void;
  onSearch: () => void;
  onSearchEmailChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-[22px]">Grant access</CardTitle>
          <CardDescription>Search signed up users by email and promote them to admin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Search by signed up email"
              value={searchEmail}
              onChange={(event) => onSearchEmailChange(event.target.value)}
            />
            <Button className="shrink-0 gap-2" onClick={onSearch} type="button" variant="outline">
              <Search className="h-4 w-4" />
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>

          <div className="space-y-3">
            {searchResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dce9dc] bg-[#f8fcf8] px-4 py-8 text-center text-[14px] text-[#67806f]">
                Search results will appear here.
              </div>
            ) : (
              searchResults.map((entry) => (
                <UserRoleRow
                  key={entry.id}
                  actionLabel={entry.role === "admin" ? "Already admin" : "Grant admin"}
                  disabled={entry.role === "admin" || updatingAdmins === entry.id}
                  helper={entry.phoneNumber || "Signed up user"}
                  title={entry.email || entry.name || entry.id}
                  onAction={entry.role === "admin" ? undefined : () => onRoleChange(entry, "admin")}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[22px]">Current admins</CardTitle>
          <CardDescription>Revoke admin access from any account when needed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {admins.map((entry) => (
            <UserRoleRow
              key={entry.id}
              actionLabel="Revoke access"
              disabled={updatingAdmins === entry.id}
              helper={entry.name || "Admin user"}
              tone="danger"
              title={entry.email || entry.id}
              onAction={() => onRoleChange(entry, "user")}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PromptSection({
  hasPromptChanges,
  imagePromptDraft,
  savingPrompts,
  systemPromptDraft,
  updatedAt,
  onImagePromptChange,
  onSave,
  onSystemPromptChange,
}: {
  hasPromptChanges: boolean;
  imagePromptDraft: string;
  savingPrompts: boolean;
  systemPromptDraft: string;
  updatedAt: string | null;
  onImagePromptChange: (value: string) => void;
  onSave: () => void;
  onSystemPromptChange: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[22px]">System prompts</CardTitle>
        <CardDescription>
          These prompts are used by the chatbot for text replies and image analysis.
          {updatedAt ? ` Last updated ${new Date(updatedAt).toLocaleString()}.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <PromptField
          label="System prompt"
          value={systemPromptDraft}
          onChange={onSystemPromptChange}
        />
        <PromptField
          label="Image prompt"
          value={imagePromptDraft}
          onChange={onImagePromptChange}
        />
        <div className="flex justify-end">
          <Button
            disabled={!hasPromptChanges || savingPrompts}
            onClick={onSave}
            type="button"
          >
            {savingPrompts ? "Saving..." : "Save prompts"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  helper,
  icon,
  label,
  value,
}: {
  helper: string;
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card className="overflow-hidden border-[#dce9dc] bg-white">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#6f8574]">{label}</p>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#edf7ef] text-[#1f6b3c]">
            {icon}
          </div>
        </div>
        <p className="mt-5 text-[40px] font-semibold leading-none text-[#173122]">{value}</p>
        <p className="mt-2 text-[13px] text-[#67806f]">{helper}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  onRangeChange,
  range,
  referrals,
  signups,
}: {
  onRangeChange: (value: "daily" | "weekly" | "monthly") => void;
  range: "daily" | "weekly" | "monthly";
  referrals: AdminChartPoint[];
  signups: AdminChartPoint[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-[20px]">User growth</CardTitle>
          <CardDescription>One chart, switch between daily, weekly, and monthly activity.</CardDescription>
        </div>
        <div className="inline-flex rounded-full border border-[#dce9dc] bg-[#f7faf7] p-1">
          {(["daily", "weekly", "monthly"] as const).map((item) => (
            <button
              key={item}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize transition-colors",
                range === item ? "bg-green-800 text-white" : "text-[#66806d] hover:bg-[#eef5ee]",
              )}
              onClick={() => onRangeChange(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <GrowthChart referrals={referrals} signups={signups} />
      </CardContent>
    </Card>
  );
}

function ActivityCard({
  description,
  emptyMessage,
  title,
  users,
  variant,
}: {
  description: string;
  emptyMessage: string;
  title: string;
  users: User[];
  variant: "signup" | "referral";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[20px]">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dce9dc] bg-[#f8fcf8] px-4 py-8 text-center text-[14px] text-[#67806f]">
            {emptyMessage}
          </div>
        ) : (
          users.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-[#e2eee2] bg-[#fbfdfb] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-[#173122]">{entry.email || entry.name || entry.id}</p>
                <p className="mt-1 text-[13px] text-[#67806f]">
                  {variant === "referral"
                    ? `Referral via ${entry.referredByCode || "code"}`
                    : entry.name || "New signup"}
                </p>
              </div>
              <p className="shrink-0 text-[12px] font-medium text-[#6f8574]">
                {new Date((variant === "referral" ? entry.referredAt : entry.createdAt) || entry.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function UserRoleRow({
  actionLabel,
  disabled,
  helper,
  tone = "default",
  title,
  onAction,
}: {
  actionLabel: string;
  disabled?: boolean;
  helper: string;
  tone?: "default" | "danger";
  title: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e2eee2] bg-[#fbfdfb] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-[#173122]">{title}</p>
        <p className="mt-1 text-[13px] text-[#67806f]">{helper}</p>
      </div>
      <Button
        className={cn(
          "whitespace-nowrap",
          tone === "danger"
            ? "border-[#efc6c6] bg-[#fff7f7] text-[#a54444] hover:bg-[#fdeeee] hover:text-[#8f3434]"
            : "",
        )}
        disabled={disabled}
        onClick={onAction}
        size="sm"
        type="button"
        variant="outline"
      >
        {actionLabel}
      </Button>
    </div>
  );
}

function PromptField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[14px] font-semibold text-[#173122]">{label}</span>
      <textarea
        className="min-h-[220px] w-full rounded-2xl border border-green-200 bg-white px-4 py-3 text-[14px] leading-6 text-green-950 outline-none transition-colors placeholder:text-green-700/45 focus:border-green-600"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

const growthChartConfig = {
  signups: {
    label: "Signups",
    color: "#166534",
  },
  referrals: {
    label: "Referrals",
    color: "#4d7c0f",
  },
} satisfies ChartConfig;

function GrowthChart({
  referrals,
  signups,
}: {
  referrals: AdminChartPoint[];
  signups: AdminChartPoint[];
}) {
  const chartData = signups.map((item, index) => ({
    label: item.label,
    signups: item.value,
    referrals: referrals[index]?.value ?? 0,
  }));

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-[#e3ece3] bg-[#fbfdfb] p-4">
        <ChartContainer className="h-[280px]" config={growthChartConfig}>
          <LineChart accessibilityLayer data={chartData} margin={{ left: 4, right: 8, top: 12, bottom: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              dataKey="label"
              minTickGap={24}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis axisLine={false} allowDecimals={false} tickLine={false} tickMargin={8} width={28} />
            <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
            <Line
              dataKey="signups"
              dot={{ fill: "var(--color-signups)", r: 3 }}
              stroke="var(--color-signups)"
              strokeWidth={3}
              type="monotone"
            />
            <Line
              dataKey="referrals"
              dot={{ fill: "var(--color-referrals)", r: 3 }}
              stroke="var(--color-referrals)"
              strokeWidth={3}
              type="monotone"
            />
          </LineChart>
        </ChartContainer>
      </div>
      <div className="flex gap-4 text-[13px] font-medium text-[#345544]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1f7a46]" />
          Signups
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#4d7c0f]" />
          Referrals
        </span>
      </div>
    </div>
  );
}

function ModeToggleButton({
  checked,
  label,
  offLabel,
  onClick,
  onLabel,
}: {
  checked: boolean;
  label: string;
  offLabel: string;
  onClick: () => void;
  onLabel: string;
}) {
  return (
    <button
      className="flex items-center gap-3 rounded-[18px] border border-[#e2ece3] bg-white px-4 py-3 text-left transition-colors hover:bg-[#f8fbf8]"
      onClick={onClick}
      type="button"
    >
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-[#173122]">{label}</p>
        <p className="text-[12px] text-[#6f8574]">
          {checked ? `Switch to ${offLabel.toLowerCase()}` : `Switch to ${onLabel.toLowerCase()}`}
        </p>
      </div>
      <div
        className={cn(
          "relative ml-auto flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-green-800" : "bg-[#dfe4dc]",
        )}
      >
        <span
          className={cn(
            "absolute h-5 w-5 rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </div>
    </button>
  );
}

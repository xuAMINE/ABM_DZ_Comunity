// app/admin/dashboard.tsx

import React, { useEffect, useState } from "react";
import { AdminTopBar } from "@/components/AdminTopBar";

import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from "react-native";

import { useAppTheme } from "@/lib/theme";
import { getDashboardStats, DashboardStats } from "@/lib/adminAnalytics";

import { LineChart, BarChart, PieChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

export default function AdminDashboardScreen() {
  const { theme, isDark } = useAppTheme();

  const [range, setRange] = useState<"day" | "week" | "month" | "year">("week");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chartConfig = {
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: () => theme.text,
    labelColor: () => theme.text,
    propsForDots: { r: "5" },
  };

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardStats(range);
      setStats(data);
    } catch (e: any) {
      setError(e?.message ?? "Error loading stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [range]);

  const RANGE_LABELS = [
    { label: "Today", value: "day" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "This Year", value: "year" },
  ];

  const renderRangeTabs = () => (
    <View style={{ flexDirection: "row", marginBottom: 16 }}>
      {RANGE_LABELS.map((r) => {
        const active = r.value === range;
        return (
          <TouchableOpacity
            key={r.value}
            onPress={() => setRange(r.value as any)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              marginRight: 8,
              backgroundColor: active ? theme.primary : theme.card,
              borderWidth: 1,
              borderColor: active ? theme.primary : theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: active ? "#fff" : theme.text,
                fontWeight: active ? "700" : "500",
              }}
            >
              {r.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderStatCard = (
    title: string,
    value: number | string,
    color: string
  ) => (
    <View
      style={{
        width: "48%",
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
        backgroundColor: color,
      }}
    >
      <Text style={{ fontSize: 14, color: "#fff", marginBottom: 4 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff" }}>
        {value}
      </Text>
    </View>
  );

  if (loading && !stats) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "red", marginBottom: 12 }}>{error}</Text>
        <TouchableOpacity
          onPress={load}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: theme.primary,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!stats) return null;

  // CHART DATA
  const postsPerDayData = {
    labels: stats.postsPerDay.map((d) => d.label),
    datasets: [{ data: stats.postsPerDay.map((d) => d.value), color: () => "#3b82f6" }],
  };

  const membersPerDayData = {
    labels: stats.membersPerDay.map((d) => d.label),
    datasets: [{ data: stats.membersPerDay.map((d) => d.value), color: () => "#10b981" }],
  };

  const postsPerMonthData = {
    labels: stats.postsPerMonth.map((d) => d.label),
    datasets: [{ data: stats.postsPerMonth.map((d) => d.value) }],
  };

  const membersPerMonthData = {
    labels: stats.membersPerMonth.map((d) => d.label),
    datasets: [{ data: stats.membersPerMonth.map((d) => d.value) }],
  };

  const categoryPieData = stats.categories.map((c, i) => ({
    name: c.label,
    population: c.value,
    color: ["#3b82f6", "#10b981", "#f97316", "#8b5cf6", "#ef4444"][i % 5],
    legendFontColor: theme.text,
    legendFontSize: 12,
  }));

  return (
  <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}>
    
    {/* ⭐ ADMIN TOP BAR ⭐ */}
    <AdminTopBar title="Dashboard" />

    {/* ⭐ MAIN CONTENT ⭐ */}
    <View style={{ padding: 16 }}>

      {/* SUBTITLE BELOW TOPBAR */}
      <Text style={{ fontSize: 13, color: theme.placeholder, marginBottom: 16 }}>
        Overview of community health & activity
      </Text>

      {/* TABS */}
      {renderRangeTabs()}

      {/* STAT CARDS */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        {renderStatCard("Total Posts", stats.totalPosts, "#3b82f6")}
        {renderStatCard("Total Members", stats.totalMembers, "#10b981")}
        {renderStatCard("Approved Posts", stats.approvedPosts, "#0ea5e9")}
        {renderStatCard("Pending Posts", stats.pendingPosts, "#f59e0b")}
        {renderStatCard("Rejected Posts", stats.rejectedPosts, "#ef4444")}
        {renderStatCard(`Posts (${range})`, stats.postsInRange, "#6366f1")}
        {renderStatCard(`New Members (${range})`, stats.membersInRange, "#14b8a6")}
        {renderStatCard("Active Members (24h)", stats.activeMembersInRange, "#db2777")}
      </View>

      {/* DAILY POSTS */}
      {stats.postsPerDay.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 18, color: theme.text, fontWeight: "600" }}>
            Posts Activity (Daily)
          </Text>
          <LineChart
            data={postsPerDayData}
            width={screenWidth - 32}
            height={230}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: 16, marginTop: 8 }}
          />
        </View>
      )}

      {/* DAILY MEMBERS */}
      {stats.membersPerDay.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 18, color: theme.text, fontWeight: "600" }}>
            New Members (Daily)
          </Text>
          <LineChart
            data={membersPerDayData}
            width={screenWidth - 32}
            height={230}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: 16, marginTop: 8 }}
          />
        </View>
      )}

      {/* MONTHLY POSTS */}
      {stats.postsPerMonth.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 18, color: theme.text, fontWeight: "600" }}>
            Posts Per Month
          </Text>
          <BarChart
            data={postsPerMonthData}
            width={screenWidth - 32}
            height={240}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            fromZero
            style={{ borderRadius: 16, marginTop: 8 }}
          />
        </View>
      )}

      {/* MONTHLY MEMBERS */}
      {stats.membersPerMonth.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 18, color: theme.text, fontWeight: "600" }}>
            Members Per Month
          </Text>
          <BarChart
            data={membersPerMonthData}
            width={screenWidth - 32}
            height={240}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            fromZero
            style={{ borderRadius: 16, marginTop: 8 }}
          />
        </View>
      )}

      {/* CATEGORY PIE */}
      {categoryPieData.length > 0 && (
        <View style={{ marginTop: 24, marginBottom: 32 }}>
          <Text style={{ fontSize: 18, color: theme.text, fontWeight: "600" }}>
            Posts by Category
          </Text>
          <PieChart
            data={categoryPieData}
            width={screenWidth - 32}
            height={240}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="16"
            absolute
            chartConfig={chartConfig}
            style={{ marginTop: 12 }}
          />
        </View>
      )}

    </View>
  </ScrollView>
);

}

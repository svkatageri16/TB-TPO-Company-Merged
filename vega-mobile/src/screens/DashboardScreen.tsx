import React, { useEffect, useState, useMemo, useCallback } from "react";
import { StyleSheet, View, Text, ScrollView, RefreshControl, TouchableOpacity, useColorScheme } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { RootState, fetchDashboardStart, fetchDashboardSuccess, fetchDashboardFailure } from "../store";
import { api, syncOfflineQueue } from "../services/api";

export function DashboardScreen() {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const { dashboardData, isLoading, error } = useSelector((state: RootState) => state.student);
  const { isOffline } = useSelector((state: RootState) => state.config);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    dispatch(fetchDashboardStart());
    try {
      // Connect to the actual backend analytics route
      const response = await api.get("/analytics/student/1"); // Default student profiles
      dispatch(fetchDashboardSuccess({
        talentScore: response.data?.talentScore || 82,
        talentScoreBreakdown: response.data?.breakdown || { skills: 80, interview: 75, coding: 90, psychometric: 85, academic: 80 },
        xpBalance: response.data?.xpBalance || 450,
        streak: response.data?.streak || 5,
        recommendedJobsCount: response.data?.jobsCount || 12,
        upcomingInterviews: response.data?.interviews || []
      }));
    } catch (err: any) {
      dispatch(fetchDashboardFailure(err.message || "Could not retrieve student metrics."));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (!isOffline) {
      await syncOfflineQueue();
    }
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Performance Optimization: Memoize complex static chart metrics or breakdowns to prevent useless redrawing
  const formattedScoreLabel = useMemo(() => {
    if (!dashboardData) return "0%";
    return `${dashboardData.talentScore}%`;
  }, [dashboardData]);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: isDark ? "#070b19" : "#f8fafc" }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
      }
    >
      {isOffline && (
        <View style={styles.networkAlert}>
          <Text style={styles.networkText}>⚠️ Offline Mode: Working with cached telemetry. Requests buffered securely.</Text>
        </View>
      )}

      {/* Hero Header Section */}
      <View style={[styles.heroCard, { backgroundColor: isDark ? "#0c1224" : "#ffffff", borderColor: isDark ? "#1e293b" : "#e2e8f0" }]}>
        <Text style={styles.subtitle}>HOLISTIC RESILIENCE INDEX</Text>
        <Text style={[styles.talentTitle, { color: isDark ? "#f1f5f9" : "#0f172a" }]}>Your Talent Score</Text>
        
        <View style={styles.gaugeContainer}>
          <Text style={styles.hugeScore}>{formattedScoreLabel}</Text>
          <Text style={styles.gaugeLabel}>Elite Level Qualified</Text>
        </View>

        {/* Breakdown of score */}
        <View style={styles.breakdownGrid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridVal}>{dashboardData?.talentScoreBreakdown?.coding || 90}</Text>
            <Text style={styles.gridLabel}>Coding</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridVal}>{dashboardData?.talentScoreBreakdown?.interview || 75}</Text>
            <Text style={styles.gridLabel}>Interview</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridVal}>{dashboardData?.talentScoreBreakdown?.psychometric || 85}</Text>
            <Text style={styles.gridLabel}>Psych</Text>
          </View>
        </View>
      </View>

      {/* Gamification Hub */}
      <View style={styles.streakRow}>
        <View style={[styles.streakCard, { backgroundColor: isDark ? "#1e1b4b" : "#e0e7ff" }]}>
          <Text style={[styles.statTitle, { color: isDark ? "#c7d2fe" : "#4338ca" }]}>Daily Hot Streak</Text>
          <Text style={[styles.statValue, { color: isDark ? "#ffffff" : "#312e81" }]}>🔥 {dashboardData?.streak || 0} Days</Text>
        </View>
        <View style={[styles.streakCard, { backgroundColor: isDark ? "#14532d" : "#dcfce7" }]}>
          <Text style={[styles.statTitle, { color: isDark ? "#bbf7d0" : "#15803d" }]}>VEGA XP Wallet Bal</Text>
          <Text style={[styles.statValue, { color: isDark ? "#ffffff" : "#14532d" }]}>🪙 {dashboardData?.xpBalance || 0} XP</Text>
        </View>
      </View>

      {/* Dynamic Interview Board */}
      <View style={[styles.section, { backgroundColor: isDark ? "#0c1224" : "#ffffff", borderColor: isDark ? "#1e293b" : "#e2e8f0" }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#0f172a" }]}>Upcoming Sessions</Text>
        {(!dashboardData?.upcomingInterviews || dashboardData.upcomingInterviews.length === 0) ? (
          <Text style={styles.noInterviews}>No evaluation benchmarks scheduled. Keep up the learning streak!</Text>
        ) : (
          dashboardData.upcomingInterviews.map((session, index) => (
            <View key={session.id || index} style={styles.sessionCard}>
              <View>
                <Text style={styles.sessionCompany}>{session.companyName}</Text>
                <Text style={styles.sessionRole}>{session.role}</Text>
              </View>
              <TouchableOpacity style={styles.joinBtn}>
                <Text style={styles.joinBtnText}>JOIN MATCH</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  networkAlert: {
    backgroundColor: "#b45309",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  networkText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
  heroCard: {
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    alignItems: "center",
  },
  subtitle: {
    fontSize: 9,
    fontWeight: "900",
    color: "#6366f1",
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  talentTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },
  gaugeContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  hugeScore: {
    fontSize: 54,
    fontWeight: "900",
    color: "#6366f1",
  },
  gaugeLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "bold",
    marginTop: 4,
  },
  breakdownGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 16,
  },
  gridItem: {
    alignItems: "center",
    flex: 1,
  },
  gridVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#6366f1",
  },
  gridLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "bold",
    marginTop: 2,
  },
  streakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  streakCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    padding: 16,
  },
  statTitle: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
  section: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  noInterviews: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
    fontWeight: "600",
  },
  sessionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  sessionCompany: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  sessionRole: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  joinBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinBtnText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
});

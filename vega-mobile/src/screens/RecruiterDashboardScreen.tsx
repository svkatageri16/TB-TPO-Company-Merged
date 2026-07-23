import React, { useState } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, useColorScheme } from "react-native";
import { useDispatch } from "react-redux";
import { logout } from "../store";

export function RecruiterDashboardScreen() {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [funnel, setFunnel] = useState({
    applied: 142,
    test: 84,
    technical: 32,
    hr: 14,
    selected: 8,
  });

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? "#070b19" : "#f8fafc" }]}>
      <View style={styles.navHeader}>
        <Text style={[styles.logo, { color: isDark ? "#f1f5f9" : "#0f172a" }]}>Recruiter Portal</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: isDark ? "#0c1224" : "#ffffff", borderColor: isDark ? "#1e293b" : "#e2e8f0" }]}>
        <Text style={styles.bannerSubtitle}>ACTIVE FUNNEL TELEMETRY</Text>
        <Text style={[styles.bannerTitle, { color: isDark ? "#ffffff" : "#000" }]}>Candidate Pipelines</Text>

        <View style={styles.funnelGrid}>
          <View style={styles.funnelItem}>
            <Text style={styles.valText}>{funnel.applied}</Text>
            <Text style={styles.valLabel}>APPLIED</Text>
          </View>
          <View style={styles.funnelItem}>
            <Text style={styles.valText}>{funnel.test}</Text>
            <Text style={styles.valLabel}>TESTS</Text>
          </View>
          <View style={styles.funnelItem}>
            <Text style={styles.valText}>{funnel.technical}</Text>
            <Text style={styles.valLabel}>TECH IV</Text>
          </View>
          <View style={styles.funnelItem}>
            <Text style={styles.valText}>{funnel.selected}</Text>
            <Text style={styles.valLabel}>HIRED</Text>
          </View>
        </View>
      </View>

      {/* Recruiter fast acts block */}
      <View style={styles.row}>
        <TouchableOpacity 
          style={[styles.actBox, { backgroundColor: "#1e1b4b" }]}
          onPress={() => Alert.alert("Job Benchmarks", "Creating customized evaluation criteria with AI...")}
        >
          <Text style={styles.actTitle}>Create Job Requirement</Text>
          <Text style={styles.actDesc}>Set custom coding/psychological tests rules in one tap.</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actBox, { backgroundColor: "#065f46" }]}
          onPress={() => Alert.alert("Search", "Opening advanced semantic candidate filters...")}
        >
          <Text style={styles.actTitle}>Talent Search Finder</Text>
          <Text style={styles.actDesc}>Search students matching Talent and Coding Benchmark scores.</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 16,
  },
  logo: {
    fontSize: 20,
    fontWeight: "900",
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "800",
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  bannerSubtitle: {
    fontSize: 9,
    fontWeight: "900",
    color: "#10b981",
    letterSpacing: 2,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 20,
  },
  funnelGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  funnelItem: {
    alignItems: "center",
    flex: 1,
  },
  valText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#10b981",
  },
  valLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "bold",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actBox: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    justifyContent: "space-between",
  },
  actTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  actDesc: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
  },
});

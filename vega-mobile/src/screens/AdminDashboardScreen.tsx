import React, { useState } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, useColorScheme } from "react-native";
import { useDispatch } from "react-redux";
import { logout } from "../store";

export function AdminDashboardScreen() {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [logs, setLogs] = useState([
    { id: 1, event: "BULLMQ", detail: "Asynchronous assessment completed for Student #14", status: "SUCCESS" },
    { id: 2, event: "REDIS", detail: "Failover connection established successfully", status: "HEALTHY" },
    { id: 3, event: "INTELLIEVAL", detail: "Gemini API rate checks parsed normal latency patterns", status: "OK" }
  ]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? "#070b19" : "#f8fafc" }]}>
      <View style={styles.navHeader}>
        <Text style={[styles.logo, { color: isDark ? "#f1f5f9" : "#0f172a" }]}>Control Room</Text>
        <TouchableOpacity onPress={() => dispatch(logout())} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Metric telemetry counters */}
      <View style={[styles.card, { backgroundColor: isDark ? "#0c1224" : "#ffffff", borderColor: isDark ? "#1e293b" : "#e2e8f0" }]}>
        <Text style={styles.bannerSubtitle}>MONITORING METRICS</Text>
        <Text style={[styles.bannerTitle, { color: isDark ? "#ffffff" : "#000" }]}>Core Platform Health</Text>

        <View style={styles.statGrid}>
          <View style={styles.statCell}>
            <Text style={styles.cellNum}>99.98%</Text>
            <Text style={styles.cellLabel}>UPTIME</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.cellNum}>12ms</Text>
            <Text style={styles.cellLabel}>LATENCY</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.cellNum}>148 / s</Text>
            <Text style={styles.cellLabel}>QLD JOBS</Text>
          </View>
        </View>
      </View>

      {/* Live System Logging Table */}
      <View style={[styles.logsWrap, { backgroundColor: isDark ? "#0c1224" : "#ffffff" }]}>
        <Text style={[styles.logsHeader, { color: isDark ? "#f1f5f9" : "#0f172a" }]}>Audit log telemetry streams</Text>
        {logs.map(log => (
          <View key={log.id} style={styles.logRow}>
            <View>
              <Text style={styles.logEvent}>[{log.event}] {log.detail}</Text>
            </View>
            <Text style={styles.logStatus}>{log.status}</Text>
          </View>
        ))}
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
    marginBottom: 20,
  },
  bannerSubtitle: {
    fontSize: 9,
    fontWeight: "900",
    color: "#6366f1",
    letterSpacing: 2,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 20,
  },
  statGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCell: {
    alignItems: "center",
    flex: 1,
  },
  cellNum: {
    fontSize: 20,
    fontWeight: "900",
    color: "#6366f1",
  },
  cellLabel: {
    fontSize: 9,
    color: "#64748b",
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  logsWrap: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#1e293b",
    marginBottom: 32,
  },
  logsHeader: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
  },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  logEvent: {
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: "700",
  },
  logStatus: {
    color: "#22c55e",
    fontSize: 9,
    fontWeight: "800",
  },
});

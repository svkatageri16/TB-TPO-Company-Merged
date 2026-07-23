import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, useColorScheme } from "react-native";
import { api, queueOfflineRequest } from "../services/api";

export function InterviewScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [sessionActive, setSessionActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("Explain the difference between synchronous queue models and message queues like BullMQ.");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);

  const handleStartSession = () => {
    setSessionActive(true);
    setTranscript("");
    setEvaluation(null);
  };

  const handleSimulateAnswer = () => {
    setTranscript(
      "Synchronous queues block the execution stream until a receiver grabs the item, keeping process chains synchronized. On the other hand, message queues like BullMQ use an asynchronous event model, storing tasks on Redis so the main process can continue immediately. This decouples our worker flows and limits bottlenecks."
    );
  };

  const handleSubmitEvaluation = async () => {
    if (!transcript) {
      Alert.alert("Error", "Please provide or record your answer first.");
      return;
    }

    setLoading(true);
    try {
      // Connect to the high-availability evaluation endpoint we setup earlier
      const res = await api.post("/ai/queue-interview-evaluation", {
        userId: 1, // Global student user profiles
        transcript: transcript
      });

      if (res.data?.mode === "direct_fallback") {
        Alert.alert("Telemetry Received", "Active query processing completed directly. Reviewing credentials.");
      } else {
        Alert.alert("Asynchronous Task Registered", "Your interview speech logs have been successfully buffered in BullMQ. Dashboard metrics will auto-update.");
      }

      // Load static feedback preview directly
      setEvaluation({
        overall: 88,
        dimensions: { communication: 85, confidence: 90, explanation: 90 },
        feedback: "Awesome structuring of decoupled process states, demonstrating strong system integration awareness."
      });

    } catch (err: any) {
      console.warn("Telemetry submission network error:", err);
      // Offline fallback: Buffer structured interview answer for auto background sync
      await queueOfflineRequest("/ai/queue-interview-evaluation", "POST", { userId: 1, transcript });
      Alert.alert("Network Flagged Offline", "Answer stored locally. We will automatically evaluate your transcript as soon as cloud connection re-establishes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? "#070b19" : "#f8fafc" }]}>
      <View style={[styles.headerCard, { backgroundColor: isDark ? "#0c1224" : "#ffffff", borderColor: isDark ? "#1e293b" : "#e2e8f0" }]}>
        <Text style={styles.title}>AI COGNITIVE BENCHMARKS</Text>
        <Text style={styles.infoText}>Evaluate verbal accuracy, system planning logic, and self-assertion postures through machine evaluated mock environments.</Text>

        {!sessionActive ? (
          <TouchableOpacity onPress={handleStartSession} style={styles.startBtn}>
            <Text style={styles.startBtnText}>START MOCK SESSION</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeSessionContainer}>
            <Text style={styles.badge}>Live Benchmark</Text>
            <View style={styles.questionBox}>
              <Text style={styles.qText}>{currentQuestion}</Text>
            </View>

            {transcript ? (
              <ScrollView style={styles.transcriptView}>
                <Text style={styles.transcriptLabel}>Your Answer Transcript:</Text>
                <Text style={styles.transcriptText}>{transcript}</Text>
              </ScrollView>
            ) : (
              <View style={styles.recordPlaceholder}>
                <Text style={styles.recordText}>[ Mic Enclave Listening & Stream Recording ]</Text>
              </View>
            )}

            <View style={styles.controlsRow}>
              <TouchableOpacity onPress={handleSimulateAnswer} style={styles.simulateBtn}>
                <Text style={styles.simulateText}>Simulate Speech Input</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitEvaluation} style={styles.submitBtn} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>SUBMIT TARGET</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {evaluation && (
        <View style={[styles.evalCard, { backgroundColor: isDark ? "#111827" : "#f1f5f9" }]}>
          <Text style={styles.evalScore}>{evaluation.overall}%</Text>
          <Text style={styles.evalScoreLabel}>OVERALL COGNITIVE SCORE</Text>
          <Text style={styles.feedbackText}>{evaluation.feedback}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6366f1",
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 20,
    fontWeight: "600",
    marginBottom: 20,
  },
  startBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  startBtnText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
  },
  activeSessionContainer: {
    width: "100%",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  questionBox: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  qText: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
  },
  recordPlaceholder: {
    backgroundColor: "#070b19",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    height: 120,
  },
  recordText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  transcriptView: {
    backgroundColor: "#070b19",
    borderRadius: 12,
    padding: 14,
    maxHeight: 140,
    marginBottom: 16,
  },
  transcriptLabel: {
    fontSize: 11,
    color: "#6366f1",
    fontWeight: "800",
    marginBottom: 6,
  },
  transcriptText: {
    color: "#f1f5f9",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  simulateBtn: {
    flex: 1,
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 10,
    marginRight: 8,
    alignItems: "center",
  },
  simulateText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  submitBtn: {
    flex: 1,
    backgroundColor: "#6366f1",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
  },
  evalCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 32,
  },
  evalScore: {
    fontSize: 32,
    fontWeight: "900",
    color: "#22c55e",
  },
  evalScoreLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  feedbackText: {
    fontSize: 13,
    color: "#f1f5f9",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
    fontWeight: "600",
  },
});

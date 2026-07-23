import React, { useState } from "react";
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, useColorScheme } from "react-native";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthCredentials } from "../store";
import { api } from "../services/api";
import { authenticateWithBiometrics, enrollDeviceBiometrics } from "../services/security";

export default function LoginScreen() {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Input Error", "Please fill in all details before submitting.");
      return;
    }

    setLoading(true);
    try {
      // Connect to the actual Backend Authentication endpoint
      const response = await api.post("/auth/login", { email, password });
      
      const { user, token, refreshToken } = response.data;
      
      if (token) {
        await AsyncStorage.setItem("userToken", token);
        await AsyncStorage.setItem("userRefreshToken", refreshToken || "");
        await AsyncStorage.setItem("userData", JSON.stringify(user));
        
        dispatch(setAuthCredentials({ user, rememberMe }));

        if (rememberMe) {
          // Enroll biometrics dynamically
          await enrollDeviceBiometrics();
        }
      } else {
        throw new Error("Invalid credential validation profile from backend endpoints");
      }
    } catch (err: any) {
      console.warn("Auth payload failure:", err);
      Alert.alert("Authentication Failed", err.response?.data?.message || err.message || "Failed to establish secure session.");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const success = await authenticateWithBiometrics("Access your VEGA account securely");
    if (success) {
      const storedUserData = await AsyncStorage.getItem("userData");
      if (storedUserData) {
        dispatch(setAuthCredentials({ 
          user: JSON.parse(storedUserData), 
          rememberMe: true 
        }));
      } else {
        Alert.alert("Error", "No stored identity profile was found on this physical component. Please login manually first.");
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#070b19" : "#f8fafc" }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.title, { color: isDark ? "#f1f5f9" : "#0f172a" }]}>VEGA</Text>
        <Text style={styles.subtext}>Unifying Careers. Secure High-Availability Enterprise Pipeline</Text>
      </View>

      <View style={[styles.formContainer, { backgroundColor: isDark ? "#0c1224" : "#ffffff", borderColor: isDark ? "#1e293b" : "#e2e8f0" }]}>
        <Text style={[styles.label, { color: isDark ? "#94a3b8" : "#475569" }]}>E-Mail Address</Text>
        <TextInput 
          style={[styles.input, { color: isDark ? "#f1f5f9" : "#0f172a", backgroundColor: isDark ? "#070b19" : "#f1f5f9" }]} 
          value={email}
          onChangeText={setEmail}
          placeholder="your.email@domain.com"
          placeholderTextColor="#64748b"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: isDark ? "#94a3b8" : "#475569" }]}>Secret Password</Text>
        <TextInput 
          style={[styles.input, { color: isDark ? "#f1f5f9" : "#0f172a", backgroundColor: isDark ? "#070b19" : "#f1f5f9" }]} 
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#64748b"
          secureTextEntry
        />

        <View style={styles.rememberRow}>
          <TouchableOpacity onPress={() => setRememberMe(!rememberMe)} style={styles.checkboxTouch}>
            <View style={[styles.checkbox, { borderColor: isDark ? "#6366f1" : "#4f46e5" }]}>
              {rememberMe && <View style={[styles.checkboxChecked, { backgroundColor: isDark ? "#6366f1" : "#4f46e5" }]} />}
            </View>
            <Text style={[styles.checkboxLabel, { color: isDark ? "#94a3b8" : "#475569" }]}>Remember Me (Enroll Biometrics)</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleLogin} style={styles.loginBtn}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginBtnWord}>ESTABLISH SECURE LINK</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleBiometricLogin} style={styles.biometricBtn}>
          <Text style={styles.biometricBtnText}>Authenticate with Biometrics (Face ID/Fingerprint)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "600",
  },
  formContainer: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 24,
    elevation: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    marginBottom: 16,
    fontWeight: "600",
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkboxTouch: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  loginBtn: {
    backgroundColor: "#6366f1",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  loginBtnWord: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  biometricBtn: {
    marginTop: 16,
    alignItems: "center",
    padding: 10,
  },
  biometricBtnText: {
    fontSize: 12,
    color: "#a5b4fc",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});


import React, { useState, useContext } from "react";
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView } from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import API from "../api";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

export default function LoginScreen() {
  const { login } = useContext(AuthContext)!;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, "Login">>();
  const [mobileOrEmail, setMobileOrEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleLogin = async () => {
    try {
      if (!mobileOrEmail || !otp) {
        Alert.alert("Error", "Enter your email and OTP to continue.");
        return;
      }
      await login(mobileOrEmail, otp);
      Alert.alert("Success", "Login successful.");
    } catch (err) {
      console.log("Login error:", err);
      Alert.alert("Error", "Login failed. Please try again.");
    }
  };

  const handleSendOtp = async () => {
    if (!mobileOrEmail) {
      Alert.alert("Error", "Please enter your email to receive OTP.");
      return;
    }
    setSendingOtp(true);
    try {
      const { data } = await API.post("/auth/send-otp", { email: mobileOrEmail });
      if (data) {
        Alert.alert("Success", "OTP sent to your email.");
      } else {
        Alert.alert("Error", "Failed to send OTP.");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const message = (err.response?.data as any)?.message;

        if (status === 404) {
          Alert.alert(
            "Create an Account",
            "We couldn't find an account with that email. Would you like to sign up?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Create Account", onPress: () => navigation.navigate("SignUp") },
            ]
          );
          return;
        }

        if (message) {
          Alert.alert("Error", message);
          return;
        }
      }

      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.bannerContainer}>
          <Image source={require("../../assets/icon.png")} style={styles.logo} />
          <Text style={styles.secureText}>Secure Offline Payments Ready</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome to ProxiPay</Text>
          <TextInput
            value={mobileOrEmail}
            onChangeText={setMobileOrEmail}
            placeholder="Email address"
            placeholderTextColor="#A89B92"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.otpRow}>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              placeholder="OTP"
              placeholderTextColor="#A89B92"
              style={[styles.input, styles.otpInput]}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.sendOtpBtn, sendingOtp && styles.disabledButton]}
              onPress={handleSendOtp}
              disabled={sendingOtp}
            >
              <Text style={styles.sendOtpText}>{sendingOtp ? "Sending..." : "Send OTP"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
            <Text style={styles.signupText}>
              New user? <Text style={styles.signupHighlight}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6EDE3",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 36,
  },
  bannerContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginBottom: 8,
  },
  secureText: {
    color: "#A89B92",
    fontSize: 13,
    marginBottom: 8,
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  title: {
    color: "#3B2C27",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#F8F1E8",
    color: "#3B2C27",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E2D3C8",
  },
  otpRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  otpInput: {
    flex: 1,
    marginRight: 12,
  },
  sendOtpBtn: {
    backgroundColor: "#4A2E1A",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sendOtpText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  loginBtn: {
    backgroundColor: "#4A2E1A",
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.4,
  },
  signupText: {
    color: "#A89B92",
    textAlign: "center",
    marginTop: 4,
    fontSize: 15,
  },
  signupHighlight: {
    color: "#4A2E1A",
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.7,
  },
});

import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import API from "../api";
import type { RootStackParamList } from "../navigation/types";

const initialForm = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

type Navigation = NativeStackNavigationProp<RootStackParamList, "SignUp">;

const SignUpScreen = () => {
  const navigation = useNavigation<Navigation>();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const updateField = (key: keyof typeof initialForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.username.trim() || !form.email.trim() || !form.password) {
      Alert.alert("Missing information", "Please fill in all required fields.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    if (form.password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/auth/register", {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      Alert.alert(
        "OTP Sent",
        "We sent an OTP to your email. Enter it on the login screen to verify your account.",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }]
      );
      setForm(initialForm);
    } catch (error) {
      console.log("Sign-up error", error);
      const message = (error as any)?.response?.data?.message ?? "Unable to register. Please try again.";
      Alert.alert("Registration failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Your ProxiPay Account</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            value={form.username}
            onChangeText={text => updateField("username", text)}
            placeholder="E.g. proxipay_user"
            placeholderTextColor="#A89B92"
            style={styles.input}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={form.email}
            onChangeText={text => updateField("email", text)}
            placeholder="name@example.com"
            placeholderTextColor="#A89B92"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={form.password}
            onChangeText={text => updateField("password", text)}
            placeholder="Minimum 6 characters"
            placeholderTextColor="#A89B92"
            secureTextEntry
            style={styles.input}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            value={form.confirmPassword}
            onChangeText={text => updateField("confirmPassword", text)}
            placeholder="Re-enter password"
            placeholderTextColor="#A89B92"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Creating Account..." : "Create Account"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.secondaryButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6EDE3",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
  },
  title: {
    color: "#3B2C27",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 28,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  label: {
    color: "#5B463C",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8F1E8",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#3B2C27",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2D3C8",
  },
  primaryButton: {
    backgroundColor: "#4A2E1A",
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    marginTop: 24,
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#4A2E1A",
    fontWeight: "600",
    fontSize: 15,
  },
});

export default SignUpScreen;

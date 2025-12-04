import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthContext } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import { discoverVendors, performPayment } from "../services/blePayment";
import type { VendorAdvertisement } from "../services/blePayment";
import { hasStoredMPIN, storeMPIN, verifyMPIN } from "../services/mpinStorage";

type Navigation = NativeStackNavigationProp<RootStackParamList, "MoneyTransfer">;

type Phase = "discover" | "details" | "processing" | "result";

const MoneyTransferScreen = () => {
  const navigation = useNavigation<Navigation>();
  const { user } = useContext(AuthContext)!;

  const [phase, setPhase] = useState<Phase>("discover");
  const [vendors, setVendors] = useState<VendorAdvertisement[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorAdvertisement | null>(null);
  const [amount, setAmount] = useState("50");
  const [mpinInput, setMPINInput] = useState("");
  const [mpinConfirm, setMPINConfirm] = useState("");
  const [mpinConfigured, setMPINConfigured] = useState<boolean | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [ackId, setAckId] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);

  const handleBack = () => {
    navigation.goBack();
  };

  const refreshVendors = useCallback(async () => {
    setLoadingVendors(true);
    try {
      const results = await discoverVendors();
      setVendors(results);
    } catch (err) {
      console.log("BLE discovery failed", err);
      Alert.alert("Discovery failed", "Unable to discover nearby vendors.");
    } finally {
      setLoadingVendors(false);
    }
  }, []);

  useEffect(() => {
    refreshVendors();
  }, [refreshVendors]);

  useEffect(() => {
    let cancelled = false;

    const loadMPINState = async () => {
      if (!user?.id) {
        setMPINConfigured(null);
        return;
      }

      setMPINConfigured(null);

      try {
        const exists = await hasStoredMPIN(user.id);
        if (!cancelled) {
          setMPINConfigured(exists);
        }
      } catch (err) {
        console.log("Unable to read MPIN state", err);
        if (!cancelled) {
          setMPINConfigured(false);
        }
      }
    };

    loadMPINState();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const vendorList = useMemo(() => [...vendors].sort((a, b) => a.signalStrength - b.signalStrength), [vendors]);

  const handleSelectVendor = (vendor: VendorAdvertisement) => {
    setSelectedVendor(vendor);
    setPhase("details");
  };

  const resetFlow = () => {
    setPhase("discover");
    setSelectedVendor(null);
    setProcessingMessage(null);
    setAckId(null);
    setRecordId(null);
    setAmount("50");
    setMPINInput("");
    setMPINConfirm("");
    refreshVendors();
  };

  const handleSubmitPayment = async () => {
    if (!selectedVendor) {
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid amount greater than zero.");
      return;
    }

    if (mpinConfigured === null) {
      Alert.alert("MPIN unavailable", "Please wait while we prepare your wallet.");
      return;
    }

    if (!user?.id) {
      Alert.alert("Profile error", "User profile is incomplete. Please relogin.");
      return;
    }

    if (!mpinConfigured) {
      if (!/^[0-9]{4,6}$/.test(mpinInput)) {
        Alert.alert("MPIN required", "Choose an MPIN with 4 to 6 digits.");
        return;
      }
      if (mpinInput !== mpinConfirm) {
        Alert.alert("Mismatch", "MPIN confirmation does not match.");
        return;
      }
    } else if (mpinInput.length === 0) {
      Alert.alert("MPIN required", "Enter your MPIN to continue.");
      return;
    }

    setPhase("processing");
    setProcessingMessage("Unlocking your wallet key...");

    try {
      if (!mpinConfigured) {
        await storeMPIN(user.id, mpinInput);
        setMPINConfigured(true);
        setMPINConfirm("");
      } else {
        const isValid = await verifyMPIN(user.id, mpinInput);
        if (!isValid) {
          throw new Error("Incorrect MPIN entered.");
        }
      }

      const result = await performPayment({
        vendor: selectedVendor,
        amount: numericAmount,
        pin: mpinInput,
        payerId: user.id,
        payerName: user.username,
        onStatusUpdate: setProcessingMessage,
      });

      setProcessingMessage("Transaction stored offline.");
      setAckId(result.ackId);
      setRecordId(result.recordId);
      setPhase("result");
    } catch (err) {
      console.log("Payment processing failed", err);
      Alert.alert("Payment failed", err instanceof Error ? err.message : "Unknown error");
      setPhase("details");
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: 20 }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Money Transfer</Text>
        <View style={styles.headerSpacer} />
      </View>

      {phase === "discover" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Vendors</Text>
          {loadingVendors ? (
            <ActivityIndicator color="#4A2E1A" />
          ) : (
            <ScrollView contentContainerStyle={styles.vendorList}>
              {vendorList.map(vendor => (
                <Pressable key={vendor.id} style={styles.vendorCard} onPress={() => handleSelectVendor(vendor)}>
                  <View style={styles.vendorCardRow}>
                    <Text style={styles.vendorId}>{vendor.receiverId}</Text>
                    <Text style={styles.vendorStrength}>{vendor.signalStrength} dBm</Text>
                  </View>
                  <Text style={styles.vendorDetail}>Session nonce: {vendor.sessionNonce}</Text>
                  <Text style={styles.vendorDetail}>Short code: {vendor.shortCode}</Text>
                  <Text style={styles.vendorDetail}>Profile hash: {vendor.profileHash}</Text>
                </Pressable>
              ))}
              {vendorList.length === 0 && (
                <Text style={styles.emptyText}>No vendors detected. Pull to refresh or move closer.</Text>
              )}
            </ScrollView>
          )}
          <Pressable style={[styles.secondaryButton, { marginBottom: 20 }]} onPress={refreshVendors}>
            <Text style={styles.secondaryButtonText}>Scan Again</Text>
          </Pressable>
        </View>
      )}

      {phase === "details" && selectedVendor && (
        <ScrollView contentContainerStyle={styles.formContainer}>
          <View style={styles.selectedVendorCard}>
            <Text style={styles.selectedVendorTitle}>Connected to {selectedVendor.receiverId}</Text>
            <Text style={styles.vendorDetail}>Short code {selectedVendor.shortCode}</Text>
          </View>

          <Text style={styles.label}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
            placeholder="Amount"
            placeholderTextColor="#8E8178"
          />

          <Text style={styles.label}>{mpinConfigured ? "MPIN" : "Create MPIN"}</Text>
          <TextInput
            value={mpinInput}
            onChangeText={setMPINInput}
            keyboardType="numeric"
            secureTextEntry
            style={styles.input}
            placeholder={mpinConfigured ? "Enter MPIN" : "Choose a 4-6 digit MPIN"}
            placeholderTextColor="#8E8178"
            maxLength={6}
          />

          {mpinConfigured === false && (
            <>
              <Text style={styles.label}>Confirm MPIN</Text>
              <TextInput
                value={mpinConfirm}
                onChangeText={setMPINConfirm}
                keyboardType="numeric"
                secureTextEntry
                style={styles.input}
                placeholder="Re-enter MPIN"
                placeholderTextColor="#8E8178"
                maxLength={6}
              />
            </>
          )}

          <Pressable style={styles.primaryButton} onPress={handleSubmitPayment}>
            <Text style={styles.primaryButtonText}>Send Payment</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={resetFlow}>
            <Text style={styles.secondaryButtonText}>Choose Different Vendor</Text>
          </Pressable>
        </ScrollView>
      )}

      {phase === "processing" && (
        <View style={styles.feedbackContainer}>
          <ActivityIndicator color="#4A2E1A" size="large" />
          <Text style={styles.feedbackText}>{processingMessage ?? "Processing payment..."}</Text>
        </View>
      )}

      {phase === "result" && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.successTitle}>Payment Stored Offline</Text>
          {ackId && <Text style={styles.feedbackText}>ACK reference: {ackId}</Text>}
          {recordId && <Text style={styles.feedbackText}>Record saved as: {recordId}</Text>}
          <Pressable style={[styles.primaryButton, { padding: 8 }]} onPress={resetFlow}>
            <Text style={[styles.primaryButtonText]}>Start New Transfer</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6EDE3",
    paddingTop: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  backButtonText: {
    fontSize: 14,
    color: "#4A2E1A",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3B2C27",
  },
  headerSpacer: {
    width: 64,
  },
  section: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3B2C27",
    marginBottom: 12,
  },
  vendorList: {
    gap: 16,
    paddingBottom: 24,
  },
  vendorCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  vendorCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  vendorId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3B2C27",
  },
  vendorStrength: {
    fontSize: 14,
    color: "#8E8178",
  },
  vendorDetail: {
    fontSize: 12,
    color: "#8E8178",
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: "#8E8178",
    textAlign: "center",
    marginTop: 32,
  },
  secondaryButton: {
    marginTop: 16,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#4A2E1A",
  },
  secondaryButtonText: {
    color: "#4A2E1A",
    fontWeight: "600",
    fontSize: 16,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 16,
  },
  selectedVendorCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  selectedVendorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3B2C27",
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B2C27",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#3B2C27",
    borderWidth: 1,
    borderColor: "#D7CBC2",
  },
  primaryButton: {
    backgroundColor: "#4A2E1A",
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  feedbackContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  feedbackText: {
    fontSize: 14,
    color: "#3B2C27",
    textAlign: "center",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C9C64",
  },
});

export default MoneyTransferScreen;

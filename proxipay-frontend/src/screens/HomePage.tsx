import React, { useCallback, useContext, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthContext } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import { getWalletBalance } from "../services/walletStorage";

const transactions = [
	{ id: "1", label: "Econico", sublabel: "Booster", amount: "+42 109", positive: true, iconColor: "#3D6AF2" },
	{ id: "2", label: "Boccatation", sublabel: "Ecosystem", amount: "+9 210", positive: true, iconColor: "#E0E0E0" },
	{ id: "3", label: "Montebook", sublabel: "Knowledge", amount: "-193", positive: false, iconColor: "#FFB648" }
];

const quickActions = [
	{ id: "1", title: "Accessible", subtitle: "Transfer", iconColor: "#0F9D58" },
	{ id: "2", title: "Bills", subtitle: "Payments", iconColor: "#F4B400" }
];

type Navigation = NativeStackNavigationProp<RootStackParamList, "Home">;

const HomePage = () => {
	const { user, logout } = useContext(AuthContext)!;
	const navigation = useNavigation<Navigation>();
	const [walletBalance, setWalletBalanceState] = useState<number | null>(null);

	useFocusEffect(
		useCallback(() => {
			let isActive = true;

			const loadBalance = async () => {
				if (!user?.id) {
					if (isActive) {
						setWalletBalanceState(null);
					}
					return;
				}

				try {
					const amount = await getWalletBalance(user.id);
					if (isActive) {
						setWalletBalanceState(amount);
					}
				} catch (err) {
					console.log("Unable to load wallet balance", err);
					if (isActive) {
						setWalletBalanceState(null);
					}
				}
			};

			loadBalance();

			return () => {
				isActive = false;
			};
		}, [user?.id])
	);
	return (
		<View style={styles.container}>
			<StatusBar style="light" />

			<ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
				<View style={styles.headerRow}>
					<Pressable style={styles.logoutButton} onPress={logout}>
						<Text style={styles.logoutText}>Logout</Text>
					</Pressable>
					<Text style={styles.headerTitle}>Proxipay</Text>
					<Text style={styles.headerIcon}>           </Text>
				</View>

				<View style={styles.walletCard}>
					<View style={styles.walletRow}>
							<View style={styles.walletInfo}>
								<Text style={styles.walletLabel}>Mobile Wallet</Text>
								{user?.username ? (
									<Text style={styles.walletUser}>Hi, {user.username}</Text>
								) : null}
								<Text style={styles.walletAmount}>
									{walletBalance !== null ? walletBalance.toLocaleString() : "--"}
								</Text>
							</View>
							<View style={styles.walletBadge}>
								<View style={styles.walletBadgeInner}>
									<Text style={styles.walletBadgeText}>||</Text>
								</View>
							</View>
					</View>
					<View style={styles.walletFooter}>
						<Text style={styles.walletFooterLabel}>Mobile Wallet</Text>
						<Text style={styles.walletFooterValue}>Network · Dashboard</Text>
					</View>
				</View>

				<View style={styles.transactionsCard}>
					<View style={styles.transactionsHeader}>
						<Text style={styles.transactionsTitle}>Transaction</Text>
						<Text style={styles.transactionsToggle}>^</Text>
					</View>
					{transactions.map((item, index) => (
						<View key={item.id} style={[styles.transactionRow, index !== 0 && styles.transactionRowDivider]}>
							<View style={[styles.transactionIcon, { backgroundColor: item.iconColor }]} />
							<View style={styles.transactionInfo}>
								<Text style={styles.transactionLabel}>{item.label}</Text>
								<Text style={styles.transactionSub}>{item.sublabel}</Text>
							</View>
							<Text style={[styles.transactionAmount, item.positive ? styles.amountPositive : styles.amountNegative]}>
								{item.amount}
							</Text>
						</View>
					))}
				</View>

				<Text style={styles.sectionTitle}>Pantassiolli</Text>

				<View style={styles.quickActionsRow}>
					{quickActions.map(action => (
						<Pressable key={action.id} style={styles.quickActionCard}>
							<View style={[styles.quickActionIcon, { backgroundColor: action.iconColor }]} />
							<View style={styles.quickActionTextGroup}>
								<Text style={styles.quickActionTitle}>{action.title}</Text>
								<Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
							</View>
							<Text style={styles.quickActionEllipsis}>...</Text>
						</Pressable>
					))}
				</View>
			</ScrollView>

			<Pressable style={[styles.primaryButton, styles.primaryButtonFloating]} onPress={() => navigation.navigate("MoneyTransfer")}>
				<Text style={styles.primaryButtonText}>Money Transfer</Text>
			</Pressable>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F6EDE3"
	},
	scrollContainer: {
		paddingTop: 56,
		paddingBottom: 120,
		paddingHorizontal: 24
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 24
	},
	logoutButton: {
		paddingVertical: 6,
		paddingHorizontal: 16,
		borderRadius: 999,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E2D7CF",
		shadowColor: "#00000022",
		shadowOpacity: 0.15,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 3 },
		elevation: 3
	},
	logoutText: {
		fontSize: 14,
		fontWeight: "600",
		color: "#3B2C27",
		letterSpacing: 0.4
	},
	headerIcon: {
		fontSize: 20,
		color: "#3B2C27"
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "600",
		color: "#3B2C27",
		letterSpacing: 0.5
	},
	walletCard: {
		backgroundColor: "#4A2E1A",
		borderRadius: 24,
		padding: 24,
		marginBottom: 24,
		shadowColor: "#000",
		shadowOpacity: 0.15,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 8
	},
	walletRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 16
	},
	walletInfo: {
		gap: 4
	},
	walletLabel: {
		color: "#F7CE8A",
		fontSize: 16,
		letterSpacing: 0.3
	},
		walletUser: {
			color: "#D8C1B6",
			fontSize: 14
		},
	walletAmount: {
		color: "#FFFFFF",
		fontSize: 42,
		fontWeight: "700",
		letterSpacing: 1.5
	},
	walletBadge: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: "#F6EDE3",
		justifyContent: "center",
		alignItems: "center"
	},
	walletBadgeInner: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: "#E46F44",
		justifyContent: "center",
		alignItems: "center"
	},
	walletBadgeText: {
		color: "#FFF",
		fontSize: 22
	},
	walletFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center"
	},
	walletFooterLabel: {
		color: "#F7CE8A",
		fontSize: 14
	},
	walletFooterValue: {
		color: "#D8C1B6",
		fontSize: 12
	},
	transactionsCard: {
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		paddingVertical: 24,
		paddingHorizontal: 20,
		marginBottom: 24,
		shadowColor: "#000",
		shadowOpacity: 0.06,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 4 },
		elevation: 4
	},
	transactionsHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12
	},
	transactionsTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#3B2C27"
	},
	transactionsToggle: {
		fontSize: 18,
		color: "#6FB46F"
	},
	transactionRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12
	},
	transactionRowDivider: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "#EEE"
	},
	transactionIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: 16
	},
	transactionInfo: {
		flex: 1
	},
	transactionLabel: {
		fontSize: 16,
		fontWeight: "600",
		color: "#3B2C27"
	},
	transactionSub: {
		fontSize: 12,
		color: "#A89B92"
	},
	transactionAmount: {
		fontSize: 16,
		fontWeight: "700"
	},
	amountPositive: {
		color: "#2C9C64"
	},
	amountNegative: {
		color: "#C84A3B"
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#3B2C27",
		marginBottom: 16
	},
	quickActionsRow: {
		gap: 16,
		marginBottom: 24
	},
	quickActionCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderRadius: 24,
		paddingVertical: 16,
		paddingHorizontal: 20,
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 3 },
		elevation: 3
	},
	quickActionIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		marginRight: 16
	},
	quickActionTextGroup: {
		flex: 1
	},
	quickActionTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#3B2C27"
	},
	quickActionSubtitle: {
		fontSize: 12,
		color: "#A89B92"
	},
	quickActionEllipsis: {
		fontSize: 28,
		color: "#D1C7BE"
	},
	primaryButton: {
		backgroundColor: "#4A2E1A",
		borderRadius: 28,
		paddingVertical: 18,
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.2,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 6
	},
	primaryButtonText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "600",
		letterSpacing: 0.5
	},
	primaryButtonFloating: {
		position: "absolute",
		left: 24,
		right: 24,
		bottom: 32
	}
});

export default HomePage;


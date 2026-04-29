import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { COLORS } from "../constants/theme";

interface BackToShopButtonProps {
  navigation: any;
  style?: ViewStyle;
}

const BackToShopButton: React.FC<BackToShopButtonProps> = ({ navigation, style }) => {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
      activeOpacity={0.7}
    >
      <ArrowLeft size={11} color={COLORS.primary} strokeWidth={2.5} />
      <Text style={styles.text}>Back to Home</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
  },
});

export default BackToShopButton;

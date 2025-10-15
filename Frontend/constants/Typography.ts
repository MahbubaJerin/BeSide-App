import { TextStyle } from "react-native";

export const Typography: Record<string, TextStyle> = {
  title: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Arial",
    lineHeight: 38,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: "Arial",
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  default: {
    fontSize: 16,
    fontWeight: "400",
    fontFamily: "Arial",
    lineHeight: 22,
  },
  defaultSemiBold: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Arial",
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: "400",
    fontFamily: "Arial",
    lineHeight: 18,
    letterSpacing: 0.2,
    opacity: 0.7,
  },
};

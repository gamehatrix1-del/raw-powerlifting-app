import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0B0B0C",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#9A9A9F",
    marginBottom: 32,
  },
  input: {
    backgroundColor: "#1B1B1E",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#E33A3A",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    color: "#9A9A9F",
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
  },
  helperText: {
    color: "#6B6B70",
    fontSize: 12,
    marginBottom: 20,
    lineHeight: 18,
  },
});

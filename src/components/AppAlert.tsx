import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import AnimatedPressable from "./AnimatedPressable";

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AlertRequest {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

type AlertFn = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => void;

const AlertContext = createContext<AlertFn | undefined>(undefined);

export function AlertProvider({ children }: PropsWithChildren) {
  const { colors, typography, radius } = useTheme();
  const [request, setRequest] = useState<AlertRequest | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  const showAlert = useCallback<AlertFn>((title, message, buttons) => {
    setRequest({
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: "OK" }],
    });
  }, []);

  useEffect(() => {
    if (request) {
      progress.setValue(0);
      Animated.spring(progress, {
        toValue: 1,
        useNativeDriver: true,
        speed: 22,
        bounciness: 6,
      }).start();
    }
  }, [request, progress]);

  function handlePress(button: AlertButton) {
    setRequest(null);
    button.onPress?.();
  }

  return (
    <AlertContext.Provider value={showAlert}>
      {children}
      <Modal
        visible={!!request}
        transparent
        animationType="fade"
        onRequestClose={() => setRequest(null)}
      >
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                opacity: progress,
                transform: [
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text
              style={[
                typography.heading,
                { color: colors.text, marginBottom: request?.message ? 6 : 18 },
              ]}
            >
              {request?.title}
            </Text>
            {request?.message ? (
              <Text
                style={[
                  typography.body,
                  { color: colors.muted, marginBottom: 20 },
                ]}
              >
                {request.message}
              </Text>
            ) : null}
            <View style={styles.buttonRow}>
              {request?.buttons.map((button, index) => {
                const isDestructive = button.style === "destructive";
                const isCancel = button.style === "cancel";
                return (
                  <AnimatedPressable
                    key={index}
                    style={[
                      styles.button,
                      { borderRadius: radius.md },
                      isDestructive
                        ? { backgroundColor: colors.errorMuted }
                        : isCancel
                        ? { backgroundColor: colors.cardAlt }
                        : { backgroundColor: colors.accent },
                    ]}
                    onPress={() => handlePress(button)}
                  >
                    <Text
                      style={[
                        typography.bodyStrong,
                        {
                          color: isDestructive
                            ? colors.error
                            : isCancel
                            ? colors.text
                            : colors.accentText,
                        },
                      ]}
                    >
                      {button.text}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useAppAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAppAlert must be used within AlertProvider");
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    padding: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
  },
});

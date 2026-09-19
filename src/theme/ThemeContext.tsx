import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
} from "react";
import { useColorScheme } from "react-native";
import { darkPalette, lightPalette, Palette } from "./palette";
import { radius, spacing } from "./spacing";
import { typography } from "./typography";

interface ThemeValue {
  colors: Palette;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  // Falls back to dark (the brand's native look) when the OS reports no
  // preference, rather than assuming light.
  const isDark = scheme !== "light";

  const value = useMemo<ThemeValue>(
    () => ({
      colors: isDark ? darkPalette : lightPalette,
      typography,
      spacing,
      radius,
      isDark,
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

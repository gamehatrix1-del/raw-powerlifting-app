import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Requests permission, grabs this device's Expo push token, and saves it
// on the signed-in user's profile so server-side functions (new program
// assigned, payment failed) know where to send it. Silently no-ops on
// simulators/emulators without push capability or if permission is denied
// — notifications are a nice-to-have, never a blocker.
export async function registerForPushNotificationsAsync(userId: string): Promise<void> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 200, 200],
        lightColor: "#F0394B",
      });
    }

    if (!Device.isDevice) return;

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await supabase.from("profiles").update({ push_token: token.data }).eq("id", userId);
  } catch (err) {
    console.error("Failed to register for push notifications", err);
  }
}

// Schedules a local notification for when rest should be over, so the
// athlete still gets alerted if they background the app mid-rest. Returns
// the notification id to cancel if they skip rest manually.
export async function scheduleRestTimerNotification(seconds: number): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: "Rest complete",
        body: "Back to it — your next set is ready.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
  } catch (err) {
    console.error("Failed to schedule rest timer notification", err);
    return null;
  }
}

export async function cancelScheduledNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already fired or already cancelled — nothing to do
  }
}

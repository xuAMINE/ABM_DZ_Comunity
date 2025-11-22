// app/member/posts/_layout.tsx
import { Stack } from "expo-router";
import { useAppTheme } from "@/lib/theme";

export default function PostsLayout() {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,   // 👈 HIDE THE AUTO “Posts” TITLE
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.bg },
        gestureEnabled: true,           // iOS swipe back
        animation: "slide_from_right",  // smooth navigation
      }}
    />
  );
}

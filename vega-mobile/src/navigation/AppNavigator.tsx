import React from "react";
import { useColorScheme } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSelector } from "react-redux";
import { RootState } from "../store";

// Components & UI Hooks
import { DashboardScreen } from "../screens/DashboardScreen";
import { InterviewScreen } from "../screens/InterviewScreen";
import { ResumeBuilderScreen } from "../screens/ResumeBuilderScreen";
import { CodingArenaScreen } from "../screens/CodingArenaScreen";
import { RecruiterDashboardScreen } from "../screens/RecruiterDashboardScreen";
import { AdminDashboardScreen } from "../screens/AdminDashboardScreen";

// Import simple fallback screens
import LoginScreen from "../screens/LoginScreen";

// Declare Param Lists for Type Safe Routing
export type RootStackParamList = {
  Auth: undefined;
  MainApp: undefined;
  RecruiterApp: undefined;
  AdminApp: undefined;
  QuizSession: { category: string; difficulty: string };
  AIReport: { interviewId: number };
};

export type StudentTabParamList = {
  Dashboard: undefined;
  MockInterview: undefined;
  ATSResume: undefined;
  CodingArena: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<StudentTabParamList>();

// Bottom Tabs Navigator layout for modern Unstop/LinkedIn style usability
function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#0c1224",
          borderBottomWidth: 1,
          borderBottomColor: "#1e293b",
        },
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: "800",
          color: "#f1f5f9",
          letterSpacing: 0.8,
        },
        tabBarStyle: {
          backgroundColor: "#070b19",
          borderTopColor: "#1e293b",
          borderTopWidth: 1.5,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "bold",
          paddingBottom: 2,
        },
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          title: "Talent Hub",
        }}
      />
      <Tab.Screen 
        name="MockInterview" 
        component={InterviewScreen} 
        options={{
          title: "AI Interview",
        }}
      />
      <Tab.Screen 
        name="ATSResume" 
        component={ResumeBuilderScreen} 
        options={{
          title: "ATS Builder",
        }}
      />
      <Tab.Screen 
        name="CodingArena" 
        component={CodingArenaScreen} 
        options={{
          title: "Code Arena",
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const scheme = useColorScheme();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: "#070b19",
      card: "#0c1224",
      text: "#f1f5f9",
      border: "#1e293b",
      primary: "#6366f1",
    },
  };

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: "#faf9f6",
      card: "#ffffff",
      text: "#1e293b",
      border: "#e2e8f0",
      primary: "#4f46e5",
    },
  };

  return (
    <NavigationContainer theme={scheme === "dark" ? customDarkTheme : customLightTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={LoginScreen} />
        ) : (
          <>
            {user?.role === "STUDENT" && (
              <Stack.Screen name="MainApp" component={StudentTabs} />
            )}
            {user?.role === "COMPANY" && (
              <Stack.Screen name="RecruiterApp" component={RecruiterDashboardScreen} />
            )}
            {user?.role === "ADMIN" && (
              <Stack.Screen name="AdminApp" component={AdminDashboardScreen} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

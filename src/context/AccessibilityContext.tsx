import React, { createContext, useContext, useState, useEffect } from "react";

import api from "../services/api.ts";
import { useAuth } from "./AuthContext.tsx";

interface AccessibilitySettings {
  accessibility_mode: boolean;
  voice_enabled: boolean;
  contrast_mode: 'NORMAL' | 'HIGH' | 'MAX';
  font_size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'HUGE';
  last_used_voice: string | null;
}

interface AccessibilityContextType extends AccessibilitySettings {
  setAccessibilityMode: (mode: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setContrastMode: (mode: 'NORMAL' | 'HIGH' | 'MAX') => void;
  setFontSize: (size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'HUGE') => void;
  toggleAccessibility: () => void;
  pageContext: any;
  setPageContext: (ctx: any) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    accessibility_mode: false,
    voice_enabled: false,
    contrast_mode: 'NORMAL',
    font_size: 'MEDIUM',
    last_used_voice: null,
  });
  const [pageContext, setPageContext] = useState<any>({
    page: "VEGA",
    description: "Welcome to VEGA career platform.",
    suggestions: ["Go to jobs", "Check profile", "Build resume"]
  });
  const { user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from database if logged in, or local storage
  useEffect(() => {
    const fetchSettings = async () => {
      let loadedSettings = null;
      if (user) {
        try {
          const { data } = await api.get("/accessibility/settings");
          if (data.success && data.data) {
            loadedSettings = data.data;
          }
        } catch (e: any) {
          if (e.response?.status === 401) {
            console.warn("Unauthorized to fetch accessibility settings from backend");
          } else {
            console.warn("Failed to fetch accessibility settings from backend", e.message || e);
          }
        }
      }
      
      if (loadedSettings) {
        setSettings(loadedSettings);
      } else {
        const saved = localStorage.getItem("accessibility_settings");
        if (saved) {
          try {
            setSettings(JSON.parse(saved));
          } catch (e) {
            console.warn("Failed to parse accessibility settings", e);
          }
        }
      }
      setIsLoaded(true);
    };
    
    fetchSettings();
  }, [user]);

  useEffect(() => {
    localStorage.setItem("accessibility_settings", JSON.stringify(settings));
    
    // Sync to backend if logged in and settings are loaded first
    if (user && isLoaded) {
      api.post("/accessibility/settings", settings).catch(e => {
        if (e.response?.status === 401) {
          console.warn("Unauthorized to sync settings");
        } else {
          console.warn("Failed to sync settings", e.message || e);
        }
      });
    }
    
    // Apply contrast mode classes to document body
    const root = document.documentElement;
    root.classList.remove("contrast-high", "contrast-max");
    if (settings.contrast_mode === 'HIGH') root.classList.add("contrast-high");
    if (settings.contrast_mode === 'MAX') root.classList.add("contrast-max");

    // Apply font size
    root.classList.remove("font-small", "font-medium", "font-large", "font-huge");
    root.classList.add(`font-${settings.font_size.toLowerCase()}`);
    
    // Global accessibility class
    if (settings.accessibility_mode) {
      root.classList.add("accessibility-mode-on");
    } else {
      root.classList.remove("accessibility-mode-on");
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const setAccessibilityMode = (mode: boolean) => updateSettings({ accessibility_mode: mode });
  const setVoiceEnabled = (enabled: boolean) => updateSettings({ voice_enabled: enabled });
  const setContrastMode = (mode: 'NORMAL' | 'HIGH' | 'MAX') => updateSettings({ contrast_mode: mode });
  const setFontSize = (size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'HUGE') => updateSettings({ font_size: size });
  
  const toggleAccessibility = () => {
    setSettings(prev => {
      const newMode = !prev.accessibility_mode;
      return {
        ...prev,
        accessibility_mode: newMode,
        voice_enabled: newMode,
      };
    });
  };

  return (
    <AccessibilityContext.Provider value={{
      ...settings,
      setAccessibilityMode,
      setVoiceEnabled,
      setContrastMode,
      setFontSize,
      toggleAccessibility,
      pageContext,
      setPageContext
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}

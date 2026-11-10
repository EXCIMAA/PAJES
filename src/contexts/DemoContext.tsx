// src/contexts/DemoContext.tsx
import { createContext, useContext, useState, type ReactNode } from "react";

interface DemoContextType {
  isDemo: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
}

const DemoContext = createContext<DemoContextType>({
  isDemo: false,
  enterDemo: () => {},
  exitDemo: () => {},
});

const DEMO_KEY = "pajes_demo_mode";

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DEMO_KEY) === "true";
    } catch {
      return false;
    }
  });

  const enterDemo = () => {
    try {
      localStorage.setItem(DEMO_KEY, "true");
    } catch {}
    setIsDemo(true);
  };

  const exitDemo = () => {
    try {
      localStorage.removeItem(DEMO_KEY);
    } catch {}
    setIsDemo(false);
  };

  return (
    <DemoContext.Provider value={{ isDemo, enterDemo, exitDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}

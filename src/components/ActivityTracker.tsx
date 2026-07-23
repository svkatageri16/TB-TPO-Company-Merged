import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";

export function ActivityTracker() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  
  const currentPathRef = useRef(pathname);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    // Only track students
    if (!user || user.role !== "STUDENT") return;

    if (currentPathRef.current !== pathname) {
      const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Send activity log to server
      const pathToLog = currentPathRef.current;
      if (durationSeconds > 0) {
        fetch("/api/students/activity", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
          },
          body: JSON.stringify({
            path: pathToLog,
            action: "page_view",
            duration: durationSeconds
          })
        }).catch(err => console.error("Activity tracking error", err));
      }

      currentPathRef.current = pathname;
      startTimeRef.current = Date.now();
    }
  }, [pathname, user]);

  useEffect(() => {
    // Handle unmount for the last page visited
    return () => {
      if (!user || user.role !== "STUDENT") return;
      const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      if (durationSeconds > 0) {
        // use navigator.sendBeacon for reliable delivery on page unload, 
        // but normally fetch with keepalive is also fine.
        fetch("/api/students/activity", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token") || ""}`
          },
          keepalive: true,
          body: JSON.stringify({
            path: currentPathRef.current,
            action: "page_view",
            duration: durationSeconds
          })
        }).catch(err => console.error("Activity tracking error", err));
      }
    };
  }, [user]);

  return null;
}

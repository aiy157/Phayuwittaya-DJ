import { useState } from 'react';

/**
 * [TH] ปัจจุบันใช้ฟิกซ์รหัสผ่านไว้ในตัวแปรสิ่งแวดล้อม (เพื่อความปลอดภัยสูงสุด ควรย้ายไปใช้ Firebase Authentication)
 * [EN] Currently using manager password from environment variables.
 * TODO for strictly secure operations: Move to Firebase Authentication.
 */
const MANAGER_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "pw12pw";

/**
 * @hook useAuth
 * @description 
 * [TH] จัดการสถานะการเข้าสู่ระบบแบบง่ายๆ สำหรับ Manager Dashboard อาศัย LocalStorage
 * [EN] Manages simple authentication states for the Manager Dashboard.
 * Relies on LocalStorage to persist the authenticated session across page reloads.
 * 
 * @returns {Object} { isAuthenticated, login, logout }
 */
export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("manager_auth") === "true");

    /**
     * [TH] พยายามเข้าสู่ระบบโดยตรวจสอบรหัสผ่านที่ป้อนเข้ามา
     * [EN] Attempts to log the user in by matching the entered password
     * @param {string} password - The inputted password
     * @returns {boolean} - Returns true if successful, false otherwise
     */
    const login = (password) => {
        if (password === MANAGER_PASSWORD) {
            setIsAuthenticated(true);
            localStorage.setItem("manager_auth", "true");
            return true;
        }
        return false;
    };

    /**
     * [TH] ล้างสถานะการเข้าสู่ระบบและเอาคีย์ออกจาก LocalStorage
     * [EN] Clears the authentication state and removes the LocalStorage token
     */
    const logout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem("manager_auth");
    };

    return { isAuthenticated, login, logout };
};

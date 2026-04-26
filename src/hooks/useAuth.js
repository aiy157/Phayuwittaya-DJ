import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { ref, get, set, onValue } from 'firebase/database';

/**
 * [TH] รหัสผ่านเริ่มต้น — หากยังไม่มีรหัสใน Firebase จะใช้ค่านี้
 * [EN] Default fallback password if Firebase has no record yet
 */
const DEFAULT_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'pw12pw';
const PASSWORD_PATH = 'settings/adminPassword';

/**
 * @hook useAuth
 * @description
 * [TH] จัดการสถานะการเข้าสู่ระบบสำหรับ Manager Dashboard
 *      รหัสผ่านถูกเก็บและอ่านจาก Firebase Realtime Database ที่ /settings/adminPassword
 *      หากยังไม่มีรหัสในฐานข้อมูล จะใช้ค่าเริ่มต้น "pw12pw" และเขียนลงทันที
 * [EN] Manages authentication for Manager Dashboard.
 *      Password is stored in Firebase at /settings/adminPassword.
 *      Falls back to default "pw12pw" and writes it if no record exists.
 *
 * @returns {Object} { isAuthenticated, login, logout, changePassword, isPasswordLoading }
 */
export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(
        () => sessionStorage.getItem('manager_auth') === 'true'
    );
    const [isPasswordLoading, setIsPasswordLoading] = useState(true);

    // Keep live password in ref (avoids stale closures, re-render safe)
    const passwordRef = useRef(DEFAULT_PASSWORD);

    // --- Listen to Firebase for live password changes ---
    useEffect(() => {
        const passwordRef$ = ref(db, PASSWORD_PATH);

        // First: ensure default password exists if Firebase is empty
        get(passwordRef$).then((snap) => {
            if (!snap.exists()) {
                // Write the initial default password
                set(passwordRef$, DEFAULT_PASSWORD).catch(console.error);
            }
        });

        // Subscribe to live changes (so if password is changed, it applies immediately)
        const unsub = onValue(passwordRef$, (snap) => {
            const val = snap.val();
            passwordRef.current = val || DEFAULT_PASSWORD;
            setIsPasswordLoading(false);
        });

        return () => unsub();
    }, []);

    /**
     * [TH] เข้าสู่ระบบโดยตรวจสอบรหัสผ่านกับค่าใน Firebase
     * [EN] Login by matching input against the live Firebase password
     */
    const login = (password) => {
        if (password === passwordRef.current) {
            setIsAuthenticated(true);
            sessionStorage.setItem('manager_auth', 'true');
            return true;
        }
        return false;
    };

    /**
     * [TH] ออกจากระบบและล้าง session
     * [EN] Logout and clear session
     */
    const logout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('manager_auth');
    };

    /**
     * [TH] เปลี่ยนรหัสผ่านโดยตรวจสอบรหัสเก่าก่อน แล้วเขียนรหัสใหม่ลง Firebase
     * [EN] Change password: validates old password, then writes new one to Firebase
     * @param {string} oldPassword - รหัสเก่าเพื่อยืนยันตัวตน
     * @param {string} newPassword - รหัสใหม่
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    const changePassword = async (oldPassword, newPassword) => {
        if (oldPassword !== passwordRef.current) {
            return { success: false, error: 'รหัสผ่านเดิมไม่ถูกต้อง' };
        }
        if (!newPassword || newPassword.trim().length < 4) {
            return { success: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' };
        }
        try {
            await set(ref(db, PASSWORD_PATH), newPassword.trim());
            return { success: true };
        } catch (err) {
            console.error('[useAuth] changePassword failed:', err);
            return { success: false, error: 'ไม่สามารถบันทึกรหัสได้ กรุณาลองอีกครั้ง' };
        }
    };

    return { isAuthenticated, login, logout, changePassword, isPasswordLoading };
};

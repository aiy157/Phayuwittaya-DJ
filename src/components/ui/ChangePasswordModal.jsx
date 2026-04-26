import React, { useState, useRef } from 'react';
import { KeyRound, Eye, EyeOff, X, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const PasswordField = ({ isLight, isLoading, success, onSubmit, label, value, onChange, show, onToggle, placeholder, inputRef }) => {
    const [focused, setFocused] = useState(false);
    
    const inputStyle = (focused) => ({
        background: isLight
            ? 'rgba(241,245,249,0.90)'
            : 'rgba(255,255,255,0.06)',
        color: isLight ? '#0f172a' : 'rgba(255,255,255,0.90)',
        border: focused
            ? '1.5px solid rgba(139,92,246,0.60)'
            : isLight
                ? '1.5px solid rgba(99,102,241,0.20)'
                : '1.5px solid rgba(255,255,255,0.10)',
        boxShadow: isLight
            ? 'inset 0 2px 4px rgba(0,0,0,0.04)'
            : 'inset 0 2px 6px rgba(0,0,0,0.30)',
    });

    return (
        <div className="mb-4">
            <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block"
                style={{ color: isLight ? '#64748b' : 'rgba(255,255,255,0.45)' }}>
                {label}
            </label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type={show ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onKeyDown={e => e.key === 'Enter' && onSubmit()}
                    disabled={isLoading || success}
                    className="w-full px-4 py-3 pr-11 rounded-[12px] text-[14px] font-semibold transition-all duration-200 focus:outline-none"
                    style={inputStyle(focused)}
                    autoComplete="new-password"
                />
                <button
                    type="button"
                    onClick={onToggle}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity duration-200 hover:opacity-100 opacity-50"
                    style={{ color: isLight ? '#64748b' : 'rgba(255,255,255,0.60)' }}
                    aria-label={show ? 'ซ่อนรหัส' : 'แสดงรหัส'}
                >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );
};

/**
 * @component ChangePasswordModal
 * @description
 * [TH] Modal glassmorphism สำหรับเปลี่ยนรหัสผ่านผู้จัดการระบบ
 * [EN] Glassmorphism modal for changing the manager password
 *
 * @param {Function} onClose - ปิด modal
 * @param {Function} changePassword - async function(oldPass, newPass) => {success, error?}
 * @param {Function} showToast - แสดง Toast notification
 */
const ChangePasswordModal = ({ onClose, changePassword, showToast }) => {
    const { isLight } = useTheme();
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const firstInputRef = useRef(null);

    const handleSubmit = async (e) => {
        e?.preventDefault();
        setError('');

        if (!oldPass || !newPass || !confirmPass) {
            return setError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
        }
        if (newPass !== confirmPass) {
            return setError('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน');
        }
        if (newPass.length < 4) {
            return setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
        }
        if (newPass === oldPass) {
            return setError('รหัสผ่านใหม่ต้องไม่เหมือนรหัสเดิม');
        }

        setIsLoading(true);
        try {
            const result = await changePassword(oldPass, newPass);
            if (result.success) {
                setSuccess(true);
                showToast?.('🔑 เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!', 'success');
                setTimeout(() => onClose(), 1800);
            } else {
                setError(result.error || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-label="เปลี่ยนรหัสผ่าน"
        >
            <div
                className="relative w-full max-w-[380px] rounded-[28px] overflow-hidden animate-fade-in"
                style={{
                    background: isLight
                        ? 'rgba(255,255,255,0.85)'
                        : 'rgba(10,14,28,0.92)',
                    backdropFilter: 'blur(40px)',
                    WebkitBackdropFilter: 'blur(40px)',
                    boxShadow: isLight
                        ? '0 24px 80px rgba(99,102,241,0.18), 0 4px 24px rgba(0,0,0,0.08)'
                        : '0 24px 80px rgba(139,92,246,0.30), 0 4px 24px rgba(0,0,0,0.50)',
                    border: isLight
                        ? '1.5px solid rgba(99,102,241,0.18)'
                        : '1.5px solid rgba(139,92,246,0.30)',
                }}
            >
                {/* Rainbow top line */}
                <div className="h-[3px] w-full"
                    style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899,#f43f5e,#8b5cf6,#6366f1)' }} />

                <div className="px-7 py-7">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[13px] flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)' }}>
                                <KeyRound size={18} className="text-white" strokeWidth={2.2} />
                            </div>
                            <div>
                                <p className="text-[15px] font-black"
                                    style={{ color: isLight ? '#0f172a' : 'rgba(255,255,255,0.95)' }}>
                                    เปลี่ยนรหัสผ่าน
                                </p>
                                <p className="text-[11px] font-medium"
                                    style={{ color: isLight ? '#64748b' : 'rgba(255,255,255,0.38)' }}>
                                    บันทึกลง Firebase ทันที
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95"
                            style={{
                                background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                                color: isLight ? '#94a3b8' : 'rgba(255,255,255,0.40)',
                            }}
                            aria-label="ปิด"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* Success State */}
                    {success ? (
                        <div className="flex flex-col items-center py-6 animate-fade-in">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                                style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.40)' }}>
                                <CheckCircle2 size={28} className="text-emerald-400" />
                            </div>
                            <p className="text-[15px] font-bold text-emerald-400">เปลี่ยนรหัสสำเร็จ!</p>
                            <p className="text-[12px] mt-1" style={{ color: isLight ? '#64748b' : 'rgba(255,255,255,0.38)' }}>
                                รหัสใหม่มีผลทันที
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate>
                            <PasswordField
                                label="รหัสผ่านเดิม"
                                value={oldPass}
                                onChange={setOldPass}
                                show={showOld}
                                onToggle={() => setShowOld(v => !v)}
                                placeholder="รหัสผ่านปัจจุบัน"
                                inputRef={firstInputRef}
                                isLight={isLight}
                                isLoading={isLoading}
                                success={success}
                                onSubmit={handleSubmit}
                            />
                            <PasswordField
                                label="รหัสผ่านใหม่"
                                value={newPass}
                                onChange={setNewPass}
                                show={showNew}
                                onToggle={() => setShowNew(v => !v)}
                                placeholder="อย่างน้อย 4 ตัวอักษร"
                                isLight={isLight}
                                isLoading={isLoading}
                                success={success}
                                onSubmit={handleSubmit}
                            />
                            <PasswordField
                                label="ยืนยันรหัสผ่านใหม่"
                                value={confirmPass}
                                onChange={setConfirmPass}
                                show={showConfirm}
                                onToggle={() => setShowConfirm(v => !v)}
                                placeholder="พิมพ์รหัสใหม่อีกครั้ง"
                                isLight={isLight}
                                isLoading={isLoading}
                                success={success}
                                onSubmit={handleSubmit}
                            />

                            {/* Error message */}
                            {error && (
                                <div
                                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] mb-4 animate-fade-in"
                                    style={{
                                        background: 'rgba(244,63,94,0.12)',
                                        border: '1px solid rgba(244,63,94,0.30)',
                                    }}
                                    role="alert"
                                >
                                    <AlertCircle size={14} className="text-rose-400 flex-shrink-0" />
                                    <p className="text-[12px] font-semibold text-rose-400">{error}</p>
                                </div>
                            )}

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3.5 rounded-[14px] text-[14px] font-black text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
                                style={{
                                    background: isLoading
                                        ? (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)')
                                        : 'linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)',
                                    boxShadow: isLoading
                                        ? 'none'
                                        : '0 6px 24px rgba(99,102,241,0.38)',
                                    color: isLoading ? (isLight ? '#94a3b8' : 'rgba(255,255,255,0.30)') : '#fff',
                                }}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
                                        กำลังบันทึก...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={16} strokeWidth={2.5} />
                                        บันทึกรหัสผ่านใหม่
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;

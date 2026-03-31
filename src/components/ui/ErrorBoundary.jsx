import React from 'react';

/**
 * @component ErrorBoundary
 * [TH] จับข้อผิดพลาดที่เกิดใน Component ลูก ป้องกันจอขาว
 * [EN] Catches render-time errors in children, preventing white-screen crashes.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-6"
                    style={{ background: 'var(--surface-bg)', color: 'var(--text-100)' }}>
                    <div className="text-center max-w-md">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h1 className="text-xl font-bold mb-2">เกิดข้อผิดพลาด</h1>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-50)' }}>
                            แอปพลิเคชันพบปัญหาที่ไม่คาดคิด กรุณาลองรีโหลดหน้าใหม่
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="btn btn-secondary px-6 py-3 rounded-xl text-sm"
                            >
                                ลองใหม่
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="btn btn-primary px-6 py-3 rounded-xl text-sm"
                            >
                                รีโหลดหน้า
                            </button>
                        </div>
                        {import.meta.env.DEV && this.state.error && (
                            <pre className="mt-6 text-left text-[11px] p-4 rounded-lg overflow-auto max-h-40"
                                style={{ background: 'rgba(244,63,94,0.1)', color: '#fda4af', border: '1px solid rgba(244,63,94,0.2)' }}>
                                {this.state.error.toString()}
                            </pre>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

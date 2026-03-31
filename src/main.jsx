/**
 * @file main.jsx
 * @description 
 * [TH] จุดเริ่มต้นของแอพพลิเคชัน React ไฟล์นี้มีหน้าที่เรนเดอร์ React component หลัก (App) ขีดเขียนลงไปใน DOM
 * [EN] Entry point of the React Application. This file is responsible for rendering the root React component (App) into the DOM.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'

// [TH] สร้าง React Root และเชื่อม App ไว้ในครอบ StrictMode เพื่อตรวจสอบแอพพ์
// [EN] Create a React Root and mount the App inside the StrictMode wrapper
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </ThemeProvider>
    </React.StrictMode>,
)
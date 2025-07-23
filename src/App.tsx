import React, { useState, useCallback } from 'react';
import { Play, Square } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import Header from './components/Header';
import CameraFeed from './components/CameraFeed';
import StatusCard from './components/StatusCard';
import AlarmSystem from './components/AlarmSystem';
import { useMediaPipe } from './hooks/useMediaPipe';
import { DrowsinessState } from './types/mediapipe';

const DrowsinessApp: React.FC = () => {
  const [state, setState] = useState<DrowsinessState>({
    eyeStatus: 'Inactive',
    mouthStatus: 'Inactive',
    isMonitoring: false,
    alertActive: false
  });


  const handleDetection = useCallback((eyeStatus: string, mouthStatus: string, alertRequired: boolean) => {
    setState(prev => ({
      ...prev,
      eyeStatus: eyeStatus as any,
      mouthStatus: mouthStatus as any,
      alertActive: alertRequired
    }));
  }, []);

  const { startDetection, stopDetection } = useMediaPipe({ onDetection: handleDetection });

  const toggleMonitoring = () => {
    if (state.isMonitoring) {
      stopDetection();
      setState(prev => ({
        ...prev,
        isMonitoring: false,
        eyeStatus: 'Inactive',
        mouthStatus: 'Inactive',
        alertActive: false
      }));
    } else {
      setState(prev => ({ ...prev, isMonitoring: true }));
    }
  };

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    if (state.isMonitoring) {
      startDetection(video);
    }
  }, [state.isMonitoring, startDetection]);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <Header />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-400 mb-2">
            Drowsiness Detection System
          </h1>
          <p className="text-gray-400 text-lg">
            Advanced monitoring for driver safety and alertness
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Camera Feed */}
          <div className="lg:col-span-3">
            <CameraFeed 
              isActive={state.isMonitoring} 
              onVideoReady={handleVideoReady}
            />
          </div>

          {/* Status Panel */}
          <div className="space-y-4">
            <StatusCard 
              title="Eye Status" 
              status={state.eyeStatus} 
            />
            <StatusCard 
              title="Mouth Status" 
              status={state.mouthStatus} 
            />
            
            {/* Alert Indicator */}
            {state.alertActive && (
              <div className="bg-red-600 border border-red-500 rounded-lg p-4">
                <div className="flex items-center justify-center">
                  <div className="w-3 h-3 bg-red-300 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-red-100 font-semibold">DROWSINESS ALERT!</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Control Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={toggleMonitoring}
            className={`flex items-center px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 ${
              state.isMonitoring
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {state.isMonitoring ? (
              <>
                <Square className="w-5 h-5 mr-2" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Start Monitoring
              </>
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">How it works:</h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>The system monitors your eyes for signs of drowsiness using Eye Aspect Ratio (EAR) calculations</span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>Yawning detection is performed using Mouth Aspect Ratio (MAR) analysis</span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>When drowsiness is detected, an audio alarm will sound immediately and stop when you're alert</span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>Ensure your face is clearly visible and well-lit for optimal detection</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Audio Alarm Component */}
      <AlarmSystem isActive={state.alertActive} />
      console.log('Alarm active:', state.alertActive)
    </div>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthForm 
        mode={authMode} 
        onToggleMode={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} 
      />
    );
  }

  return <DrowsinessApp />;
};

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
export default App;
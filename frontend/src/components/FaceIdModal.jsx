import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { Scan, X, Lock, Unlock, ShieldAlert, ShieldCheck, Loader2, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FaceIdModal = ({ isOpen, onClose }) => {
  const webcamRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [scanStatus, setScanStatus] = useState('initializing'); // initializing, scanning, awaiting_passcode, success, failed
  const [scanMessage, setScanMessage] = useState('Loading Biometric Models...');
  const [labeledFaceDescriptors, setLabeledFaceDescriptors] = useState(null);
  const [passcode, setPasscode] = useState('');
  const passcodeRef = useRef(null);
  
  const isScanningRef = useRef(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      isScanningRef.current = true;
      loadModels();
    } else {
      isScanningRef.current = false;
    }
    return () => { isScanningRef.current = false; };
  }, [isOpen]);

  const loadModels = async () => {
    try {
      setScanStatus('initializing');
      setScanMessage('Loading Neural Network Weights...');
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      
      setScanMessage('Loading Reference Profiles...');
      await loadReferenceImages();
      
      setIsModelLoaded(true);
      setScanStatus('scanning');
      setScanMessage('Position your face in the frame');
    } catch (error) {
      console.error('Error loading models:', error);
      setScanStatus('failed');
      setScanMessage('System Error: Biometric models failed to load.');
    }
  };

  const loadReferenceImages = async () => {
    const images = ['img1.jpg', 'img2.jpg'];
    let descriptorsList = [];
    
    await Promise.all(
      images.map(async (imgName) => {
        try {
          const img = await faceapi.fetchImage(`/reference_faces/${imgName}`);
          const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
          if (detections) {
            descriptorsList.push(detections.descriptor);
          }
        } catch (e) {
          console.warn(`Could not load reference image ${imgName}`);
        }
      })
    );
    
    if (descriptorsList.length > 0) {
      setLabeledFaceDescriptors([new faceapi.LabeledFaceDescriptors('authorized_admin', descriptorsList)]);
    } else {
      setLabeledFaceDescriptors([]);
    }
  };

  const scanFace = async () => {
    if (!isScanningRef.current || scanStatus !== 'scanning') return;
    if (!webcamRef.current || !webcamRef.current.video || webcamRef.current.video.readyState !== 4) {
      if (isScanningRef.current) setTimeout(scanFace, 250);
      return;
    }
    
    if (!labeledFaceDescriptors || labeledFaceDescriptors.length === 0) {
      setScanStatus('failed');
      setScanMessage('SECURITY ALERT: No reference profiles found in system.');
      return;
    }
    
    const video = webcamRef.current.video;
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
    
    if (!detection) {
      setScanMessage('Face not detected. Look directly at the camera.');
      if (isScanningRef.current) setTimeout(scanFace, 250);
      return;
    }

    setScanMessage('Computing biometric hash...');
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.60); 
    const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

    if (bestMatch.label === 'authorized_admin' && (user.email === 'zeelkundariya13@gmail.com' || user.email === 'kakkadrachit1@gmail.com')) {
      // Phase 1 Success: Move to Phase 2 (Passcode)
      isScanningRef.current = false;
      setScanStatus('awaiting_passcode');
      setScanMessage('Identity verified. Enter Override Code.');
      setTimeout(() => {
        if(passcodeRef.current) passcodeRef.current.focus();
      }, 100);
    } else {
      setScanStatus('failed');
      setScanMessage('ACCESS DENIED: Unrecognized Face');
      setTimeout(() => {
        if(isOpen) {
          setScanStatus('scanning');
          setScanMessage('Retrying scan...');
          if (isScanningRef.current) setTimeout(scanFace, 250);
        }
      }, 3000);
    }
  };

  useEffect(() => {
    if (scanStatus === 'scanning' && isModelLoaded) {
      scanFace();
    }
  }, [scanStatus, isModelLoaded]);

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (passcode === 'zeeracnee') {
      setScanStatus('success');
      setScanMessage('OVERRIDE ACCEPTED. ACCESS GRANTED.');
      setTimeout(() => {
        onClose();
        navigate('/systemhijacking/dashboard');
      }, 2000);
    } else {
      setScanStatus('failed');
      setScanMessage('ACCESS DENIED: Invalid Override Code');
      setTimeout(() => {
        if (isOpen) {
          setScanStatus('awaiting_passcode');
          setScanMessage('Enter Override Code.');
          setPasscode('');
          if(passcodeRef.current) passcodeRef.current.focus();
        }
      }, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl" style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#0a0a0a' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold tracking-widest text-emerald-400 uppercase">System Hijack Protocol</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scanner View */}
        <div className="relative aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
          {scanStatus === 'initializing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
              <p className="text-xs font-mono text-emerald-400/70">{scanMessage}</p>
            </div>
          )}

          {scanStatus === 'awaiting_passcode' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/90 backdrop-blur-sm p-8">
              <Key className="w-12 h-12 text-amber-400 mb-6 animate-pulse" />
              <form onSubmit={handlePasscodeSubmit} className="w-full">
                <input
                  ref={passcodeRef}
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="ENTER OVERRIDE CODE"
                  className="w-full bg-black/50 border-2 border-amber-500/50 text-amber-400 text-center font-mono text-lg py-3 rounded-xl outline-none focus:border-amber-400 transition-colors placeholder:text-amber-400/30 tracking-widest"
                  autoFocus
                />
              </form>
            </div>
          )}

          {scanStatus === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-emerald-900/90 backdrop-blur-sm">
              <ShieldCheck className="w-16 h-16 text-emerald-400 mb-4" />
              <p className="text-sm font-bold tracking-widest text-emerald-400 uppercase">{scanMessage}</p>
              <p className="text-xs text-emerald-400/50 mt-2 font-mono">Redirecting to root access...</p>
            </div>
          )}

          {scanStatus === 'failed' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-red-950/90 backdrop-blur-sm">
              <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
              <p className="text-sm font-bold tracking-widest text-red-500 uppercase">{scanMessage}</p>
            </div>
          )}

          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "user" }}
            className={`w-full h-full object-cover transition-opacity duration-500 ${(scanStatus === 'initializing' || scanStatus === 'success' || scanStatus === 'awaiting_passcode') ? 'opacity-30' : 'opacity-100'}`}
          />

          {/* Scanning UI Overlays */}
          {scanStatus === 'scanning' && (
            <>
              {/* Target Brackets */}
              <div className="absolute inset-8 border-2 border-emerald-500/30">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400" />
              </div>
              {/* Scan Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_20px_5px_rgba(52,211,153,0.5)] animate-[scan_2s_ease-in-out_infinite]" />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0f0f0f] border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Target Entity</p>
              <p className="text-xs font-mono text-white/80">{user?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Status</p>
              <p className={`text-xs font-mono font-bold ${scanStatus === 'scanning' ? 'text-amber-400 animate-pulse' : scanStatus === 'failed' ? 'text-red-500' : scanStatus === 'awaiting_passcode' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {scanStatus === 'scanning' ? 'ANALYZING...' : scanStatus === 'failed' ? 'LOCKED' : scanStatus === 'awaiting_passcode' ? 'AWAITING CODE...' : 'UNLOCKED'}
              </p>
            </div>
          </div>
          <p className="text-center text-[9px] font-mono mt-4 text-emerald-400/40">
            {scanMessage}
          </p>
        </div>

      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}} />
    </div>
  );
};

export default FaceIdModal;

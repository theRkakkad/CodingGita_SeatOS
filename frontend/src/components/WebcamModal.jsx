import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import Modal from './Modal';
import { Camera, RefreshCw, Check } from 'lucide-react';

const WebcamModal = ({ isOpen, onClose, onConfirm }) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
  }, [webcamRef, setImgSrc]);

  const handleConfirm = () => {
    setIsCapturing(true);
    // Request geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsCapturing(false);
          onConfirm(imgSrc, position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          setIsCapturing(false);
          alert('Geolocation is required for booking. Please allow location access.');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setIsCapturing(false);
      alert('Geolocation is not supported by your browser.');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mandatory Security Check">
      <div className="space-y-4">
        <div className="text-center text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Please capture a live photo of yourself to confirm physical presence.
        </div>
        
        <div className="rounded-2xl overflow-hidden relative" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          {imgSrc ? (
            <img src={imgSrc} alt="captured face" className="w-full h-auto" />
          ) : (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full h-auto"
              videoConstraints={{ facingMode: "user" }}
            />
          )}
        </div>

        <div className="flex gap-3 mt-4">
          {imgSrc ? (
            <>
              <button onClick={() => setImgSrc(null)} disabled={isCapturing} className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <RefreshCw className="w-4 h-4" /> Retake
              </button>
              <button onClick={handleConfirm} disabled={isCapturing} className="cg-btn-gold flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold">
                {isCapturing ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Confirm Booking</>}
              </button>
            </>
          ) : (
            <button onClick={capture} className="cg-btn-gold w-full py-3 rounded-xl flex items-center justify-center gap-2 font-semibold">
              <Camera className="w-4 h-4" /> Capture Photo
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default WebcamModal;

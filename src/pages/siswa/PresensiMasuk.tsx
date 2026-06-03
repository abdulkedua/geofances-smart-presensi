import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import SiswaLayout from '../../components/SiswaLayout';
import { getDistanceFromLatLonInM } from '../../lib/utils';
import { MapPin, Camera, Check, X, Loader2 } from 'lucide-react';

export default function PresensiMasuk() {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  
  const [location, setLocation] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  
  // Dummy location from Admin DB later
  const TARGET_LOC = { lat: -6.2088, lng: 106.8456, radius: 100, name: 'Gedung Utama Sekolah' };
  
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(coords);
          
          const dist = getDistanceFromLatLonInM(coords.lat, coords.lng, TARGET_LOC.lat, TARGET_LOC.lng);
          setDistance(dist);
          setIsWithinGeofence(dist <= TARGET_LOC.radius);
          
          if (position.coords.accuracy > 100) {
            setLocationError('Akurasi GPS rendah. Coba cari area terbuka.');
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setLocationError('Akses lokasi ditolak. Aktifkan GPS dan berikan izin lokasi.');
          } else {
            setLocationError('Gagal mendapatkan lokasi: ' + error.message);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError('Browser Anda tidak mendukung Geolocation.');
    }
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) setImgSrc(imageSrc);
  }, [webcamRef]);

  const retake = () => {
    setImgSrc(null);
  };

  const submitPresensi = async () => {
    if (!location || !imgSrc || !isWithinGeofence) return;
    setIsSubmitting(true);
    
    // Simulate API Call
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Presensi Masuk Berhasil!');
      navigate('/siswa');
    }, 2000);
  };

  return (
    <SiswaLayout>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="bg-primary-600 p-4 text-white text-center">
          <h2 className="font-bold text-lg">Presensi Masuk</h2>
          <p className="text-primary-100 text-sm">Validasi Lokasi dan Wajah</p>
        </div>

        <div className="p-6">
          {/* Geofence Status */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Status Lokasi</h3>
            
            {locationError ? (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start">
                <X className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{locationError}</span>
              </div>
            ) : !location ? (
               <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Mencari sinyal GPS...
              </div>
            ) : (
              <div className={`p-4 border rounded-xl ${isWithinGeofence ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-start">
                  <MapPin className={`h-5 w-5 mr-3 mt-0.5 ${isWithinGeofence ? 'text-green-600' : 'text-red-600'}`} />
                  <div>
                    <p className={`font-semibold ${isWithinGeofence ? 'text-green-800' : 'text-red-800'}`}>
                      {isWithinGeofence ? 'Berada di Lokasi Presensi' : 'Di Luar Jangkauan Presensi'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Target: {TARGET_LOC.name} ({TARGET_LOC.radius}m)
                    </p>
                    <p className="text-xs text-gray-600">
                      Jarak Anda: {distance?.toFixed(2)} meter
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Akurasi GPS: ±{location.accuracy.toFixed(0)}m
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Camera Status */}
          {location && isWithinGeofence && !locationError && (
             <div className="mb-6">
               <h3 className="text-sm font-semibold text-gray-700 mb-2">Verifikasi Wajah (Selfie)</h3>
               <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center">
                  {!imgSrc ? (
                    <>
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "user" }}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={capture}
                        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-primary-600 p-4 rounded-full shadow-lg hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-primary-300"
                      >
                        <Camera className="h-6 w-6" />
                      </button>
                    </>
                  ) : (
                    <>
                       <img src={imgSrc} alt="Selfie" className="w-full h-full object-cover" />
                       <div className="absolute bottom-4 w-full flex justify-center space-x-4">
                          <button
                            onClick={retake}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg hover:bg-gray-700"
                          >
                            Foto Ulang
                          </button>
                       </div>
                    </>
                  )}
               </div>
             </div>
          )}

          {/* Submit Button */}
          <button
            onClick={submitPresensi}
            disabled={!location || !isWithinGeofence || !imgSrc || isSubmitting}
            className={`w-full py-3 rounded-xl font-bold flex justify-center items-center ${
              !location || !isWithinGeofence || !imgSrc
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700 shadow-md'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Kirim Presensi Masuk
              </>
            )}
          </button>
        </div>
      </div>
    </SiswaLayout>
  );
}

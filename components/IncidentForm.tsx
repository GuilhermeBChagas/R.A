
import React, { useState, useRef, useEffect } from 'react';
import { Building, User, Incident, AlterationType } from '../types';
import { Camera, Save, Loader2, Clock, Users, X, Search, Check, Trash2, MapPin, AlertCircle, FileText, ChevronDown, Plus, Image as ImageIcon, Sparkles, BrainCircuit } from 'lucide-react';
import { analyzeIncident } from '../services/geminiService';

interface IncidentFormProps {
  user: User;
  users: User[]; 
  buildings: Building[];
  alterationTypes: AlterationType[];
  nextRaCode: string; 
  onSave: (incident: Incident) => void;
  onCancel: () => void;
  initialData?: Incident | null; 
  isLoading?: boolean;
  preSelectedBuildingId?: string; 
}

export const IncidentForm: React.FC<IncidentFormProps> = ({ 
    user, users, buildings, alterationTypes, nextRaCode, onSave, onCancel, initialData, isLoading = false, preSelectedBuildingId
}) => {
  const getToday = () => new Date().toISOString().split('T')[0];
  
  // Form States
  const [buildingId, setBuildingId] = useState(preSelectedBuildingId || '');
  const [alterationType, setAlterationType] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getToday());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  
  // AI & Analysis States
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [severity, setSeverity] = useState<'Baixa' | 'Média' | 'Alta'>('Média');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // UI States
  const [formError, setFormError] = useState<string | null>(null);
  const [buildingSearchTerm, setBuildingSearchTerm] = useState('');
  const [isBuildingListOpen, setIsBuildingListOpen] = useState(false);
  
  // Geolocation States
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Vigilant Selection States
  const [vigilantSearch, setVigilantSearch] = useState('');
  const [selectedVigilants, setSelectedVigilants] = useState<User[]>([]);
  const [showVigilantList, setShowVigilantList] = useState(false);

  // Camera States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const vigilantRef = useRef<HTMLDivElement>(null);

  // Initialize Data
  useEffect(() => {
    if (initialData) {
        setBuildingId(initialData.buildingId);
        const b = buildings.find(x => x.id === initialData.buildingId);
        if (b) setBuildingSearchTerm(b.name);
        
        setAlterationType(initialData.alterationType);
        setDescription(initialData.description);
        setDate(initialData.date);
        setStartTime(initialData.startTime);
        setEndTime(initialData.endTime);
        setPhotos(initialData.photos || []);
        setAiAnalysis(initialData.aiAnalysis || '');
        setSeverity(initialData.severity || 'Média');
        
        // Parse vigilants string to users if possible
        if (initialData.vigilants) {
            const names = initialData.vigilants.split(',').map(s => s.trim());
            const foundUsers = users.filter(u => names.includes(u.name));
            if (foundUsers.length > 0) setSelectedVigilants(foundUsers);
        }
    } else {
        // Default: Add current user as vigilant
        setSelectedVigilants([user]);
        if (preSelectedBuildingId) {
             const b = buildings.find(x => x.id === preSelectedBuildingId);
             if (b) setBuildingSearchTerm(b.name);
        }
    }
  }, [initialData, buildings, preSelectedBuildingId, user, users]);

  // Close dropdowns on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
              setIsBuildingListOpen(false);
          }
          if (vigilantRef.current && !vigilantRef.current.contains(event.target as Node)) {
              setShowVigilantList(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Camera Logic: Attach stream to video element when open
  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
        videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
        stopCamera();
    };
  }, []);

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                  facingMode: 'environment', // Prefer rear camera
                  width: { ideal: 3840 },    // Try 4K width
                  height: { ideal: 2160 }    // Try 4K height
              }, 
              audio: false 
          });
          setCameraStream(stream);
          setIsCameraOpen(true);
      } catch (err) {
          console.error("Erro ao acessar câmera:", err);
          alert("Não foi possível acessar a câmera com alta qualidade. Verifique as permissões.");
      }
  };

  const stopCamera = () => {
      if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
      }
      setIsCameraOpen(false);
  };

  const capturePhoto = () => {
      if (videoRef.current) {
          const video = videoRef.current;
          const canvas = document.createElement('canvas');
          // Set canvas dimensions to match actual video stream resolution
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              // Convert to jpeg base64 with MAXIMUM quality (1.0)
              const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
              setPhotos(prev => [...prev, dataUrl]);
              stopCamera();
          }
      }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          // Limit increased slightly to allow high res photos, though Supabase might have hard limits
          if (file.size > 10 * 1024 * 1024) {
              setFormError("A imagem deve ter no máximo 10MB.");
              return;
          }
          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  setPhotos(prev => [...prev, event.target!.result as string]);
                  setFormError(null);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const removePhoto = (index: number) => {
      setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const toggleVigilant = (u: User) => {
      if (selectedVigilants.some(v => v.id === u.id)) {
          setSelectedVigilants(prev => prev.filter(v => v.id !== u.id));
      } else {
          setSelectedVigilants(prev => [...prev, u]);
      }
      setVigilantSearch('');
  };

  // Logic for Geolocation
  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      var R = 6371; 
      var dLat = (lat2 - lat1) * (Math.PI / 180);
      var dLon = (lon2 - lon1) * (Math.PI / 180);
      var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
  };

  const handleLocateNearest = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
        setLocationError("Geolocalização não suportada.");
        return;
    }
    
    const buildingsWithCoords = buildings.filter(b => b.latitude && b.longitude);
    if (buildingsWithCoords.length === 0) {
        setLocationError("Nenhum prédio possui coordenadas.");
        return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            let nearestBuilding: Building | null = null;
            let minDistance = Infinity;
            
            buildingsWithCoords.forEach(b => {
                const latStr = b.latitude!.toString().replace(',', '.');
                const lngStr = b.longitude!.toString().replace(',', '.');
                
                const bLat = parseFloat(latStr);
                const bLng = parseFloat(lngStr);

                if (!isNaN(bLat) && !isNaN(bLng)) {
                    const dist = getDistanceFromLatLonInKm(userLat, userLng, bLat, bLng);
                    if (dist < minDistance) { 
                        minDistance = dist; 
                        nearestBuilding = b; 
                    }
                }
            });

            if (nearestBuilding) {
                const b = nearestBuilding as Building;
                setBuildingId(b.id);
                setBuildingSearchTerm(b.name);
                setFormError(null);
            } else { 
                setLocationError("Não foi possível determinar o prédio mais próximo."); 
            }
            setIsLocating(false);
        },
        (error) => { 
            let msg = "Erro ao obter localização.";
            if (error.code === 1) msg = "Permissão negada.";
            else if (error.code === 2) msg = "Sinal GPS indisponível.";
            else if (error.code === 3) msg = "Tempo limite esgotado.";
            setLocationError(msg); 
            setIsLocating(false); 
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleAnalyzeWithAI = async () => {
      if (!description || description.length < 10) {
          setFormError("Descreva a ocorrência com mais detalhes para utilizar a I.A.");
          return;
      }
      
      setIsAnalyzing(true);
      setFormError(null);
      
      try {
          const result = await analyzeIncident(description);
          setAiAnalysis(result.summary);
          setSeverity(result.severity);
      } catch (error) {
          setFormError("Erro na análise inteligente. Verifique sua conexão.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const filteredBuildings = buildings.filter(b => 
    b.name.toLowerCase().includes(buildingSearchTerm.toLowerCase()) || 
    b.buildingNumber.toLowerCase().includes(buildingSearchTerm.toLowerCase())
  );

  const filteredVigilants = users.filter(u => 
      u.status === 'ACTIVE' && 
      (u.name.toLowerCase().includes(vigilantSearch.toLowerCase()) || 
       u.matricula.toLowerCase().includes(vigilantSearch.toLowerCase()))
  );

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      // 1. Validate Mandatory Fields
      if (!buildingId) { setFormError("Por favor, selecione o Local da ocorrência."); return; }
      if (!alterationType) { setFormError("Selecione a Natureza (Tipo de Alteração)."); return; }
      if (!description.trim()) { setFormError("O campo Relato é obrigatório."); return; }
      if (!date) { setFormError("Informe a Data do evento."); return; }
      if (!startTime) { setFormError("Informe a Hora Inicial."); return; }
      if (!endTime) { setFormError("Informe a Hora Final."); return; } // Mandatory per prompt
      if (selectedVigilants.length === 0) { setFormError("Selecione ao menos um Vigilante responsável."); return; }

      // 2. Validate Time Logic
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const timeStart = startH * 60 + startM;
      const timeEnd = endH * 60 + endM;

      if (timeEnd <= timeStart) {
          setFormError("A Hora Final deve ser posterior à Hora Inicial.");
          return;
      }

      // 3. Construct Payload
      const incidentData: Incident = {
          id: initialData?.id || crypto.randomUUID(),
          raCode: initialData?.raCode || nextRaCode,
          buildingId,
          userId: user.id,
          operatorName: user.name, // The person filling the form (Operator)
          vigilants: selectedVigilants.map(v => v.name).join(', '), // List of vigilants involved
          date,
          startTime,
          endTime,
          alterationType,
          description,
          photos,
          aiAnalysis: aiAnalysis || undefined,
          severity,
          status: initialData?.status || 'PENDING',
          timestamp: new Date().toISOString()
      };

      onSave(incidentData);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full md:h-auto md:min-h-0 relative">
        {/* Header */}
        <div className="px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 z-30 backdrop-blur-md bg-opacity-90">
            <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase tracking-tight">
                    {initialData ? 'Editar Ocorrência' : 'Novo Registro'}
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">RA {initialData?.raCode || nextRaCode}</p>
            </div>
            <button onClick={onCancel} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>

        {formError && (
            <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
                <p className="text-sm font-bold text-red-600 dark:text-red-400 uppercase">{formError}</p>
            </div>
        )}

        {/* Scrollable Content */}
        <form className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
            
            {/* Section: Location */}
            <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">1. Localização *</label>
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative group flex-1" ref={searchRef}>
                        <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                            type="text"
                            value={buildingSearchTerm}
                            onChange={(e) => { 
                                setBuildingSearchTerm(e.target.value); 
                                setIsBuildingListOpen(true
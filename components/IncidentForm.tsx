
import React, { useState, useRef, useEffect } from 'react';
import { Building, User, Incident, AlterationType } from '../types';
import { Camera, Save, Loader2, Clock, Users, X, Search, Check, Trash2, MapPin, AlertCircle, FileText, ChevronDown, Plus, Image as ImageIcon } from 'lucide-react';

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
                                setIsBuildingListOpen(true); 
                                if (!e.target.value) setBuildingId('');
                            }}
                            onFocus={() => setIsBuildingListOpen(true)}
                            className={`block w-full pl-12 pr-4 py-4 rounded-2xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all ${buildingId ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50 text-blue-900 dark:text-blue-400' : 'border-slate-200'}`}
                            placeholder="Pesquisar Próprio Municipal..."
                        />
                        {isBuildingListOpen && buildingSearchTerm && !buildingId && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                                {filteredBuildings.length > 0 ? filteredBuildings.map(b => (
                                    <div 
                                        key={b.id} 
                                        onClick={() => {
                                            setBuildingId(b.id);
                                            setBuildingSearchTerm(b.name);
                                            setIsBuildingListOpen(false);
                                            setFormError(null);
                                        }}
                                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 border-b border-slate-50 dark:border-slate-700 last:border-0"
                                    >
                                        <span className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[10px] font-black px-2 py-1 rounded">{b.buildingNumber}</span>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{b.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase">{b.address}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-4 text-center text-xs text-slate-400">Nenhum local encontrado</div>
                                )}
                            </div>
                        )}
                        {buildingId && (
                            <button 
                                type="button"
                                onClick={() => { setBuildingId(''); setBuildingSearchTerm(''); }}
                                className="absolute right-4 top-4 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                    <button 
                        type="button" 
                        onClick={handleLocateNearest}
                        disabled={isLocating}
                        className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-4 py-4 sm:py-0 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-colors border border-blue-100 dark:border-blue-800 shadow-sm w-full sm:w-auto"
                        title="Localizar Próximo (GPS)"
                    >
                        {isLocating ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                        <span className="sm:hidden">Localizar (GPS)</span>
                        <span className="hidden sm:inline">GPS</span>
                    </button>
                </div>
                {locationError && (
                    <div className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-1">
                        <AlertCircle size={10} /> {locationError}
                    </div>
                )}
            </div>

            {/* Section: Vigilants */}
            <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">2. Vigilantes Envolvidos *</label>
                <div className="space-y-3">
                    <div className="relative" ref={vigilantRef}>
                        <Users className="absolute left-4 top-4 text-slate-400" size={18} />
                        <input 
                            type="text"
                            value={vigilantSearch}
                            onFocus={() => setShowVigilantList(true)}
                            onChange={(e) => { setVigilantSearch(e.target.value); setShowVigilantList(true); }}
                            className="block w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Adicionar vigilante..."
                        />
                        {showVigilantList && vigilantSearch && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                                {filteredVigilants.map(u => {
                                    const isSelected = selectedVigilants.some(v => v.id === u.id);
                                    if (isSelected) return null;
                                    return (
                                        <div 
                                            key={u.id} 
                                            onClick={() => toggleVigilant(u)}
                                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-[10px] font-black text-blue-700 dark:text-blue-300">
                                                    {u.name.charAt(0)}
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{u.name}</span>
                                            </div>
                                            <Plus size={14} className="text-slate-400 group-hover:text-blue-500" />
                                        </div>
                                    );
                                })}
                                {filteredVigilants.length === 0 && <div className="p-3 text-center text-xs text-slate-400">Nenhum usuário encontrado</div>}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {selectedVigilants.map(v => (
                            <span key={v.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 text-xs font-black uppercase">
                                {v.name}
                                <button onClick={() => toggleVigilant(v)} className="hover:text-red-500 transition-colors"><X size={12} strokeWidth={3} /></button>
                            </span>
                        ))}
                        {selectedVigilants.length === 0 && (
                            <span className="text-xs text-slate-400 italic pl-1">Nenhum vigilante selecionado.</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Section: Details */}
            <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">3. Detalhes do Evento *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <select 
                            value={alterationType} 
                            onChange={e => setAlterationType(e.target.value)}
                            className="block w-full py-4 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none uppercase"
                        >
                            <option value="">Selecione a Natureza...</option>
                            {alterationTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={20} />
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                        <div className="col-span-2 relative">
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full py-4 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="col-span-3 flex gap-2">
                            <div className="relative flex-1">
                                <span className="absolute top-1 left-2 text-[9px] font-black text-slate-400 uppercase">Início</span>
                                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full pt-5 pb-2 px-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 text-center" />
                            </div>
                            <div className="relative flex-1">
                                <span className="absolute top-1 left-2 text-[9px] font-black text-slate-400 uppercase">Fim</span>
                                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full pt-5 pb-2 px-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 text-center" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section: Description */}
            <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">4. Relato *</label>
                <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    rows={6}
                    className="block w-full p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all uppercase leading-relaxed"
                    placeholder="Descreva a ocorrência com detalhes técnicos..."
                />
            </div>

            {/* Section: Photos */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">5. Evidências</label>
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-md">{photos.length}/5</span>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {photos.map((photo, index) => (
                        <div key={index} className="relative aspect-square group rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                            <img src={photo} alt="evidence" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removePhoto(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"><X size={12}/></button>
                        </div>
                    ))}
                    
                    {photos.length < 5 && (
                        <>
                            {/* Button: Take Photo */}
                            <button 
                                type="button"
                                onClick={startCamera} 
                                className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all group bg-white dark:bg-slate-900"
                            >
                                <Camera className="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-1 transition-colors" />
                                <span className="text-[9px] font-black text-slate-400 uppercase group-hover:text-blue-500">Câmera</span>
                            </button>

                            {/* Button: Upload from Gallery */}
                            <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all group bg-white dark:bg-slate-900">
                                <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-1 transition-colors" />
                                <span className="text-[9px] font-black text-slate-400 uppercase group-hover:text-blue-500">Galeria</span>
                                <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                            </label>
                        </>
                    )}
                </div>
            </div>
        </form>

        {/* Footer Actions */}
        <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-30">
            <button 
                type="button" 
                onClick={onCancel} 
                className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={handleSubmit} 
                disabled={isLoading}
                className="flex-[2] bg-blue-600 text-white py-3.5 rounded-xl text-xs font-black uppercase shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Finalizar Registro
            </button>
        </div>

        {/* Fullscreen Camera Overlay */}
        {isCameraOpen && (
            <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
                <div className="absolute top-4 right-4 z-20">
                    <button 
                        onClick={stopCamera} 
                        className="bg-black/50 text-white p-3 rounded-full backdrop-blur-md hover:bg-black/70 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted
                        className="w-full h-full object-cover md:object-contain"
                    />
                </div>

                <div className="absolute bottom-8 w-full flex justify-center items-center z-20 pb-4">
                    <button 
                        onClick={capturePhoto} 
                        className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                    >
                        <div className="w-16 h-16 bg-white rounded-full border-2 border-black/10"></div>
                    </button>
                </div>
                
                <div className="absolute bottom-10 left-8 text-white text-xs font-bold uppercase opacity-80 hidden md:block">
                    Câmera Ativa
                </div>
            </div>
        )}
    </div>
  );
};

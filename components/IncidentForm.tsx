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
        
        if (initialData.vigilants) {
            const names = initialData.vigilants.split(',').map(s => s.trim());
            const foundUsers = users.filter(u => names.includes(u.name));
            if (foundUsers.length > 0) setSelectedVigilants(foundUsers);
        }
    } else {
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

  // Camera Logic
  useEffect(() => {
    if (isCameraOpen && cameraStream && videoRef.current) {
        videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

  useEffect(() => {
    return () => {
        stopCamera();
    };
  }, []);

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                  facingMode: 'environment',
                  width: { ideal: 1920 },
                  height: { ideal: 1080 }
              }, 
              audio: false 
          });
          setCameraStream(stream);
          setIsCameraOpen(true);
      } catch (err) {
          console.error("Erro ao acessar câmera:", err);
          alert("Não foi possível acessar a câmera. Verifique as permissões.");
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
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              setPhotos(prev => [...prev, dataUrl]);
              stopCamera();
          }
      }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
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
                const bLat = parseFloat(b.latitude!.replace(',', '.'));
                const bLng = parseFloat(b.longitude!.replace(',', '.'));
                if (!isNaN(bLat) && !isNaN(bLng)) {
                    const R = 6371; 
                    const dLat = (bLat - userLat) * (Math.PI / 180);
                    const dLon = (bLng - userLng) * (Math.PI / 180);
                    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(userLat * Math.PI/180) * Math.cos(bLat * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    const dist = R * c;
                    if (dist < minDistance) { minDistance = dist; nearestBuilding = b; }
                }
            });

            if (nearestBuilding) {
                setBuildingId(nearestBuilding.id);
                setBuildingSearchTerm(nearestBuilding.name);
            } else { setLocationError("Não foi possível encontrar o local."); }
            setIsLocating(false);
        },
        () => { setLocationError("Erro ao obter GPS."); setIsLocating(false); },
        { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAnalyzeWithAI = async () => {
      if (!description || description.length < 15) {
          setFormError("Descreva o relato com mais detalhes para a I.A.");
          return;
      }
      setIsAnalyzing(true);
      try {
          const result = await analyzeIncident(description);
          setAiAnalysis(result.summary);
          setSeverity(result.severity);
      } catch (err) {
          setFormError("Erro ao analisar com I.A.");
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
      if (!buildingId || !alterationType || !description || !date || !startTime || !endTime || selectedVigilants.length === 0) {
          setFormError("Preencha todos os campos obrigatórios.");
          return;
      }
      
      const incidentData: Incident = {
          id: initialData?.id || crypto.randomUUID(),
          raCode: initialData?.raCode || nextRaCode,
          buildingId,
          userId: user.id,
          operatorName: user.name,
          vigilants: selectedVigilants.map(v => v.name).join(', '),
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
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full md:h-auto relative">
        {/* Header */}
        <div className="px-6 py-5 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex justify-between items-center sticky top-0 z-30">
            <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase tracking-tight">
                    {initialData ? 'Editar Ocorrência' : 'Novo Registro'}
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">RA {initialData?.raCode || nextRaCode}</p>
            </div>
            <button onClick={onCancel} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500 hover:bg-slate-200">
                <X size={20} />
            </button>
        </div>

        {formError && (
            <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-red-500 mt-0.5" size={18} />
                <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">{formError}</p>
            </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto flex-1">
            {/* Localização */}
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Localização *</label>
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative group flex-1" ref={searchRef}>
                        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                        <input 
                            type="text"
                            value={buildingSearchTerm}
                            onFocus={() => setIsBuildingListOpen(true)}
                            onChange={(e) => { setBuildingSearchTerm(e.target.value); setIsBuildingListOpen(true); if(buildingId) setBuildingId(''); }}
                            placeholder="PESQUISAR PRÓPRIO MUNICIPAL..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {isBuildingListOpen && buildingSearchTerm && filteredBuildings.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                                {filteredBuildings.map(b => (
                                    <div key={b.id} onClick={() => { setBuildingId(b.id); setBuildingSearchTerm(b.name); setIsBuildingListOpen(false); }} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center border-b dark:border-slate-700 last:border-0">
                                        <div>
                                            <p className="text-xs font-bold uppercase">{b.name}</p>
                                            <p className="text-[9px] text-slate-400">{b.address}</p>
                                        </div>
                                        <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">{b.buildingNumber}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={handleLocateNearest} disabled={isLocating} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-800">
                        {isLocating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />} GPS
                    </button>
                </div>
                {locationError && <p className="text-[9px] text-red-500 font-bold uppercase ml-1">{locationError}</p>}
            </div>

            {/* Natureza & Tempo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Natureza da Ocorrência *</label>
                    <select value={alterationType} onChange={e => setAlterationType(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">SELECIONE O TIPO...</option>
                        {alterationTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                </div>
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Data e Horário *</label>
                    <div className="grid grid-cols-3 gap-2">
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none col-span-1" />
                        <div className="relative flex-1">
                            <Clock className="absolute left-2.5 top-3.5 text-slate-400" size={14}/>
                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full pl-8 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none" title="Início" />
                        </div>
                        <div className="relative flex-1">
                            <Clock className="absolute left-2.5 top-3.5 text-slate-400" size={14}/>
                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full pl-8 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none" title="Término" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Vigilantes Responsáveis */}
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">4. Vigilantes Responsáveis *</label>
                <div className="relative" ref={vigilantRef}>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[50px] mb-2">
                        {selectedVigilants.map(v => (
                            <span key={v.id} className="bg-blue-600 text-white px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm">
                                {v.name}
                                {v.id !== user.id && <button type="button" onClick={() => toggleVigilant(v)}><X size={12}/></button>}
                            </span>
                        ))}
                        <input 
                            type="text" 
                            placeholder={selectedVigilants.length === 0 ? "SELECIONAR VIGILANTES..." : ""} 
                            value={vigilantSearch}
                            onFocus={() => setShowVigilantList(true)}
                            onChange={e => { setVigilantSearch(e.target.value); setShowVigilantList(true); }}
                            className="bg-transparent text-xs font-bold uppercase outline-none flex-1 min-w-[120px]"
                        />
                    </div>
                    {showVigilantList && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                            {filteredVigilants.map(u => (
                                <div key={u.id} onClick={() => toggleVigilant(u)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center border-b dark:border-slate-700 last:border-0">
                                    <span className="text-xs font-bold uppercase">{u.name}</span>
                                    {selectedVigilants.some(v => v.id === u.id) ? <Check className="text-blue-500" size={16} /> : <Plus className="text-slate-300" size={16} />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Relato e Análise IA */}
            <div className="space-y-4">
                <div className="flex justify-between items-end px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">5. Relato da Ocorrência *</label>
                    <button 
                        type="button" 
                        onClick={handleAnalyzeWithAI}
                        disabled={isAnalyzing || !description}
                        className="flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                        {isAnalyzing ? <Loader2 size={12} className="animate-spin"/> : <BrainCircuit size={12}/>}
                        Análise Inteligente (IA)
                    </button>
                </div>
                <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="DESCREVA DETALHADAMENTE O QUE FOI CONSTATADO..." 
                    className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none uppercase"
                />
                
                {aiAnalysis && (
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 p-4 rounded-r-2xl animate-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1"><Sparkles size={10}/> Resumo Gerado pela IA</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${severity === 'Alta' ? 'bg-red-500 text-white' : severity === 'Média' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>Risco {severity}</span>
                        </div>
                        <p className="text-xs text-indigo-900 dark:text-indigo-200 font-bold italic leading-relaxed">"{aiAnalysis}"</p>
                    </div>
                )}
            </div>

            {/* Evidências Fotográficas */}
            <div className="space-y-4 pb-10">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">6. Evidências Fotográficas</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {photos.map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group shadow-sm border border-slate-200 dark:border-slate-700">
                            <img src={photo} className="w-full h-full object-cover" alt="Evidência" />
                            <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                        </div>
                    ))}
                    <button type="button" onClick={startCamera} className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-500 transition-all bg-slate-50 dark:bg-slate-800/50">
                        <Camera size={24} strokeWidth={1.5} />
                        <span className="text-[9px] font-black uppercase">Câmera</span>
                    </button>
                    <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-emerald-500 transition-all bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                        <ImageIcon size={24} strokeWidth={1.5} />
                        <span className="text-[9px] font-black uppercase">Galeria</span>
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                </div>
            </div>

            {/* Ações */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t dark:border-slate-800 md:relative md:bg-transparent md:border-0 md:p-0 flex flex-col-reverse sm:flex-row gap-3">
                <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black uppercase hover:bg-slate-200 active:scale-95 transition-all">Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-[2] py-4 bg-blue-900 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-500/20 hover:bg-blue-800 active:scale-95 transition-all flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="animate-spin" /> : <Save size={18}/>}
                    {initialData ? 'SALVAR ALTERAÇÕES' : 'FINALIZAR REGISTRO'}
                </button>
            </div>
        </form>

        {/* Camera Overlay */}
        {isCameraOpen && (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in">
                <div className="relative flex-1">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <button onClick={stopCamera} className="absolute top-6 right-6 bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20"><X size={24}/></button>
                </div>
                <div className="bg-black/50 p-10 flex items-center justify-center gap-10 border-t border-white/10">
                    <button onClick={stopCamera} className="text-white/60 font-black text-xs uppercase tracking-widest hover:text-white">Cancelar</button>
                    <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 shadow-2xl active:scale-90 transition-transform flex items-center justify-center">
                        <div className="w-16 h-16 bg-white rounded-full border-2 border-slate-800"></div>
                    </button>
                    <div className="w-16"></div>
                </div>
            </div>
        )}
    </div>
  );
};

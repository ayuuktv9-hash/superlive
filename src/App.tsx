import React, { useState, useEffect, createContext, useContext, Component } from 'react';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, limit, Timestamp, serverTimestamp, addDoc, updateDoc, deleteDoc, increment } from 'firebase/firestore';
import { UserProfile, Stream, GIFTS } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, LogOut, Video, User, Home as HomeIcon, MessageSquare, Gift as GiftIcon, X, Send, Heart, Star, Users, Flame, Search, Share2, ShieldAlert, Sparkles, Wand2, RefreshCw } from 'lucide-react';
import { suggestStreamTitles, suggestBio, suggestChatMessages, suggestStreamTags } from './services/geminiService';

// --- Context ---
interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  followingIds: string[];
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  toggleFollow: (targetUserId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within a AuthProvider');
  return context;
};

// --- Components ---

const HeartBurst = ({ onComplete }: { onComplete: () => void }) => {
  const hearts = Array.from({ length: 12 });
  
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {hearts.map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 1, 
            scale: 0, 
            x: '50%', 
            y: '80%',
            rotate: 0 
          }}
          animate={{ 
            opacity: 0, 
            scale: [0, 1.5, 1], 
            x: `${40 + Math.random() * 20}%`, 
            y: `${20 + Math.random() * 40}%`,
            rotate: Math.random() * 360 
          }}
          transition={{ 
            duration: 1.5, 
            ease: "easeOut",
            delay: Math.random() * 0.2
          }}
          onAnimationComplete={i === 0 ? onComplete : undefined}
          className="absolute text-brand-500"
        >
          <Heart className="w-8 h-8 fill-brand-500" />
        </motion.div>
      ))}
    </div>
  );
};

const BottomNav = ({ activePage, onNavigate }: { activePage: string, onNavigate: (page: string) => void }) => {
  const { user } = useAuth();
  if (!user) return null;

  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Inicio' },
    { id: 'go-live', icon: Video, label: 'En Vivo', special: true },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-gray-100/50 px-6 py-3 flex justify-around items-center z-50 lg:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => (
        item.special ? (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="w-14 h-14 bg-gradient-to-tr from-brand-600 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/30 -mt-10 border-4 border-white active:scale-90 transition-all"
          >
            <item.icon className="w-7 h-7" />
          </button>
        ) : (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${activePage === item.id ? 'text-brand-600 scale-110' : 'text-gray-400'}`}
          >
            <item.icon className={`w-6 h-6 ${activePage === item.id ? 'fill-brand-600/10' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        )
      ))}
    </nav>
  );
};

const Header = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { user } = useAuth();

  return (
    <header className="bg-white/70 backdrop-blur-xl border-b border-gray-100/50 sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('home')}>
        <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform">
          <Flame className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-display font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-orange-500">
          SuperLive ES
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="hidden sm:flex items-center gap-3 bg-white/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-bold text-gray-700">{(user?.coins || 0).toLocaleString()}</span>
              </div>
              <button 
                onClick={() => alert("Función de recarga próximamente")}
                className="bg-brand-600 text-white text-[10px] font-black px-2 py-1 rounded-lg hover:bg-brand-700 transition-colors"
              >
                + RECARGAR
              </button>
            </div>
            <button 
              onClick={() => onNavigate('profile')}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-brand-100 hover:border-brand-400 transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt={user.displayName} referrerPolicy="no-referrer" />
            </button>
          </>
        )}
      </div>
    </header>
  );
};

const Login = () => {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-50 via-white to-orange-50 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-200/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-200/20 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[40px] shadow-2xl shadow-brand-500/5 p-10 text-center border border-white/50 relative z-10"
      >
        <div className="w-24 h-24 bg-gradient-to-tr from-brand-600 to-orange-500 rounded-[32px] flex items-center justify-center shadow-2xl shadow-brand-500/30 mx-auto mb-8 transform -rotate-6">
          <Flame className="text-white w-12 h-12" />
        </div>
        <h2 className="text-4xl font-display font-extrabold text-gray-900 mb-3 tracking-tight">SuperLive ES</h2>
        <p className="text-gray-500 mb-10 text-lg leading-relaxed">Conéctate, comparte y disfruta de los mejores directos en español.</p>
        
        <button 
          onClick={signIn}
          className="w-full flex items-center justify-center gap-4 bg-white border border-gray-100 hover:border-brand-200 py-4 px-6 rounded-2xl font-bold text-gray-700 transition-all hover:shadow-xl hover:shadow-brand-500/5 active:scale-95 group"
        >
          <img src="https://www.google.com/favicon.ico" className="w-6 h-6 group-hover:scale-110 transition-transform" alt="Google" />
          Continuar con Google
        </button>
        
        <p className="mt-8 text-xs text-gray-400 font-medium uppercase tracking-widest">La comunidad #1 de streaming</p>
      </motion.div>
    </div>
  );
};

const Home = ({ onNavigate }: { onNavigate: (page: string, params?: any) => void }) => {
  const { user, followingIds, toggleFollow } = useAuth();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [topStreamers, setTopStreamers] = useState<UserProfile[]>([]);
  const [suggestedStreamers, setSuggestedStreamers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'leaderboard'>('live');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (activeTab === 'live') {
      const q = query(
        collection(db, 'streams'),
        where('status', '==', 'live'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const streamList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stream));
        setStreams(streamList);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'streams');
      });

      // Fetch top streamers for the horizontal scroll
      const streamersQuery = query(
        collection(db, 'users'),
        orderBy('followersCount', 'desc'),
        limit(10)
      );
      const unsubscribeStreamers = onSnapshot(streamersQuery, (snapshot) => {
        setTopStreamers(snapshot.docs.map(doc => doc.data() as UserProfile));
      });

      // Fetch suggested streamers (random-ish subset)
      const suggestedQuery = query(
        collection(db, 'users'),
        limit(20)
      );
      const unsubscribeSuggested = onSnapshot(suggestedQuery, (snapshot) => {
        const all = snapshot.docs.map(doc => doc.data() as UserProfile);
        // Shuffle and take 6
        setSuggestedStreamers(all.sort(() => 0.5 - Math.random()).slice(0, 6));
      });

      return () => {
        unsubscribe();
        unsubscribeStreamers();
        unsubscribeSuggested();
      };
    }
  }, [activeTab]);

  const filteredStreams = streams.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.creatorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto pb-24 sm:pb-8">
      {/* Top Streamers Horizontal Scroll */}
      {activeTab === 'live' && topStreamers.length > 0 && (
        <div className="mb-10 overflow-hidden">
          <h3 className="text-lg font-display font-bold text-gray-900 mb-4 px-2">Streamers Destacados</h3>
          <div className="flex gap-6 overflow-x-auto pb-4 px-2 no-scrollbar">
            {topStreamers.map((streamer) => (
              <div key={streamer.uid} className="flex flex-col items-center gap-2 min-w-[80px]">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-brand-500 to-orange-500">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                      <img src={streamer.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamer.uid}`} alt={streamer.displayName} referrerPolicy="no-referrer" />
                    </div>
                  </div>
                  {streamer.isLive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full border border-white shadow-sm">
                      EN VIVO
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-gray-700 truncate w-20 text-center">{streamer.displayName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100/50 p-1.5 rounded-2xl border border-gray-200/50 w-fit">
            <button 
              onClick={() => setActiveTab('live')}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'live' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Flame className={`w-4 h-4 ${activeTab === 'live' ? 'text-orange-500' : 'text-gray-400'}`} />
              En Vivo
            </button>
            <button 
              onClick={() => setActiveTab('leaderboard')}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'leaderboard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Star className={`w-4 h-4 ${activeTab === 'leaderboard' ? 'text-yellow-500' : 'text-gray-400'}`} />
              Ranking
            </button>
          </div>

          {activeTab === 'live' && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar directos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>
          )}
        </div>
        
        <button 
          onClick={() => onNavigate('go-live')}
          className="hidden sm:flex bg-gradient-to-r from-brand-600 to-orange-500 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all items-center justify-center gap-2"
        >
          <Video className="w-5 h-5" />
          Transmitir Ahora
        </button>
      </div>

      {activeTab === 'leaderboard' ? (
        <Leaderboard />
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-[3/4] bg-gray-100 rounded-[32px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-3">
            {filteredStreams.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[40px] border border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Video className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-2xl font-display font-bold text-gray-900 mb-2">No se encontraron directos</h3>
                <p className="text-gray-500">Prueba con otra búsqueda o ¡sé el primero en transmitir!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredStreams.map(stream => (
                  <motion.div 
                    key={stream.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -8 }}
                    onClick={() => onNavigate('view-stream', { streamId: stream.id })}
                    className="group relative aspect-[3/4] bg-gray-900 rounded-[32px] overflow-hidden cursor-pointer shadow-xl shadow-gray-200/50"
                  >
                    <img 
                      src={`https://picsum.photos/seed/${stream.id}/400/600`} 
                      className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-700 ease-out"
                      alt={stream.title}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <div className="bg-brand-600/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5 border border-white/20">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                            EN VIVO
                          </div>
                          {stream.viewersCount > 50 && (
                            <div className="bg-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                              <Flame className="w-3.5 h-3.5" />
                              TENDENCIA
                            </div>
                          )}
                        </div>
                        <div className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                          <Users className="w-3.5 h-3.5" />
                          {(stream?.viewersCount || 0).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <h3 className="text-white font-display font-bold text-xl mb-3 line-clamp-2 leading-tight">{stream.title}</h3>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 shadow-lg">
                            <img src={stream.creatorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.creatorId}`} alt={stream.creatorName} referrerPolicy="no-referrer" />
                          </div>
                          <span className="text-white font-bold text-sm tracking-wide">{stream.creatorName}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Suggestions */}
          <div className="hidden lg:block space-y-8">
            <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-display font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-500" />
                Sugerencias
              </h3>
              <div className="space-y-6">
                {suggestedStreamers.map((streamer) => (
                  <div key={streamer.uid} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 shadow-sm group-hover:scale-105 transition-transform">
                        <img src={streamer.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${streamer.uid}`} alt={streamer.displayName} referrerPolicy="no-referrer" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate w-24">{streamer.displayName}</p>
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            {(streamer?.followersCount || 0).toLocaleString()} Segs
                          </p>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span className="text-[9px] text-brand-500 font-black uppercase tracking-tighter">IA: {['Top Gaming', 'Estrella Naciente', 'Tendencia', 'Recomendado'][Math.floor(Math.random() * 4)]}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleFollow(streamer.uid)}
                      className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all uppercase tracking-widest ${
                        followingIds.includes(streamer.uid) 
                          ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600' 
                          : 'bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white'
                      }`}
                    >
                      {followingIds.includes(streamer.uid) ? 'Siguiendo' : 'Seguir'}
                    </button>
                  </div>
                ))}
              </div>
              <button className="w-full mt-8 py-3 text-xs font-bold text-gray-400 hover:text-brand-600 transition-colors uppercase tracking-widest border-t border-gray-50">
                Ver más sugerencias
              </button>
            </div>

            <div className="bg-gradient-to-br from-brand-600 to-orange-500 rounded-[32px] p-8 text-white shadow-xl shadow-brand-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              <h4 className="text-xl font-display font-black mb-2 relative z-10">¿Quieres ser streamer?</h4>
              <p className="text-white/80 text-sm font-medium mb-6 relative z-10">Empieza tu primer directo hoy y gana monedas de tus fans.</p>
              <button 
                onClick={() => onNavigate('go-live')}
                className="w-full bg-white text-brand-600 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all relative z-10"
              >
                Empezar ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GoLive = ({ onNavigate }: { onNavigate: (page: string, params?: any) => void }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState('Gaming');
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError(null);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setCameraError("No se pudo acceder a la cámara o micrófono. Por favor, concede los permisos necesarios.");
      }
    };
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleGenerateTitles = async () => {
    if (!title.trim()) {
      alert("Escribe un tema primero para sugerirte títulos.");
      return;
    }
    setIsGenerating(true);
    const titles = await suggestStreamTitles(title);
    setSuggestions(titles);
    
    // Also generate tags
    setIsGeneratingTags(true);
    const suggestedTags = await suggestStreamTags(title);
    setTags(suggestedTags);
    setIsGeneratingTags(false);
    
    setIsGenerating(false);
  };

  const handleStart = async () => {
    if (!user || !title.trim()) return;
    setIsStarting(true);
    try {
      const streamRef = doc(collection(db, 'streams'));
      const streamData: Stream = {
        id: streamRef.id,
        creatorId: user.uid,
        creatorName: user.displayName,
        creatorPhoto: user.photoURL,
        title: title.trim(),
        category: category,
        viewersCount: Math.floor(Math.random() * 50) + 10, // Start with some simulated viewers
        createdAt: serverTimestamp() as Timestamp,
        status: 'live'
      };
      await setDoc(streamRef, streamData);
      // Update user status
      await updateDoc(doc(db, 'users', user.uid), { isLive: true });
      onNavigate('view-stream', { streamId: streamRef.id });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'streams');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100"
      >
        <div className="relative aspect-video bg-gray-900">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-900">
              <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
              <p className="text-white font-bold text-lg">{cameraError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-6 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-bold transition-all"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-8 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="bg-brand-600 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <Video className="w-4 h-4" />
                PREVISUALIZACIÓN
              </div>
              <div className="flex gap-2">
                {['Gaming', 'Charla', 'Música', 'Arte'].map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black transition-all ${category === cat ? 'bg-white text-brand-600' : 'bg-black/20 text-white/60 hover:bg-black/40'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="¿De qué trata tu directo hoy?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-[24px] px-8 py-6 text-white placeholder-white/50 text-2xl font-display font-bold focus:outline-none focus:border-brand-400 transition-all shadow-2xl"
                />
                <button 
                  onClick={handleGenerateTitles}
                  disabled={isGenerating}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 p-3 rounded-2xl text-white transition-all group"
                  title="Sugerir títulos con IA"
                >
                  {isGenerating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Wand2 className="w-6 h-6 group-hover:rotate-12 transition-transform" />}
                </button>
              </div>

              <AnimatePresence>
                {(suggestions.length > 0 || tags.length > 0) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((s, i) => (
                          <button 
                            key={i}
                            onClick={() => setTitle(s)}
                            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-full transition-all"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((t, i) => (
                          <span 
                            key={i}
                            className="bg-brand-500/20 text-brand-400 text-[10px] font-black px-3 py-1 rounded-lg border border-brand-500/30"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-4">
                <button 
                  onClick={handleStart}
                  disabled={isStarting || !title.trim()}
                  className="flex-1 bg-gradient-to-r from-brand-600 to-orange-500 text-white py-5 rounded-[24px] font-bold text-xl shadow-2xl shadow-brand-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {isStarting ? 'Preparando todo...' : 'Empezar Directo'}
                </button>
                <button 
                  onClick={() => onNavigate('home')}
                  className="bg-white/10 backdrop-blur-xl text-white px-10 rounded-[24px] font-bold border-2 border-white/20 hover:bg-white/20 transition-all"
                >
                  Cancelar
                </button>
              </div>
              
              <div className="flex items-center gap-6 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-white/60 text-xs font-bold">
                  <Users className="w-4 h-4" />
                  Público
                </div>
                <div className="flex items-center gap-2 text-white/60 text-xs font-bold">
                  <Star className="w-4 h-4" />
                  Regalos Activos
                </div>
                <div className="flex items-center gap-2 text-white/60 text-xs font-bold">
                  <MessageSquare className="w-4 h-4" />
                  Chat Habilitado
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const StreamView = ({ streamId, onNavigate }: { streamId: string, onNavigate: (page: string) => void }) => {
  const { user, followingIds, toggleFollow, refreshUser } = useAuth();
  const [stream, setStream] = useState<Stream | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const [showHearts, setShowHearts] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const [isGeneratingChat, setIsGeneratingChat] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [streamDuration, setStreamDuration] = useState('00:00');
  const [recentGift, setRecentGift] = useState<any>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const streamRef = doc(db, 'streams', streamId);
    const unsubscribeStream = onSnapshot(streamRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Stream;
        setStream({ id: doc.id, ...data } as Stream);
        if (data.status === 'ended') {
          if (user?.uid === data.creatorId) {
            setSummaryData({
              viewers: data.viewersCount,
              duration: streamDuration,
              coins: Math.floor(data.viewersCount * 1.5) // Simulated coins earned
            });
            setShowSummary(true);
          }
        }
      } else {
        onNavigate('home');
      }
    });

    const messagesQuery = query(
      collection(db, 'streams', streamId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => {
      unsubscribeStream();
      unsubscribeMessages();
    };
  }, [streamId]);

  // Listen for real-time hearts
  useEffect(() => {
    if (stream?.status !== 'live') return;
    const heartsQuery = query(
      collection(db, 'streams', streamId, 'hearts'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(heartsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          setShowHearts(true);
          setTimeout(() => setShowHearts(false), 2000);
        }
      });
    });
    return () => unsubscribe();
  }, [streamId, stream?.status]);

  // Stream duration timer
  useEffect(() => {
    if (stream?.status === 'live' && stream.createdAt) {
      const interval = setInterval(() => {
        const start = stream.createdAt.toDate().getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);
        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');
        setStreamDuration(`${mins}:${secs}`);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [stream?.status, stream?.createdAt]);

  // Camera handling for creator
  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    if (stream && user && stream.creatorId === user.uid && stream.status === 'live') {
      const startCamera = async () => {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } catch (err) {
          console.error("Error accessing camera in stream view:", err);
        }
      };
      startCamera();
    }
    return () => {
      mediaStream?.getTracks().forEach(track => track.stop());
    };
  }, [stream?.status, stream?.creatorId, user?.uid]);

  // Simulated viewer fluctuation
  useEffect(() => {
    if (stream?.status === 'live' && user && stream.creatorId === user.uid) {
      const interval = setInterval(async () => {
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const newCount = Math.max(1, (stream.viewersCount || 0) + change);
        await updateDoc(doc(db, 'streams', streamId), { viewersCount: newCount });
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [stream?.status, stream?.creatorId, user?.uid, stream?.viewersCount]);

  const handleEndStream = async () => {
    if (!stream || !user || stream.creatorId !== user.uid) return;
    if (!confirm("¿Estás seguro de que quieres finalizar el directo?")) return;
    
    setIsEnding(true);
    try {
      await updateDoc(doc(db, 'streams', streamId), { status: 'ended' });
      await updateDoc(doc(db, 'users', user.uid), { isLive: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `streams/${streamId}`);
    } finally {
      setIsEnding(false);
    }
  };

  // Cleanup live status on unmount if creator
  useEffect(() => {
    return () => {
      if (user && stream?.creatorId === user.uid && stream?.status === 'live') {
        // We can't reliably update Firestore on unmount, but we can try
        updateDoc(doc(db, 'users', user.uid), { isLive: false }).catch(() => {});
      }
    };
  }, [user, stream?.creatorId, stream?.status]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !inputText.trim()) return;
    try {
      await addDoc(collection(db, 'streams', streamId, 'messages'), {
        streamId,
        senderId: user.uid,
        senderName: user.displayName,
        text: inputText.trim(),
        type: 'text',
        createdAt: serverTimestamp()
      });
      setInputText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `streams/${streamId}/messages`);
    }
  };

  const sendGift = async (gift: any) => {
    if (!user || user.coins < gift.price) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        coins: user.coins - gift.price
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`));

      await addDoc(collection(db, 'streams', streamId, 'messages'), {
        streamId,
        senderId: user.uid,
        senderName: user.displayName,
        text: `ha enviado un ${gift.name} ${gift.icon}`,
        type: 'gift',
        giftName: gift.name,
        createdAt: serverTimestamp()
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, `streams/${streamId}/messages`));
      
      refreshUser();
      setShowGifts(false);
      setRecentGift(gift);
      setTimeout(() => setRecentGift(null), 3000);
    } catch (error) {
      console.error("Error sending gift", error);
    }
  };

  const handleLike = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'streams', streamId, 'hearts'), {
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending heart", error);
    }
  };

  const handleReport = async () => {
    if (!user || !stream) return;
    try {
      await addDoc(collection(db, 'reports'), {
        streamId,
        streamTitle: stream.title,
        reporterId: user.uid,
        reporterName: user.displayName,
        creatorId: stream.creatorId,
        creatorName: stream.creatorName,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      alert("Reporte enviado con éxito. Nuestro equipo de moderación lo revisará pronto.");
    } catch (error) {
      console.error("Error sending report", error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: stream?.title,
        text: `¡Mira el directo de ${stream?.creatorName} en SuperLive ES!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert("Copiado al portapapeles: " + window.location.href);
    }
  };

  const handleSuggestChat = async () => {
    if (!stream) return;
    setIsGeneratingChat(true);
    const suggestions = await suggestChatMessages(stream.title, stream.creatorName);
    setChatSuggestions(suggestions);
    setIsGeneratingChat(false);
  };

  if (!stream) return null;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row bg-gray-950 overflow-hidden pb-20 lg:pb-0">
      {/* Stream Summary Modal */}
      <AnimatePresence>
        {showSummary && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[48px] p-10 max-w-md w-full text-center shadow-2xl border border-gray-100"
            >
              <div className="w-24 h-24 bg-brand-50 rounded-[32px] flex items-center justify-center mx-auto mb-8">
                <Flame className="w-12 h-12 text-brand-600" />
              </div>
              <h2 className="text-4xl font-display font-black text-gray-900 mb-2 tracking-tight">¡Directo Finalizado!</h2>
              <p className="text-gray-500 font-medium mb-10">Aquí tienes un resumen de tu transmisión.</p>
              
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-2xl font-black text-gray-900">{summaryData?.viewers || 0}</p>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Espectadores</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <p className="text-2xl font-black text-gray-900">{summaryData?.duration || '00:00'}</p>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Duración</p>
                </div>
                <div className="bg-brand-50 p-6 rounded-3xl border border-brand-100 col-span-2">
                  <div className="flex items-center justify-center gap-2">
                    <Star className="w-5 h-5 text-brand-600 fill-brand-600" />
                    <p className="text-2xl font-black text-brand-900">{summaryData?.coins || 0}</p>
                  </div>
                  <p className="text-[10px] text-brand-600 font-black uppercase tracking-widest mt-1">Monedas Ganadas</p>
                </div>
              </div>

              <button 
                onClick={() => onNavigate('home')}
                className="w-full bg-brand-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20"
              >
                Volver al Inicio
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center group/video" onDoubleClick={handleLike}>
        {stream.status === 'ended' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-30">
            <div className="w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center mb-6">
              <Video className="w-12 h-12 text-gray-600" />
            </div>
            <h2 className="text-3xl font-display font-black text-white mb-2 tracking-tight">Directo Finalizado</h2>
            <p className="text-gray-500 font-medium mb-8 text-center px-8">Gracias por acompañarnos en esta transmisión.</p>
            <button 
              onClick={() => onNavigate('home')}
              className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20"
            >
              Volver al Inicio
            </button>
          </div>
        ) : user && stream.creatorId === user.uid ? (
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        ) : (
          <img 
            src={`https://picsum.photos/seed/${stream.id}/1280/720`} 
            className="w-full h-full object-cover opacity-70"
            alt="Stream"
            referrerPolicy="no-referrer"
          />
        )}
        
        <AnimatePresence>
          {showHearts && <HeartBurst onComplete={() => setShowHearts(false)} />}
        </AnimatePresence>

        {/* Overlay Top */}
        <div className="absolute top-6 left-6 right-6 flex items-start justify-between z-20">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-black/30 backdrop-blur-xl p-2 pr-4 rounded-full border border-white/10 shadow-2xl">
              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-brand-500 shadow-lg shadow-brand-500/20">
                <img src={stream.creatorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.creatorId}`} alt={stream.creatorName} referrerPolicy="no-referrer" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold text-sm leading-tight tracking-wide">{stream.creatorName}</p>
                  {stream.status === 'live' && (
                    <span className="flex items-center gap-1 bg-red-600 text-[8px] font-black text-white px-1.5 py-0.5 rounded-md animate-pulse">
                      EN VIVO
                    </span>
                  )}
                </div>
                <p className="text-white/60 text-[10px] font-bold flex items-center gap-1 uppercase tracking-tighter">
                  <Users className="w-3 h-3" />
                  {(stream?.viewersCount || 0).toLocaleString()} ESPECTADORES
                </p>
              </div>
              {user && user.uid !== stream.creatorId && (
                <button 
                  onClick={() => toggleFollow(stream.creatorId)}
                  className={`ml-4 px-5 py-2 rounded-full text-xs font-extrabold transition-all ${followingIds.includes(stream.creatorId) ? 'bg-white/10 text-white border border-white/20' : 'bg-brand-600 text-white shadow-lg shadow-brand-900/40 hover:scale-105 active:scale-95'}`}
                >
                  {followingIds.includes(stream.creatorId) ? 'SIGUIENDO' : 'SEGUIR'}
                </button>
              )}
            </div>

            {stream.status === 'live' && (
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/5 w-fit">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-white/80 tracking-widest uppercase">{streamDuration}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {user && stream.creatorId === user.uid && stream.status === 'live' && (
              <button 
                onClick={handleEndStream}
                disabled={isEnding}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-red-900/40 transition-all flex items-center gap-2"
              >
                {isEnding ? 'Finalizando...' : 'Finalizar Directo'}
              </button>
            )}
            <button 
              onClick={handleReport}
              className="w-12 h-12 bg-black/30 backdrop-blur-xl rounded-full flex items-center justify-center text-white/60 border border-white/10 hover:bg-red-500/20 hover:text-red-500 transition-all shadow-2xl"
              title="Reportar"
            >
              <ShieldAlert className="w-5 h-5" />
            </button>
            <button 
              onClick={handleShare}
              className="w-12 h-12 bg-black/30 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-white/20 transition-all shadow-2xl"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onNavigate('home')}
              className="w-12 h-12 bg-black/30 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-white/20 transition-all shadow-2xl group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        {/* Gift Notification Overlay */}
        <AnimatePresence>
          {recentGift && (
            <motion.div 
              initial={{ opacity: 0, x: -50, scale: 0.5 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-40 flex items-center gap-4 bg-gradient-to-r from-brand-600/90 to-orange-500/90 backdrop-blur-xl p-4 rounded-[32px] border border-white/20 shadow-2xl"
            >
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-4xl shadow-lg animate-bounce">
                {recentGift.icon}
              </div>
              <div>
                <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">¡Nuevo Regalo!</p>
                <p className="text-white font-black text-xl tracking-tight">{recentGift.name}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Like Button (Mobile only) */}
        <button 
          onClick={handleLike}
          className="absolute right-6 bottom-32 w-14 h-14 bg-brand-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-brand-900/40 lg:hidden z-30 active:scale-90 transition-transform"
        >
          <Heart className="w-7 h-7 fill-white" />
        </button>

        {/* Overlay Bottom */}
        <div className="absolute bottom-8 left-8 right-8 z-20">
          <div className="max-w-2xl">
            <div className="flex gap-2 mb-4">
              <span className="bg-brand-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-brand-900/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                EN VIVO
              </span>
              {user && user.uid === stream.creatorId && (
                <div className="flex gap-2">
                  <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">
                    HD 1080P
                  </span>
                  <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">
                    60 FPS
                  </span>
                </div>
              )}
            </div>
            <h2 className="text-white text-3xl font-display font-bold mb-2 drop-shadow-lg leading-tight">{stream.title}</h2>
            
            {user && user.uid === stream.creatorId && (
              <div className="flex gap-4 mt-4">
                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                  <p className="text-[8px] text-white/60 font-black uppercase tracking-widest">Nuevos Seguidores</p>
                  <p className="text-white font-black text-lg">+{Math.floor(stream.viewersCount / 10)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                  <p className="text-[8px] text-white/60 font-black uppercase tracking-widest">Monedas Hoy</p>
                  <p className="text-white font-black text-lg">{(stream.viewersCount * 2).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
      </div>

      {/* Chat Area */}
      <div className="w-full lg:w-[400px] bg-white flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.1)] z-30">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0">
          <h3 className="font-display font-bold text-gray-900 flex items-center gap-3 text-lg">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-brand-600" />
            </div>
            Chat en Vivo
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-gray-50/30 no-scrollbar">
          {messages.map((msg) => (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              key={msg.id} 
              className={`flex flex-col gap-1.5 ${msg.type === 'gift' ? 'bg-gradient-to-r from-brand-50 to-orange-50 p-4 rounded-2xl border border-brand-100 shadow-sm' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${msg.senderId === stream.creatorId ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {msg.senderId === stream.creatorId ? 'STREAMER' : 'FAN'}
                </span>
                <span className="text-xs font-black text-gray-900">{msg.senderName}</span>
                <span className="text-[10px] text-gray-400 font-medium ml-auto">
                  {msg.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...' }
                </span>
              </div>
              <p className={`text-sm leading-relaxed ${msg.type === 'gift' ? 'text-brand-900 font-bold italic' : 'text-gray-700 font-medium'}`}>
                {msg.text}
              </p>
            </motion.div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-6 border-t border-gray-100 bg-white">
          <AnimatePresence>
            {chatSuggestions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex flex-wrap gap-2 mb-4"
              >
                {chatSuggestions.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setInputText(s);
                      setChatSuggestions([]);
                    }}
                    className="bg-brand-50 hover:bg-brand-100 text-brand-600 text-[10px] font-bold px-3 py-1.5 rounded-full transition-all border border-brand-100"
                  >
                    {s}
                  </button>
                ))}
                <button 
                  onClick={() => setChatSuggestions([])}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <form onSubmit={sendMessage} className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setShowGifts(!showGifts)}
              className="w-12 h-12 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center text-brand-600 hover:bg-brand-100 transition-all active:scale-90 shadow-sm"
            >
              <GiftIcon className="w-6 h-6" />
            </button>
            <div className="flex-1 relative">
              <input 
                type="text"
                placeholder="Escribe un mensaje..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-gray-100 border-none rounded-2xl px-5 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all pr-12"
              />
              <button 
                type="button"
                onClick={handleSuggestChat}
                disabled={isGeneratingChat}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500 hover:text-brand-600 p-1 transition-all"
                title="Sugerir mensaje con IA"
              >
                {isGeneratingChat ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </button>
            </div>
            <button 
              type="submit"
              disabled={!inputText.trim()}
              className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 active:scale-90 disabled:opacity-50 disabled:scale-100"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>

        <AnimatePresence>
          {showGifts && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-8 rounded-t-[48px] shadow-[0_-20px_60px_rgba(0,0,0,0.15)] z-40"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-2xl font-display font-bold text-gray-900">Enviar Regalo</h4>
                  <p className="text-sm text-gray-500 font-medium">Apoya a tu creador favorito</p>
                </div>
                <button onClick={() => setShowGifts(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {GIFTS.map((gift) => (
                  <button 
                    key={gift.id}
                    onClick={() => sendGift(gift)}
                    disabled={user && user.coins < gift.price}
                    className="flex flex-col items-center p-5 rounded-3xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-all group disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-gray-100"
                  >
                    <span className="text-4xl mb-3 group-hover:scale-125 transition-transform duration-300">{gift.icon}</span>
                    <span className="text-xs font-bold text-gray-800 mb-1">{gift.name}</span>
                    <span className="text-[10px] text-brand-600 font-black tracking-widest uppercase">{gift.price} 🪙</span>
                  </button>
                ))}
              </div>
              {user && (
                <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-500">Tu saldo:</p>
                  <div className="flex items-center gap-2 bg-brand-50 px-4 py-2 rounded-full border border-brand-100">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-brand-700 font-black">{(user?.coins || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Leaderboard = () => {
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('coins', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTopUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-[40px] shadow-2xl shadow-brand-500/5 border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 to-orange-500 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <Star className="w-16 h-16 text-white/20 absolute -top-4 -right-4 rotate-12" />
          <Star className="w-12 h-12 text-white/20 absolute -bottom-2 -left-2 -rotate-12" />
          
          <h2 className="text-4xl font-display font-extrabold text-white mb-2 relative z-10 tracking-tight">Salón de la Fama</h2>
          <p className="text-white/80 font-medium relative z-10">Los usuarios más influyentes de la comunidad</p>
        </div>
        
        <div className="p-6 sm:p-10">
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-24 bg-gray-50 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {topUsers.map((u, index) => (
                <motion.div 
                  key={u.uid} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-6 p-5 rounded-[32px] transition-all hover:bg-gray-50 border-2 ${index === 0 ? 'bg-brand-50/30 border-brand-100' : 'bg-white border-transparent'}`}
                >
                  <div className={`w-12 h-12 flex items-center justify-center font-black rounded-2xl text-xl shadow-sm ${
                    index === 0 ? 'bg-yellow-400 text-white shadow-yellow-200' : 
                    index === 1 ? 'bg-gray-300 text-white shadow-gray-100' : 
                    index === 2 ? 'bg-orange-300 text-white shadow-orange-100' : 
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-md">
                    <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} alt={u.displayName} referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-bold text-gray-900 text-lg leading-tight">{u.displayName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-bold text-gray-400 flex items-center gap-1 uppercase tracking-wider">
                        <Users className="w-3 h-3" />
                        {(u?.followersCount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 mb-0.5">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <p className="font-black text-brand-600 text-xl tracking-tight">{(u?.coins || 0).toLocaleString()}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Monedas</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Profile = () => {
  const { user, logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [myStreams, setMyStreams] = useState<Stream[]>([]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'streams'),
        where('creatorId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMyStreams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stream)));
      });
      return () => unsubscribe();
    }
  }, [user]);

  if (!user) return null;

  const handleGenerateBio = async () => {
    setIsGeneratingBio(true);
    const bio = await suggestBio(editName, "streaming, videojuegos, comunidad");
    setEditBio(bio);
    setIsGeneratingBio(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editName,
        bio: editBio
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`));
      await refreshUser();
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[48px] shadow-2xl shadow-brand-500/5 overflow-hidden border border-gray-100"
      >
        <div className="h-32 bg-gradient-to-r from-brand-600 to-orange-500" />
        <div className="px-8 pb-10 -mt-16">
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-white shadow-2xl bg-white relative">
                <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt={user.displayName} referrerPolicy="no-referrer" />
                {user.isLive && (
                  <div className="absolute inset-0 bg-brand-600/20 flex items-center justify-center">
                    <div className="bg-brand-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse">
                      EN VIVO
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-brand-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl border-4 border-white shadow-lg">
                LVL {Math.floor((user.coins || 0) / 1000) + 1}
              </div>
            </div>
            
            {isEditing ? (
              <div className="space-y-4 mb-10">
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Tu nombre artístico"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-center font-display font-bold text-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
                <div className="relative">
                  <textarea 
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Cuéntanos algo sobre ti..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-center text-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 min-h-[120px] transition-all"
                  />
                  <button 
                    onClick={handleGenerateBio}
                    disabled={isGeneratingBio}
                    className="absolute right-4 bottom-4 bg-brand-50 text-brand-600 p-2 rounded-xl hover:bg-brand-100 transition-all group"
                    title="Sugerir biografía con IA"
                  >
                    {isGeneratingBio ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                  </button>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 bg-brand-600 text-white py-4 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-4xl font-display font-extrabold text-gray-900 mb-2 tracking-tight">{user.displayName}</h2>
                <p className="text-gray-500 font-medium mb-8 max-w-md mx-auto leading-relaxed">{user.bio || '¡Hola! Todavía no he escrito mi biografía.'}</p>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="mb-10 bg-brand-50 text-brand-600 px-6 py-2 rounded-full font-bold hover:bg-brand-100 transition-all border border-brand-100"
                >
                  Editar Perfil
                </button>
              </>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="bg-brand-50/50 p-8 rounded-[32px] border border-brand-100 text-center group hover:bg-brand-50 transition-colors">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                <Star className="w-7 h-7 text-brand-500 fill-brand-500" />
              </div>
              <p className="text-3xl font-black text-brand-900 tracking-tight">{(user?.coins || 0).toLocaleString()}</p>
              <p className="text-[10px] text-brand-600 font-black uppercase tracking-widest mt-1">Monedas</p>
            </div>
            <div className="bg-orange-50/50 p-8 rounded-[32px] border border-orange-100 text-center group hover:bg-orange-50 transition-colors">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-orange-500" />
              </div>
              <p className="text-3xl font-black text-orange-900 tracking-tight">{(user?.followersCount || 0).toLocaleString()}</p>
              <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest mt-1">Seguidores</p>
            </div>
          </div>

          {/* My Streams Section */}
          <div className="mb-10">
            <h3 className="text-xl font-display font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Video className="w-5 h-5 text-brand-600" />
              Mis Últimos Directos
            </h3>
            {myStreams.length === 0 ? (
              <div className="bg-gray-50 rounded-3xl p-8 text-center border border-dashed border-gray-200">
                <p className="text-gray-400 font-medium">Aún no has realizado ningún directo.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myStreams.map(stream => (
                  <div key={stream.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-20 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={`https://picsum.photos/seed/${stream.id}/200/120`} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{stream.title}</p>
                      <p className="text-xs text-gray-400 font-medium">{stream.createdAt?.toDate()?.toLocaleDateString() || 'Fecha desconocida'}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${stream.status === 'live' ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                      {stream.status === 'live' ? 'EN VIVO' : 'FINALIZADO'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 py-5 rounded-2xl font-bold transition-all border border-transparent hover:border-red-100"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

const FirebaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;
    let unsubscribeFollows: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Real-time listener for user profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUser = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUser(doc.data() as UserProfile);
          } else {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Usuario',
              photoURL: firebaseUser.photoURL || undefined,
              coins: 1000,
              followersCount: 0,
              followingCount: 0,
              isLive: false,
              role: 'user'
            };
            setDoc(userRef, newUser).catch(e => handleFirestoreError(e, OperationType.CREATE, `users/${firebaseUser.uid}`));
            setUser(newUser);
          }
        });

        // Real-time listener for following list
        const followsQuery = query(collection(db, 'follows'), where('followerId', '==', firebaseUser.uid));
        unsubscribeFollows = onSnapshot(followsQuery, (snapshot) => {
          setFollowingIds(snapshot.docs.map(doc => doc.data().followingId));
        });
      } else {
        if (unsubscribeUser) unsubscribeUser();
        if (unsubscribeFollows) unsubscribeFollows();
        setUser(null);
        setFollowingIds([]);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeFollows) unsubscribeFollows();
    };
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid)).catch(e => handleFirestoreError(e, OperationType.GET, `users/${auth.currentUser?.uid}`));
      if (userDoc && userDoc.exists()) {
        setUser(userDoc.data() as UserProfile);
      }
    }
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!user || user.uid === targetUserId) return;
    
    const followId = `${user.uid}_${targetUserId}`;
    const followRef = doc(db, 'follows', followId);
    const isFollowing = followingIds.includes(targetUserId);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        // Decrement counts
        await updateDoc(doc(db, 'users', user.uid), { followingCount: increment(-1) });
        await updateDoc(doc(db, 'users', targetUserId), { followersCount: increment(-1) });
      } else {
        await setDoc(followRef, {
          followerId: user.uid,
          followingId: targetUserId,
          createdAt: serverTimestamp()
        });
        // Increment counts
        await updateDoc(doc(db, 'users', user.uid), { followingCount: increment(1) });
        await updateDoc(doc(db, 'users', targetUserId), { followersCount: increment(1) });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `follows/${followId}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, followingIds, signIn, logout, refreshUser, toggleFollow }}>
      {children}
    </AuthContext.Provider>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState;
  props: ErrorBoundaryProps;
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6">
            <X className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold text-red-900 mb-2">¡Vaya! Algo salió mal.</h2>
          <p className="text-red-700 mb-8 max-w-md">
            Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-red-700 transition-colors"
          >
            Recargar Página
          </button>
          {this.state.errorInfo && (
            <pre className="mt-8 p-4 bg-red-100/50 rounded-xl text-xs text-red-800 max-w-lg overflow-auto">
              {this.state.errorInfo}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [pageParams, setPageParams] = useState<any>({});

  const navigate = (page: string, params: any = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    window.scrollTo(0, 0);
  };

  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
          <AuthWrapper onNavigate={navigate}>
            <Header onNavigate={navigate} />
            <main className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {currentPage === 'home' && (
                  <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Home onNavigate={navigate} />
                  </motion.div>
                )}
                {currentPage === 'go-live' && (
                  <motion.div key="go-live" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <GoLive onNavigate={navigate} />
                  </motion.div>
                )}
                {currentPage === 'view-stream' && (
                  <motion.div key="view-stream" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <StreamView streamId={pageParams.streamId} onNavigate={navigate} />
                  </motion.div>
                )}
                {currentPage === 'profile' && (
                  <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                    <Profile />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
            <BottomNav activePage={currentPage} onNavigate={navigate} />
          </AuthWrapper>
        </div>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}

const AuthWrapper = ({ children, onNavigate }: { children: React.ReactNode, onNavigate: (page: string) => void }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-16 h-16 border-4 border-pink-100 border-t-pink-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <>{children}</>;
};

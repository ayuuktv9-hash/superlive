import React, { useState, useEffect, createContext, useContext, Component } from 'react';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, limit, Timestamp, serverTimestamp, addDoc, updateDoc } from 'firebase/firestore';
import { UserProfile, Stream } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, LogOut, Video, User, Home as HomeIcon, MessageSquare, Gift as GiftIcon, X, Send, Heart, Star, Users, Flame } from 'lucide-react';

// --- Context ---
interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within a AuthProvider');
  return context;
};

// --- Components ---

const Header = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('home')}>
        <div className="w-10 h-10 bg-gradient-to-tr from-pink-500 to-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-pink-200">
          <Flame className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-orange-500">
          SuperLive ES
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-semibold text-gray-700">{user.coins}</span>
            </div>
            <button 
              onClick={() => onNavigate('profile')}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-100 hover:border-pink-300 transition-colors"
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-orange-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-pink-100 p-8 text-center"
      >
        <div className="w-20 h-20 bg-gradient-to-tr from-pink-500 to-orange-400 rounded-3xl flex items-center justify-center shadow-xl shadow-pink-200 mx-auto mb-6">
          <Flame className="text-white w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido a SuperLive</h2>
        <p className="text-gray-500 mb-8">Conéctate, comparte y disfruta de los mejores directos en español.</p>
        
        <button 
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 hover:border-pink-200 py-4 px-6 rounded-2xl font-semibold text-gray-700 transition-all hover:shadow-lg active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Continuar con Google
        </button>
      </motion.div>
    </div>
  );
};

const Home = ({ onNavigate }: { onNavigate: (page: string, params?: any) => void }) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Flame className="text-orange-500 w-6 h-6" />
          Directos Populares
        </h2>
        <button 
          onClick={() => onNavigate('go-live')}
          className="bg-gradient-to-r from-pink-600 to-orange-500 text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-pink-200 hover:scale-105 transition-transform active:scale-95 flex items-center gap-2"
        >
          <Video className="w-5 h-5" />
          Transmitir
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-[3/4] bg-gray-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : streams.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600">No hay directos ahora mismo</h3>
          <p className="text-gray-400">¡Sé el primero en empezar uno!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {streams.map(stream => (
            <motion.div 
              key={stream.id}
              whileHover={{ y: -5 }}
              onClick={() => onNavigate('view-stream', { streamId: stream.id })}
              className="group relative aspect-[3/4] bg-gray-900 rounded-3xl overflow-hidden cursor-pointer shadow-xl"
            >
              <img 
                src={`https://picsum.photos/seed/${stream.id}/400/600`} 
                className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500"
                alt={stream.title}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="bg-pink-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    En Vivo
                  </span>
                  <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {stream.viewersCount}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-2 line-clamp-1">{stream.title}</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                      <img src={stream.creatorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.creatorId}`} alt={stream.creatorName} referrerPolicy="no-referrer" />
                    </div>
                    <span className="text-white/80 text-sm font-medium">{stream.creatorName}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const GoLive = ({ onNavigate }: { onNavigate: (page: string, params?: any) => void }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

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
        viewersCount: 0,
        createdAt: serverTimestamp() as Timestamp,
        status: 'live'
      };
      await setDoc(streamRef, streamData);
      onNavigate('view-stream', { streamId: streamRef.id });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'streams');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100">
        <div className="relative aspect-video bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-8 flex flex-col justify-end">
            <input 
              type="text"
              placeholder="Escribe un título para tu directo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-2xl px-6 py-4 text-white placeholder-white/60 text-xl font-bold focus:outline-none focus:border-white/40 transition-all mb-4"
            />
            <div className="flex gap-4">
              <button 
                onClick={handleStart}
                disabled={isStarting || !title.trim()}
                className="flex-1 bg-gradient-to-r from-pink-600 to-orange-500 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-pink-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
              >
                {isStarting ? 'Iniciando...' : 'Empezar Directo'}
              </button>
              <button 
                onClick={() => onNavigate('home')}
                className="bg-white/10 backdrop-blur-xl text-white px-8 rounded-2xl font-bold border-2 border-white/20 hover:bg-white/20 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StreamView = ({ streamId, onNavigate }: { streamId: string, onNavigate: (page: string) => void }) => {
  const { user, refreshUser } = useAuth();
  const [stream, setStream] = useState<Stream | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const streamRef = doc(db, 'streams', streamId);
    const unsubscribeStream = onSnapshot(streamRef, (doc) => {
      if (doc.exists()) {
        setStream({ id: doc.id, ...doc.data() } as Stream);
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
      // Deduct coins from sender
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        coins: user.coins - gift.price
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`));

      // Add gift message
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
    } catch (error) {
      console.error("Error sending gift", error);
    }
  };

  if (!stream) return null;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row bg-gray-950 overflow-hidden">
      {/* Video Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <img 
          src={`https://picsum.photos/seed/${stream.id}/1280/720`} 
          className="w-full h-full object-cover opacity-60"
          alt="Stream"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 flex items-center gap-3 bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-500">
            <img src={stream.creatorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.creatorId}`} alt={stream.creatorName} referrerPolicy="no-referrer" />
          </div>
          <div className="pr-4">
            <p className="text-white font-bold text-sm leading-tight">{stream.creatorName}</p>
            <p className="text-white/60 text-[10px] flex items-center gap-1">
              <Users className="w-3 h-3" />
              {stream.viewersCount} espectadores
            </p>
          </div>
        </div>
        <button 
          onClick={() => onNavigate('home')}
          className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-white/10 transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="absolute bottom-8 left-8 right-8">
          <h2 className="text-white text-2xl font-bold mb-2">{stream.title}</h2>
          <div className="flex gap-2">
            <span className="bg-pink-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">En Vivo</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="w-full lg:w-96 bg-white flex flex-col shadow-2xl z-10">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-pink-500" />
            Chat en Vivo
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.type === 'gift' ? 'bg-pink-50 p-3 rounded-2xl border border-pink-100' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-pink-600">{msg.senderName}</span>
                <span className="text-[10px] text-gray-400">
                  {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className={`text-sm ${msg.type === 'gift' ? 'text-pink-900 font-medium italic' : 'text-gray-700'}`}>
                {msg.text}
              </p>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <form onSubmit={sendMessage} className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setShowGifts(!showGifts)}
              className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-pink-500 hover:bg-pink-50 transition-colors"
            >
              <GiftIcon className="w-6 h-6" />
            </button>
            <input 
              type="text"
              placeholder="Di algo..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20"
            />
            <button 
              type="submit"
              className="w-10 h-10 bg-pink-600 text-white rounded-xl flex items-center justify-center hover:bg-pink-700 transition-colors shadow-lg shadow-pink-200"
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
              className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 rounded-t-[32px] shadow-2xl z-20"
            >
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-gray-900">Enviar Regalo</h4>
                <button onClick={() => setShowGifts(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: 'Rosa', icon: '🌹', price: 10 },
                  { name: 'Corazón', icon: '❤️', price: 50 },
                  { name: 'Diamante', icon: '💎', price: 100 },
                  { name: 'Corona', icon: '👑', price: 500 },
                  { name: 'Cohete', icon: '🚀', price: 1000 },
                  { name: 'Unicornio', icon: '🦄', price: 2000 },
                ].map((gift) => (
                  <button 
                    key={gift.name}
                    onClick={() => sendGift(gift)}
                    className="flex flex-col items-center p-4 rounded-2xl border border-gray-100 hover:border-pink-200 hover:bg-pink-50 transition-all group"
                  >
                    <span className="text-3xl mb-2 group-hover:scale-125 transition-transform">{gift.icon}</span>
                    <span className="text-xs font-bold text-gray-700">{gift.name}</span>
                    <span className="text-[10px] text-pink-600 font-bold">{gift.price} 🪙</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Profile = () => {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100 p-8 text-center">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-pink-100 mx-auto mb-6">
          <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt={user.displayName} referrerPolicy="no-referrer" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{user.displayName}</h2>
        <p className="text-gray-500 mb-8">{user.bio || 'Sin biografía'}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-pink-50 p-6 rounded-3xl border border-pink-100">
            <Star className="w-8 h-8 text-pink-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-pink-900">{user.coins}</p>
            <p className="text-xs text-pink-600 font-bold uppercase tracking-wider">Monedas</p>
          </div>
          <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
            <Users className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-900">0</p>
            <p className="text-xs text-orange-600 font-bold uppercase tracking-wider">Seguidores</p>
          </div>
        </div>

        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 py-4 rounded-2xl font-bold transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

// --- Main App ---

const FirebaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid)).catch(e => handleFirestoreError(e, OperationType.GET, `users/${firebaseUser.uid}`));
        if (userDoc && userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        } else if (userDoc) {
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Usuario',
            photoURL: firebaseUser.photoURL || undefined,
            coins: 1000, // Initial coins
            isLive: false,
            role: 'user'
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser).catch(e => handleFirestoreError(e, OperationType.CREATE, `users/${firebaseUser.uid}`));
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout, refreshUser }}>
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
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
          <AuthWrapper onNavigate={navigate}>
            <Header onNavigate={navigate} />
            <main className="pb-20 lg:pb-0">
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

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
              <button onClick={() => navigate('home')} className={`flex flex-col items-center gap-1 ${currentPage === 'home' ? 'text-pink-600' : 'text-gray-400'}`}>
                <HomeIcon className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase">Inicio</span>
              </button>
              <button 
                onClick={() => navigate('go-live')} 
                className="w-14 h-14 bg-gradient-to-tr from-pink-600 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-200 -mt-8 border-4 border-white active:scale-90 transition-transform"
              >
                <Video className="w-7 h-7" />
              </button>
              <button onClick={() => navigate('profile')} className={`flex flex-col items-center gap-1 ${currentPage === 'profile' ? 'text-pink-600' : 'text-gray-400'}`}>
                <User className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase">Perfil</span>
              </button>
            </nav>
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

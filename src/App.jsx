import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Heart, X, MessageCircle, User, PlusCircle, Home, MapPin, Tag, Star, ArrowLeft, Send, CheckCircle, LogIn, Camera, Upload, LogOut, Mail, Database } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';

// --- FIREBASE SETUP ---
// NOTA PARA DEPLOY: Reemplaza las siguientes líneas con tu config real de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDHdT48aDdi_zTj1edoDjGLJAfowx0WT7c",
  authDomain: "solopermutas-1a33f.firebaseapp.com",
  projectId: "solopermutas-1a33f",
  storageBucket: "solopermutas-1a33f.firebasestorage.app",
  messagingSenderId: "260526801148",
  appId: "1:260526801148:web:4741604c2f5f89ba3e5779",
  measurementId: "G-GFX6BWM3MN";}
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- COMPONENTES AUXILIARES ---
const Badge = ({ children, className }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${className}`}>
    {children}
  </span>
);

const Spinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
);

// --- MOCK DATA GENERATOR ---
const MOCK_DATA = [
  {
    userName: "Sofía Martínez",
    title: "iPhone 13 Pro - Impecable",
    category: "Tecnología",
    image: "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&q=80&w=500",
    description: "Battery health 92%. Siempre con funda. Busco permutar por laptop gamer.",
    lookingFor: "Laptop Gamer o MacBook Air M1",
    location: "Palermo, CABA"
  },
  {
    userName: "Lucas Rodriguez",
    title: "Bici Fixie Personalizada",
    category: "Vehículos",
    image: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&q=80&w=500",
    description: "Cuadro de aluminio, muy liviana. Ideal para la ciudad.",
    lookingFor: "PlayStation 5 o Apple Watch",
    location: "Córdoba Capital"
  },
  {
    userName: "Valentina López",
    title: "Depto 2 Ambientes Luminoso",
    category: "Inmuebles",
    subCategory: "Departamento",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=500",
    description: "Dueño directo. 45m2 con balcón. Expensas bajas.",
    lookingFor: "Terreno en zona sur o Camioneta",
    location: "Belgrano, CABA"
  },
  {
    userName: "Martín Gomez",
    title: "Sillón Chesterfield Cuero",
    category: "Muebles",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=500",
    description: "Cuero vacuno legítimo. Tiene un detalle mínimo en un brazo.",
    lookingFor: "Smart TV 55' 4K",
    location: "Rosario, Santa Fe"
  },
  {
    userName: "Camila Fernández",
    title: "Cámara Sony Alpha a6000",
    category: "Tecnología",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=500",
    description: "Incluye lente kit 16-50mm y bolso de transporte.",
    lookingFor: "Dron DJI Mini o iPad Pro",
    location: "Mendoza"
  }
];

// --- UTILIDADES ---
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- COMPONENTES DE VISTAS ---

const AddView = ({ onPublish }) => {
  const [category, setCategory] = useState('Tecnología');
  const [subCategory, setSubCategory] = useState('Departamento');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [image, setImage] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImage(file);
      setImage(compressedBase64);
    } catch (error) {
      console.error("Error al procesar imagen", error);
      alert("Hubo un error al procesar la imagen. Intenta con otra.");
    }
  };

  const handleSubmit = async () => {
    if (!title || !lookingFor) return;
    setIsSubmitting(true);
    
    let finalImage = image;
    if (!finalImage) {
       if (category === 'Inmuebles') finalImage = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=500';
       else if (category === 'Vehículos') finalImage = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=500';
       else finalImage = 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=500';
    }

    await onPublish({
      title,
      description: desc,
      category,
      subCategory: category === 'Inmuebles' ? subCategory : null,
      lookingFor,
      image: finalImage,
      location
    });
    setIsSubmitting(false);
  };

  return (
   <div className="flex flex-col h-full bg-white pb-20 overflow-y-auto">
     <div className="p-4 border-b">
       <h1 className="text-xl font-bold text-gray-800">Publicar Permuta</h1>
     </div>
     
     <div className="p-6 flex flex-col gap-6">
       <div className="flex justify-center">
         <div 
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group
              ${image ? 'border-orange-500 bg-gray-900' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
            `}
         >
            {image ? (
              <>
                <img src={image} alt="Preview" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white font-medium flex items-center gap-2"><Camera size={20}/> Cambiar foto</span>
                </div>
              </>
            ) : (
              <div className="text-gray-400 flex flex-col items-center">
                <Camera size={48} className="mb-2 opacity-50" />
                <span className="font-medium text-sm">Toca para subir foto</span>
                <span className="text-xs mt-1 text-gray-300">Cámara o Galería</span>
              </div>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
         </div>
       </div>

       <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Título (¿Qué ofreces?)</label>
            <input 
              type="text" 
              placeholder="Ej: Play Station 4, Depto 2 Amb..."
              className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500 outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Categoría</label>
            <select 
              className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500 outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Tecnología</option>
              <option>Indumentaria</option>
              <option>Vehículos</option>
              <option>Inmuebles</option>
              <option>Muebles</option>
            </select>
          </div>

          {category === 'Inmuebles' && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h3 className="flex items-center gap-2 font-bold text-blue-800 mb-3">
                <Home size={16} /> Detalles del Inmueble
              </h3>
              <select 
                 value={subCategory}
                 onChange={(e) => setSubCategory(e.target.value)}
                 className="w-full p-2 rounded border-none text-sm mb-3"
               >
                <option>Departamento</option>
                <option>Casa</option>
                <option>Terreno</option>
                <option>PH</option>
              </select>
              <input 
                 placeholder="Barrio / Ciudad" 
                 value={location}
                 onChange={(e) => setLocation(e.target.value)}
                 className="w-full p-2 rounded border-none text-sm" 
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">¿Qué buscas a cambio?</label>
            <textarea 
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              placeholder="Describe qué te gustaría recibir..."
              className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500 outline-none h-24 resize-none"
            ></textarea>
          </div>

          <button 
             onClick={handleSubmit}
             disabled={isSubmitting}
             className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Publicando...' : 'Publicar Permuta'}
          </button>
       </div>
     </div>
   </div>
 );
};

const SwipeView = ({ feedItems, currentIndex, handleSwipe, lastDirection, showMatchPopup, setShowMatchPopup, currentMatch, userProfile, setActiveTab, onGoToPublish }) => {
  if (feedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50">
         <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
           <Home size={40} className="text-gray-400" />
         </div>
         <h3 className="text-xl font-bold text-gray-700 mb-2">No hay publicaciones nuevas</h3>
         <p className="text-gray-500 mb-6">¡Sé el primero en publicar algo para permutar!</p>
         <button 
           onClick={onGoToPublish}
           className="bg-orange-600 text-white px-6 py-3 rounded-full font-bold shadow-lg"
         >
           Publicar un Ítem
         </button>
      </div>
    );
  }

  const item = feedItems[currentIndex];
  
  return (
    <div className="flex flex-col h-full relative">
      <div className="p-4 flex justify-between items-center bg-white shadow-sm z-10">
        <h1 className="text-xl font-bold text-orange-600 italic">SoloPermutas</h1>
        <div className="flex items-center gap-1 text-gray-500 text-xs">
           Hola, {userProfile?.name}
        </div>
      </div>

      <div className="flex-1 p-4 flex justify-center items-center overflow-hidden relative bg-gray-50">
         {/* Card */}
         <div 
           className={`w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-full max-h-[600px] transition-transform duration-300 z-10 ${lastDirection === 'left' ? '-translate-x-full rotate-[-10deg] opacity-0' : ''} ${lastDirection === 'right' ? 'translate-x-full rotate-[10deg] opacity-0' : ''}`}
         >
           <div className="relative h-3/5 bg-gray-200">
             <img src={item.image || 'https://via.placeholder.com/400'} alt={item.title} className="w-full h-full object-cover" />
             <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
               {item.category}
             </div>
             {item.category === 'Inmuebles' && (
               <div className="absolute bottom-4 left-4 bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                 <Home size={14} /> {item.subCategory}
               </div>
             )}
           </div>

           <div className="p-5 flex flex-col justify-between h-2/5">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-2xl font-bold text-gray-800 leading-tight">{item.title}</h2>
                </div>
                {item.location && (
                  <p className="text-gray-500 flex items-center gap-1 mb-2 text-sm">
                    <MapPin size={14} /> {item.location}
                  </p>
                )}
                <p className="text-gray-600 text-sm line-clamp-2 mb-3">{item.description}</p>
                
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                  <p className="text-xs font-bold text-orange-600 uppercase mb-1">Busca recibir:</p>
                  <p className="text-sm text-gray-800 font-medium">{item.lookingFor}</p>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2">Publicado por {item.userName}</div>
           </div>
         </div>

         {showMatchPopup && (
           <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 animate-in fade-in zoom-in duration-300">
             <h2 className="text-5xl font-bold text-green-400 italic mb-4 transform -rotate-12">¡ES UN MATCH!</h2>
             <p className="text-white mb-2 text-center px-4">A {currentMatch?.user} le interesa lo que tienes.</p>
             <p className="text-gray-300 mb-8 text-sm">¡Y a ti te interesó su {currentMatch?.item}!</p>
             <button 
              onClick={() => { setShowMatchPopup(false); setActiveTab('matches'); }}
              className="bg-orange-500 text-white px-8 py-3 rounded-full font-bold text-lg mb-4 hover:bg-orange-600 w-64"
             >
               Ir al Chat
             </button>
             <button 
              onClick={() => setShowMatchPopup(false)}
              className="text-white font-medium hover:underline"
             >
               Seguir deslizando
             </button>
           </div>
         )}
      </div>

      <div className="p-6 bg-white flex justify-center items-center gap-8 pb-24">
        <button 
          onClick={() => handleSwipe('left')}
          className="w-16 h-16 rounded-full bg-white border-2 border-red-500 text-red-500 flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors"
        >
          <X size={32} />
        </button>
        
        <button 
          onClick={() => handleSwipe('right')}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          <Heart size={32} fill="white" />
        </button>
      </div>
    </div>
  );
};

const MatchesView = ({ matches }) => (
  <div className="flex flex-col h-full bg-white pb-20">
    <div className="p-4 border-b">
      <h1 className="text-xl font-bold text-gray-800">Mensajes y Matches</h1>
    </div>
    
    {matches.length === 0 ? (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
        <MessageCircle size={48} className="mb-4 opacity-50" />
        <p>Aún no tienes matches.</p>
        <p className="text-sm">¡Sigue deslizando!</p>
      </div>
    ) : (
      <div className="flex-1 overflow-y-auto">
         {matches.map(match => (
           <div key={match.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
             <img src={match.image} alt={match.user} className="w-12 h-12 rounded-full object-cover" />
             <div className="flex-1">
               <div className="flex justify-between items-center mb-1">
                 <h3 className="font-bold text-gray-800">{match.user}</h3>
                 <span className="text-xs text-green-600 font-bold">MATCH</span>
               </div>
               <p className="text-xs text-gray-500">Intercambio: {match.myItemType} ↔ {match.item}</p>
             </div>
           </div>
         ))}
      </div>
    )}
  </div>
);

const PremiumView = ({ interactions, user, isPremium, setIsPremium }) => {
  const likesReceived = useMemo(() => 
    interactions.filter(i => i.toUserId === user?.uid && i.type === 'like'), 
  [interactions, user]);
  
  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      <div className="p-4 bg-white shadow-sm z-10">
         <h1 className="text-xl font-bold text-gray-800">Le gustaste a...</h1>
         <p className="text-sm text-gray-500">{likesReceived.length} personas interesadas</p>
      </div>

      <div className="p-4 grid grid-cols-2 gap-4 overflow-y-auto">
        {likesReceived.map(like => (
          <div key={like.id} className="relative bg-white rounded-xl shadow-sm overflow-hidden group">
            <div className={`aspect-square relative ${!isPremium ? 'blur-md' : ''}`}>
              <img src={like.fromUserImage || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
            </div>
            {!isPremium && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                 <Heart className="text-white drop-shadow-lg" size={40} fill="white" />
               </div>
            )}
            <div className="p-2">
              <h3 className={`font-bold text-sm ${!isPremium ? 'bg-gray-200 text-transparent rounded w-2/3' : 'text-gray-800'}`}>
                {like.fromUserName}
              </h3>
              <p className={`text-xs mt-1 text-orange-600 truncate`}>
                Quiere: {like.toItemTitle}
              </p>
            </div>
          </div>
        ))}
        {likesReceived.length === 0 && (
          <div className="col-span-2 text-center text-gray-400 mt-10">
            Nadie te ha dado like aún... 😢 <br/> ¡Publica cosas más interesantes!
          </div>
        )}
      </div>

      {!isPremium && likesReceived.length > 0 && (
        <div className="fixed bottom-24 left-4 right-4 bg-gray-900 text-white p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center">
           <Star className="text-yellow-400 mb-2" size={32} fill="currentColor" />
           <h2 className="text-lg font-bold mb-1">¡Pasate a Gold!</h2>
           <button 
             onClick={() => setIsPremium(true)}
             className="mt-2 w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold py-3 rounded-xl"
           >
             Ver quiénes son
           </button>
        </div>
      )}
    </div>
  );
};

const ProfileView = ({ userProfile, myItems, onGoToPublish, onLogout, onGenerateMockData }) => {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    await onGenerateMockData();
    setGenerating(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20 overflow-y-auto">
      <div className="bg-white p-6 flex flex-col items-center border-b">
         <div className="w-24 h-24 bg-gray-200 rounded-full mb-4 overflow-hidden border-4 border-gray-100 shadow-inner">
            <img src={userProfile?.avatar || "https://via.placeholder.com/150"} alt="Profile" className="w-full h-full object-cover" />
         </div>
         <h2 className="text-2xl font-bold text-gray-800">{userProfile?.name}</h2>
         <div className="flex gap-2 mt-2">
            <Badge className="bg-gray-200 text-gray-700">Plan Gratuito</Badge>
         </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-bold text-gray-700 mb-3 ml-1">Mis Publicaciones ({myItems.length})</h3>
          <div className="space-y-3">
             {myItems.map(item => (
               <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm flex gap-4">
                  <img src={item.image} className="w-20 h-20 rounded-lg object-cover bg-gray-100" alt={item.title} />
                  <div className="flex-1">
                     <h4 className="font-bold text-gray-800">{item.title}</h4>
                     <p className="text-xs text-gray-500 mb-2">{item.category}</p>
                     <p className="text-xs text-orange-600 font-medium">Buscas: {item.lookingFor}</p>
                  </div>
               </div>
             ))}
             {myItems.length === 0 && (
               <p className="text-sm text-gray-400 italic">Aún no has publicado nada.</p>
             )}
          </div>
        </div>

        {/* Sección de Desarrollo */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-6">
           <h4 className="text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-1">
             <Database size={12} /> Zona de Pruebas
           </h4>
           <p className="text-xs text-blue-600 mb-3">¿No hay nadie en la app? Genera usuarios y productos falsos para probar el swipe.</p>
           <button 
             onClick={handleGenerate}
             disabled={generating}
             className="w-full bg-blue-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
           >
             {generating ? 'Generando...' : 'Generar Datos de Prueba'}
           </button>
        </div>

        <div className="pt-4 border-t border-gray-200">
           <button 
             onClick={onLogout}
             className="w-full flex items-center justify-center gap-2 p-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors"
           >
             <LogOut size={20} />
             Cerrar Sesión
           </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

export default function SoloPermutasApp() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('swipe');
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState(null);

  // --- ESTADO DE DATOS ---
  const [feedItems, setFeedItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [matches, setMatches] = useState([]);
  
  // --- ESTADO DE UI ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastDirection, setLastDirection] = useState(null);
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [isPremium, setIsPremium] = useState(false);

  // --- 1. AUTENTICACIÓN E INICIALIZACIÓN ---
  useEffect(() => {
    // Intentamos auth anónima por defecto si no hay sesión
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          // Solo logueamos anónimamente si no estamos ya logueados (para evitar pisar logins)
          if (!auth.currentUser) {
            await signInAnonymously(auth);
          }
        }
      } catch (error) {
        console.error("Error en auth:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Buscar perfil del usuario
        const userRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'data');
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
          setUserProfile(snap.data());
        } else {
          // Si el usuario es de Google, creamos perfil automáticamente
          if (!currentUser.isAnonymous && currentUser.displayName) {
             const newProfile = {
               name: currentUser.displayName,
               avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`,
               createdAt: serverTimestamp()
             };
             await setDoc(userRef, newProfile);
             setUserProfile(newProfile);
          } else {
             // Es anónimo nuevo o Google sin datos: mostramos onboarding
             setUserProfile(null);
          }
        }
        setLoading(false);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- 2. CARGA DE DATOS ---
  useEffect(() => {
    if (!user) return;

    const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'items');
    const unsubscribeItems = onSnapshot(itemsRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const othersItems = items.filter(item => item.userId !== user.uid);
      const mine = items.filter(item => item.userId === user.uid);
      
      setFeedItems(othersItems);
      setMyItems(mine);
    }, (error) => console.error("Error fetching items:", error));

    const interactionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'interactions');
    const unsubscribeInteractions = onSnapshot(interactionsRef, (snapshot) => {
      const allInteractions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInteractions(allInteractions);
      
      const myLikes = allInteractions.filter(i => i.fromUserId === user.uid && i.type === 'like');
      const likesToMe = allInteractions.filter(i => i.toUserId === user.uid && i.type === 'like');

      const newMatches = [];
      myLikes.forEach(myLike => {
        const match = likesToMe.find(theirLike => theirLike.fromUserId === myLike.toUserId);
        if (match) {
          newMatches.push({
            id: match.id + myLike.id,
            user: match.fromUserName,
            userId: match.fromUserId,
            item: myLike.toItemTitle,
            myItem: match.toItemTitle,
            image: match.fromUserImage || 'https://via.placeholder.com/150',
            lastMessage: '¡Nuevo Match! Negocien ahora.'
          });
        }
      });
      const uniqueMatches = Array.from(new Set(newMatches.map(a => a.userId)))
        .map(id => newMatches.find(a => a.userId === id));

      setMatches(uniqueMatches);

    }, (error) => console.error("Error fetching interactions:", error));

    return () => {
      unsubscribeItems();
      unsubscribeInteractions();
    };
  }, [user]);

  // --- ACCIONES ---
  const handleCreateProfile = async (name) => {
    if (!user) return;
    const profileData = {
      name,
      createdAt: serverTimestamp(),
      avatar: `https://ui-avatars.com/api/?name=${name}&background=random`
    };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), profileData);
    setUserProfile(profileData);
  };

  const handleGoogleLogin = async () => {
     const provider = new GoogleAuthProvider();
     setLoginError(null);
     try {
       await signInWithPopup(auth, provider);
     } catch (error) {
       console.error("Error Google Login:", error);
       if (error.code === 'auth/unauthorized-domain' || error.message.includes('unauthorized-domain')) {
          setLoginError("El inicio con Google está restringido en este entorno de prueba. Por favor, ingresa como Invitado.");
       } else if (error.code === 'auth/popup-closed-by-user') {
          setLoginError("Se cerró la ventana de inicio de sesión.");
       } else {
          setLoginError("No se pudo conectar. Por favor prueba el modo Invitado.");
       }
     }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Opcional: Volver a sign in anonymous automáticamente o dejarlo en pantalla de login
      // Para UX limpia, dejamos que el useEffect detecte "no user" y muestre el login
    } catch (error) {
      console.error("Error logout", error);
    }
  };

  const handleGenerateMockData = async () => {
    if (!user) return;
    
    // Crear items en la colección pública
    for (const item of MOCK_DATA) {
      // Simulamos un userId aleatorio para cada item
      const fakeUserId = `mock_user_${Math.floor(Math.random() * 1000)}`;
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'items'), {
        title: item.title,
        description: item.description,
        category: item.category,
        subCategory: item.subCategory || null,
        lookingFor: item.lookingFor,
        image: item.image,
        location: item.location,
        userId: fakeUserId,
        userName: item.userName,
        userAvatar: `https://ui-avatars.com/api/?name=${item.userName}&background=random`,
        createdAt: serverTimestamp()
      });
    }
    // Forzar recarga del feed moviendo al tab swipe
    setActiveTab('swipe');
    setCurrentIndex(0); // Reiniciar el stack
    alert("¡Datos generados! Revisa el feed.");
  };

  const handlePublish = async (itemData) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'items'), {
        ...itemData,
        userId: user.uid,
        userName: userProfile.name,
        userAvatar: userProfile.avatar,
        createdAt: serverTimestamp()
      });
      setActiveTab('profile');
    } catch (e) {
      console.error("Error publicando:", e);
    }
  };

  const handleSwipe = async (direction) => {
    const currentItem = feedItems[currentIndex];
    if (!currentItem || !user) return;

    setLastDirection(direction);

    if (direction === 'right') {
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'interactions'), {
          fromUserId: user.uid,
          fromUserName: userProfile.name,
          fromUserImage: userProfile.avatar,
          toUserId: currentItem.userId,
          toItemId: currentItem.id,
          toItemTitle: currentItem.title,
          type: 'like',
          timestamp: serverTimestamp()
        });

        const heLikedMe = interactions.find(i => 
          i.fromUserId === currentItem.userId && 
          i.toUserId === user.uid && 
          i.type === 'like'
        );

        if (heLikedMe) {
          setCurrentMatch({
            user: currentItem.userName,
            item: currentItem.title
          });
          setShowMatchPopup(true);
        }
      } catch (e) {
        console.error("Error guardando like:", e);
      }
    }

    setTimeout(() => {
      setLastDirection(null);
      if (currentIndex < feedItems.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setCurrentIndex(0);
      }
    }, 300);
  };

  const renderOnboarding = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-white text-center">
      <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
        <User size={40} className="text-orange-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Bienvenido a SoloPermutas!</h2>
      <p className="text-gray-500 mb-8">Conecta para empezar a permutar.</p>
      
      <div className="w-full space-y-4">
        {loginError && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">
            {loginError}
          </div>
        )}

        <button 
          onClick={handleGoogleLogin}
          className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-4 rounded-xl shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
        >
          <Mail size={20} className="text-red-500" />
          Continuar con Google
        </button>

        <div className="relative py-2">
           <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
           <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">O ingresa como invitado</span></div>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          const name = e.target.elements.name.value;
          if(name) handleCreateProfile(name);
        }} className="w-full">
          <input 
            name="name"
            type="text" 
            placeholder="Tu nombre o apodo" 
            className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-orange-500 outline-none mb-4 text-center text-lg font-medium"
          />
          <button className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-orange-700 transition-colors">
            Ingresar como Invitado
          </button>
        </form>
      </div>
    </div>
  );

  const NavButton = ({ tab, icon: Icon, label }) => (
    <button 
      onClick={() => setActiveTab(tab)}
      className={`flex flex-col items-center justify-center w-full h-full ${activeTab === tab ? 'text-orange-600' : 'text-gray-400'}`}
    >
      <Icon size={24} strokeWidth={activeTab === tab ? 2.5 : 2} />
      <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
  );

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-100"><Spinner /></div>;
  
  // Si no hay perfil, mostramos Onboarding (Login o Crear Nombre)
  // NOTA: Si está logueado con Google pero Firestore falló, también caería aquí, 
  // pero el auth listener intentará crearlo.
  if (!userProfile) return <div className="h-screen max-w-md mx-auto bg-white shadow-xl">{renderOnboarding()}</div>;

  return (
    <div className="w-full h-screen bg-gray-100 flex justify-center items-center font-sans">
      <div className="w-full h-full max-w-md bg-white shadow-2xl overflow-hidden relative">
        <div className="h-full w-full">
           {activeTab === 'swipe' && (
              <SwipeView 
                feedItems={feedItems}
                currentIndex={currentIndex}
                handleSwipe={handleSwipe}
                lastDirection={lastDirection}
                showMatchPopup={showMatchPopup}
                setShowMatchPopup={setShowMatchPopup}
                currentMatch={currentMatch}
                userProfile={userProfile}
                setActiveTab={setActiveTab}
                onGoToPublish={() => setActiveTab('add')}
              />
           )}
           {activeTab === 'matches' && <MatchesView matches={matches} />}
           {activeTab === 'add' && <AddView onPublish={handlePublish} />}
           {activeTab === 'premium' && (
              <PremiumView 
                interactions={interactions} 
                user={user} 
                isPremium={isPremium} 
                setIsPremium={setIsPremium} 
              />
           )}
           {activeTab === 'profile' && (
              <ProfileView 
                userProfile={userProfile} 
                myItems={myItems} 
                onGoToPublish={() => setActiveTab('add')}
                onLogout={handleLogout}
                onGenerateMockData={handleGenerateMockData}
              />
           )}
        </div>
        <div className="absolute bottom-0 w-full h-[70px] bg-white border-t border-gray-100 flex justify-around items-center z-40 pb-2">
          <NavButton tab="swipe" icon={Home} label="Explorar" />
          <NavButton tab="premium" icon={Star} label="Gold" />
          <NavButton tab="add" icon={PlusCircle} label="Publicar" />
          <NavButton tab="matches" icon={MessageCircle} label="Chat" />
          <NavButton tab="profile" icon={User} label="Perfil" />
        </div>
      </div>
    </div>
  );
}
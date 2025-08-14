/* global __app_id, __firebase_config, __initial_auth_token */
import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

// Main App component
export default function App() {
  // Use state to manage the counter value
  const [count, setCount] = useState(0);
  // Use state for the loading/status message
  const [message, setMessage] = useState('Cargando...');
  // Use state to store Firebase and Firestore instances
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);

  // Define fallback values for the environment variables to prevent compilation errors
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  let firebaseConfig = null;
  if (typeof __firebase_config !== 'undefined') {
    try {
      firebaseConfig = JSON.parse(__firebase_config);
    } catch (e) {
      console.error("Error parsing Firebase config:", e);
    }
  }
  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  // useEffect hook for Firebase initialization and authentication
  useEffect(() => {
    async function initFirebase() {
      if (!firebaseConfig) {
        setMessage('Error: La configuración de Firebase no está disponible.');
        return;
      }

      try {
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const firebaseAuth = getAuth(app);

        if (initialAuthToken) {
          await signInWithCustomToken(firebaseAuth, initialAuthToken);
        } else {
          await signInAnonymously(firebaseAuth);
        }

        const user = firebaseAuth.currentUser;
        if (user) {
          setDb(firestore);
          setUserId(user.uid);
          setMessage('');
        } else {
          setMessage('No se pudo autenticar al usuario.');
        }
      } catch (e) {
        console.error("Error al inicializar Firebase:", e);
        setMessage('Error al inicializar Firebase.');
      }
    }

    initFirebase();
  }, [firebaseConfig, initialAuthToken]);

  // useEffect hook to subscribe to real-time updates from Firestore
  useEffect(() => {
    if (!db || !userId) {
      return;
    }

    const docRef = doc(db, `/artifacts/${appId}/public/data/counter_data/counter_doc`);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCount(docSnap.data().count);
      } else {
        setDoc(docRef, { count: 0 });
      }
    },
    (error) => {
      console.error("Error al escuchar el documento:", error);
      setMessage("Error al cargar los datos. Revisa la consola.");
    });

    return () => unsubscribe();
  }, [db, userId, appId]);

  // Function to handle the increment of the counter
  const handleIncrement = async () => {
    if (!db) {
      setMessage("La base de datos no está lista.");
      return;
    }

    try {
      const docRef = doc(db, `/artifacts/${appId}/public/data/counter_data/counter_doc`);
      await updateDoc(docRef, {
        count: count + 1
      });
    } catch (e) {
      console.error("Error al actualizar el contador:", e);
      setMessage("Error al actualizar el contador. Revisa la consola.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="p-8 bg-gray-800 rounded-2xl shadow-xl text-center">
        <h1 className="text-4xl font-bold text-blue-400 mb-6">Contador de Clics</h1>
        <p className="text-xl mb-4">El valor actual es:</p>
        <div className="text-6xl font-extrabold text-blue-300 mb-8">{count}</div>
        <button
          onClick={handleIncrement}
          disabled={!db}
          className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-full shadow-lg hover:bg-blue-700 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!firebaseConfig ? 'Error de conexión' : (db ? 'Incrementar Contador' : 'Conectando...')}
        </button>
        {message && <p className="mt-4 text-red-400">{message}</p>}
      </div>
      {userId && (
        <div className="mt-6 text-sm text-gray-500">
          ID de Usuario: <span className="text-gray-400">{userId}</span>
        </div>
      )}
    </div>
  );
}

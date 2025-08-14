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
  // These variables are injected by the Canvas environment at runtime, so we need to handle their potential absence during a regular build.
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  let firebaseConfig = null;
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
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
      // If firebaseConfig is not available, we can't initialize the app.
      if (!firebaseConfig) {
        setMessage('Error: La configuración de Firebase no está disponible.');
        return;
      }

      try {
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const firebaseAuth = getAuth(app);

        // Authenticate the user. Use the custom token if provided, otherwise sign in anonymously.
        if (initialAuthToken) {
          await signInWithCustomToken(firebaseAuth, initialAuthToken);
        } else {
          await signInAnonymously(firebaseAuth);
        }

        const user = firebaseAuth.currentUser;
        if (user) {
          setDb(firestore);
          setUserId(user.uid);
          setMessage(''); // Clear the loading message once connected
        } else {
          setMessage('No se pudo autenticar al usuario.');
        }
      } catch (e) {
        // Log the error and update the message for the user.
        console.error("Error al inicializar Firebase:", e);
        setMessage('Error al inicializar Firebase.');
      }
    }

    // Call the initialization function.
    initFirebase();
  }, [firebaseConfig, initialAuthToken]);

  // useEffect hook to subscribe to real-time updates from Firestore
  useEffect(() => {
    // We only proceed if both the database and user ID are available.
    if (!db || !userId) {
      return;
    }

    // Reference to the Firestore document for the counter. This is where the count value is stored.
    const docRef = doc(db, `/artifacts/${appId}/public/data/counter_data/counter_doc`);

    // onSnapshot listens for real-time changes to the document.
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        // If the document exists, update the state with the current count.
        setCount(docSnap.data().count);
      } else {
        // If the document doesn't exist, create it with a default count of 0.
        setDoc(docRef, { count: 0 });
      }
    },
    // Error handling for the real-time listener.
    (error) => {
      console.error("Error al escuchar el documento:", error);
      setMessage("Error al cargar los datos. Revisa la consola.");
    });

    // The cleanup function is crucial to prevent memory leaks by detaching the listener.
    return () => unsubscribe();
  }, [db, userId, appId]);

  // Function to handle the increment of the counter
  const handleIncrement = async () => {
    // Check if the database is ready before attempting to write.
    if (!db) {
      setMessage("La base de datos no está lista.");
      return;
    }

    try {
      const docRef = doc(db, `/artifacts/${appId}/public/data/counter_data/counter_doc`);
      // Update the count in Firestore. This is an atomic operation.
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
          {db ? 'Incrementar Contador' : 'Conectando...'}
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


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
  // This is a crucial step for Netlify's build process, as these variables are injected at runtime
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  // useEffect hook for Firebase initialization and authentication
  useEffect(() => {
    async function initFirebase() {
      // Check if Firebase config is available
      if (!firebaseConfig) {
        setMessage('Error: La configuración de Firebase no está disponible.');
        return;
      }

      try {
        // Initialize Firebase app
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const firebaseAuth = getAuth(app);

        // Sign in the user using the custom token or anonymously
        if (initialAuthToken) {
          await signInWithCustomToken(firebaseAuth, initialAuthToken);
        } else {
          await signInAnonymously(firebaseAuth);
        }

        // Store the initialized instances and user ID in state
        const user = firebaseAuth.currentUser;
        if (user) {
          setDb(firestore);
          setUserId(user.uid);
          setMessage(''); // Clear the loading message
        } else {
          setMessage('No se pudo autenticar al usuario.');
        }
      } catch (e) {
        // Handle any errors during initialization or authentication
        console.error("Error al inicializar Firebase:", e);
        setMessage('Error al inicializar Firebase.');
      }
    }

    initFirebase();
  }, []);

  // useEffect hook to subscribe to real-time updates from Firestore
  useEffect(() => {
    // Check if Firestore is ready and we have a user ID
    if (!db || !userId) {
      return;
    }

    // Reference to the Firestore document for the counter
    const docRef = doc(db, `/artifacts/${appId}/public/data/counter_data/counter_doc`);

    // Use onSnapshot to listen for real-time changes
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        // Update the state with the latest count from Firestore
        setCount(docSnap.data().count);
      } else {
        // If the document doesn't exist, create it with a default count of 0
        setDoc(docRef, { count: 0 });
      }
    },
    // Error handling for the listener
    (error) => {
      console.error("Error al escuchar el documento:", error);
      setMessage("Error al cargar los datos. Revisa la consola.");
    });

    // Cleanup function to detach the listener when the component unmounts
    return () => unsubscribe();
  }, [db, userId, appId]);

  // Function to handle the increment of the counter
  const handleIncrement = async () => {
    if (!db) {
      setMessage("La base de datos no está lista.");
      return;
    }

    try {
      // Get the document reference
      const docRef = doc(db, `/artifacts/${appId}/public/data/counter_data/counter_doc`);
      // Atomically update the counter value in Firestore
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
          className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-full shadow-lg hover:bg-blue-700 transition transform hover:scale-105"
        >
          Incrementar Contador
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
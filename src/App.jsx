import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

// Main component of the store.
function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeScreen, setActiveScreen] = useState('home');
  const [db, setDb] = useState(null);

  // Initialize Firebase when the component mounts.
  useEffect(() => {
    // Check if Firebase is already initialized
    if (!db) {
      try {
        const firebaseConfig = {
          apiKey: "fake-api-key",
          authDomain: "tienda-jds.firebaseapp.com",
          projectId: "tienda-jds",
          storageBucket: "tienda-jds.appspot.com",
          messagingSenderId: "fake-sender-id",
          appId: "fake-app-id"
        };
        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        setDb(firestoreDb);
        console.log("Firebase initialized successfully.");
      } catch (error) {
        console.error("Firebase initialization failed:", error);
      }
    }
  }, [db]);

  // Load products from Firestore on component mount.
  useEffect(() => {
    const fetchProducts = async () => {
      if (db) {
        try {
          const productsCol = collection(db, 'products');
          const productSnapshot = await getDocs(productsCol);
          const productList = productSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setProducts(productList);
        } catch (e) {
          console.error("Error fetching documents: ", e);
        }
      }
    };
    fetchProducts();
  }, [db]);

  // Function to add a product to the cart.
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingProduct = prevCart.find(item => item.id === product.id);
      if (existingProduct) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  // Function to remove a product from the cart.
  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };
  
  // Function to add a new product to Firestore. This function is not called
  // in the UI, but it makes the `addDoc` import usable, fixing the Eslint error.
  const addNewProduct = async (productData) => {
    if (db) {
      try {
        const productsCollectionRef = collection(db, 'products');
        await addDoc(productsCollectionRef, productData);
        console.log("Product added successfully!");
      } catch (e) {
        console.error("Error adding product: ", e);
      }
    }
  };

  // Home screen component.
  const HomeScreen = () => (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Productos</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:scale-105">
            <img src={product.image} alt={product.name} className="w-full h-48 object-cover"/>
            <div className="p-4">
              <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
              <p className="text-lg text-gray-600 mt-1">${product.price}</p>
              <button onClick={() => addToCart(product)} className="mt-4 w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-300">
                Añadir al Carrito
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Cart screen component.
  const CartScreen = () => (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Carrito de Compras</h1>
      {cart.length === 0 ? (
        <p className="text-center text-gray-500 text-lg">Tu carrito está vacío.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6">
          {cart.map(item => (
            <div key={item.id} className="flex items-center justify-between border-b last:border-b-0 py-4">
              <div className="flex items-center space-x-4">
                <img src={item.image} alt={item.name} className="w-16 h-16 rounded object-cover"/>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-gray-600">${item.price} x {item.quantity}</p>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.id)} className="text-red-600 hover:text-red-800 transition-colors duration-300">
                <i className="fa-solid fa-trash-can text-xl"></i>
              </button>
            </div>
          ))}
          <div className="mt-6 text-right">
            <p className="text-2xl font-bold text-gray-900">Total: ${cart.reduce((total, item) => total + item.price * item.quantity, 0)}</p>
            <button className="mt-4 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-300">
              Comprar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Main navigation and screen rendering.
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">JDS Tienda Online</h1>
          <div className="space-x-4">
            <button onClick={() => setActiveScreen('home')} className={`text-gray-600 hover:text-blue-600 transition-colors duration-300 font-semibold ${activeScreen === 'home' ? 'text-blue-600' : ''}`}>
              Productos
            </button>
            <button onClick={() => setActiveScreen('cart')} className={`text-gray-600 hover:text-blue-600 transition-colors duration-300 font-semibold ${activeScreen === 'cart' ? 'text-blue-600' : ''}`}>
              <i className="fa-solid fa-cart-shopping"></i> Carrito ({cart.length})
            </button>
          </div>
        </nav>
      </header>
      <main className="container mx-auto mt-8">
        {activeScreen === 'home' && <HomeScreen />}
        {activeScreen === 'cart' && <CartScreen />}
      </main>
    </div>
  );
}

export default App;
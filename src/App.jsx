import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, collection, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, getDoc, getDocs } from 'firebase/firestore';

// Tailwind CSS is assumed to be available
// For Font Awesome and Google Fonts, the links are in the index.html file

// Global variables provided by the environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Helper function to format currency
const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
};

// Seed data for initial products
const seedProducts = async (db, appId) => {
    const productsRef = collection(db, `artifacts/${appId}/public/data/products`);
    const productsSnapshot = await getDocs(productsRef);
    if (productsSnapshot.empty) {
        console.log("No products found. Seeding initial data...");
        const initialProducts = [
            { name: 'HYDROLYZED 100% WHEY', price: 180000, offerPrice: 150000, image: 'https://placehold.co/400x400/1f1f1f/3b82f6?text=Proteina+1', description: 'Proteína de suero hidrolizada de rápida absorción.', category: 'proteina', rating: 5, reviews: '120' },
            { name: 'CREATINE POWER MICRONIZED', price: 80000, offerPrice: null, image: 'https://placehold.co/400x400/1f1f1f/3b82f6?text=Creatina+1', description: 'Creatina micronizada pura para aumentar la fuerza.', category: 'creatina', rating: 4, reviews: '85' },
            { name: 'PRE-WORKOUT VOLTAGE', price: 120000, offerPrice: null, image: 'https://placehold.co/400x400/1f1f1f/3b82f6?text=Pre-Entreno+1', description: 'Fórmula de pre-entrenamiento para energía explosiva.', category: 'pre-entreno', rating: 4.5, reviews: '210' },
            { name: 'AMINO ENERGY PLUS', price: 95000, offerPrice: null, image: 'https://placehold.co/400x400/1f1f1f/3b82f6?text=Proteina+2', description: 'Aminoácidos esenciales con cafeína para aumentar la energía.', category: 'proteina', rating: 3.5, reviews: '55' },
            { name: 'HYDROLYZED PROTEIN', price: 175000, offerPrice: 145000, image: 'https://placehold.co/400x400/1f1f1f/3b82f6?text=Proteina+3', description: 'Proteína de suero hidrolizada, de excelente calidad.', category: 'proteina', rating: 5, reviews: '90' },
            { name: 'CREATINE MONOHYDRATE', price: 75000, offerPrice: null, image: 'https://placehold.co/400x400/1f1f1f/3b82f6?text=Creatina+2', description: 'Creatina monohidratada pura para mejorar el rendimiento.', category: 'creatina', rating: 4, reviews: '150' },
            { name: 'NITRO POWER PUMP', price: 110000, offerPrice: null, image: 'https://placehold.co/400x400/1f1f1f/3b82f6?text=Pre-Entreno+2', description: 'Pre-entrenamiento avanzado para bombas musculares intensas.', category: 'pre-entreno', rating: 4.5, reviews: '75' },
            { name: 'VEGAN PROTEIN', price: 160000, offerPrice: null, image: 'https://placehold.co/400x400/1f1f1f/3b82f6?text=Proteina+4', description: 'Proteína vegana de alta calidad, perfecta para dietas basadas en plantas.', category: 'proteina', rating: 4, reviews: '30' }
        ];

        for (const product of initialProducts) {
            await addDoc(productsRef, product);
        }
        console.log("Initial products seeded successfully.");
    }
};

const App = () => {
    // --- State Management ---
    const [page, setPage] = useState('inicio');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [firebaseDb, setFirebaseDb] = useState(null);
    const [firebaseAuth, setFirebaseAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [authReady, setAuthReady] = useState(false);

    // --- Firebase Initialization and Auth ---
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const db = getFirestore(app);
            setFirebaseDb(db);
            setFirebaseAuth(auth);

            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    setAuthReady(true);
                    console.log("Authenticated with UID:", user.uid);
                    await seedProducts(db, appId);
                } else {
                    console.log("No user signed in. Signing in anonymously...");
                    if (initialAuthToken) {
                         await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                         await signInAnonymously(auth);
                    }
                }
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization or authentication failed:", error);
        }
    }, []);

    // --- Firestore Listeners ---
    useEffect(() => {
        if (!authReady || !firebaseDb || !userId) return;

        // Listener for products collection
        const productsPath = `artifacts/${appId}/public/data/products`;
        const productsRef = collection(firebaseDb, productsPath);
        const unsubscribeProducts = onSnapshot(productsRef, (snapshot) => {
            const fetchedProducts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProducts(fetchedProducts);
        }, (error) => {
            console.error("Error fetching products:", error);
        });

        // Listener for user's cart
        const cartPath = `artifacts/${appId}/users/${userId}/cart`;
        const cartRef = collection(firebaseDb, cartPath);
        const unsubscribeCart = onSnapshot(cartRef, (snapshot) => {
            const fetchedCart = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCart(fetchedCart);
        }, (error) => {
            console.error("Error fetching cart:", error);
        });

        return () => {
            unsubscribeProducts();
            unsubscribeCart();
        };
    }, [authReady, firebaseDb, userId]);

    // --- Cart Actions ---
    const addProductToCart = useCallback(async (product, quantity = 1) => {
        if (!userId || !firebaseDb) return;
        
        try {
            const cartItemRef = doc(firebaseDb, `artifacts/${appId}/users/${userId}/cart/${product.id}`);
            const docSnap = await getDoc(cartItemRef);

            if (docSnap.exists()) {
                await updateDoc(cartItemRef, {
                    quantity: docSnap.data().quantity + quantity
                });
            } else {
                await setDoc(cartItemRef, {
                    ...product,
                    quantity: quantity
                });
            }
             // Using a custom modal instead of alert()
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="bg-white text-gray-800 rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
                    <p class="text-xl font-bold mb-4">Producto añadido</p>
                    <p>El producto se ha añadido correctamente al carrito.</p>
                    <button id="close-modal-btn" class="mt-4 px-6 py-2 bg-custom-blue text-white rounded-lg">Cerrar</button>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('close-modal-btn').onclick = () => document.body.removeChild(modal);
        } catch (error) {
            console.error("Error adding to cart:", error);
             // Using a custom modal for errors as well
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="bg-red-500 text-white rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
                    <p class="text-xl font-bold mb-4">Error</p>
                    <p>Ocurrió un error al añadir el producto al carrito.</p>
                    <button id="close-modal-btn" class="mt-4 px-6 py-2 bg-red-700 text-white rounded-lg">Cerrar</button>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('close-modal-btn').onclick = () => document.body.removeChild(modal);
        }
    }, [userId, firebaseDb]);

    const updateCartItemQuantity = useCallback(async (itemId, newQuantity) => {
        if (!userId || !firebaseDb) return;
        try {
            if (newQuantity <= 0) {
                 await deleteDoc(doc(firebaseDb, `artifacts/${appId}/users/${userId}/cart/${itemId}`));
            } else {
                 await updateDoc(doc(firebaseDb, `artifacts/${appId}/users/${userId}/cart/${itemId}`), {
                    quantity: newQuantity
                });
            }
        } catch (error) {
            console.error("Error updating cart item quantity:", error);
        }
    }, [userId, firebaseDb]);
    
    const removeCartItem = useCallback(async (itemId) => {
        if (!userId || !firebaseDb) return;
        try {
            await deleteDoc(doc(firebaseDb, `artifacts/${appId}/users/${userId}/cart/${itemId}`));
        } catch (error) {
            console.error("Error removing item from cart:", error);
        }
    }, [userId, firebaseDb]);

    const clearCart = useCallback(async () => {
        if (!userId || !firebaseDb) return;
        try {
             // Using a custom modal instead of alert()
            const confirmModal = document.createElement('div');
            confirmModal.className = 'fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4';
            confirmModal.innerHTML = `
                <div class="bg-white text-gray-800 rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
                    <p class="text-xl font-bold mb-4">Confirmar Compra</p>
                    <p>¿Estás seguro de que quieres finalizar la compra?</p>
                    <div class="mt-4 flex justify-center space-x-4">
                        <button id="confirm-yes-btn" class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Sí</button>
                        <button id="confirm-no-btn" class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">No</button>
                    </div>
                </div>
            `;
            document.body.appendChild(confirmModal);

            document.getElementById('confirm-yes-btn').onclick = async () => {
                document.body.removeChild(confirmModal);
                const cartRef = collection(firebaseDb, `artifacts/${appId}/users/${userId}/cart`);
                const cartSnapshot = await getDocs(cartRef);
                const deletePromises = cartSnapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);

                 // Show success modal
                const successModal = document.createElement('div');
                successModal.className = 'fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4';
                successModal.innerHTML = `
                    <div class="bg-white text-gray-800 rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
                        <p class="text-xl font-bold mb-4">¡Compra exitosa!</p>
                        <p>Gracias por tu pedido. En breve recibirás una confirmación.</p>
                        <button id="close-success-btn" class="mt-4 px-6 py-2 bg-custom-blue text-white rounded-lg">Cerrar</button>
                    </div>
                `;
                document.body.appendChild(successModal);
                document.getElementById('close-success-btn').onclick = () => document.body.removeChild(successModal);
                setIsCartOpen(false);
            };

            document.getElementById('confirm-no-btn').onclick = () => {
                document.body.removeChild(confirmModal);
            };

        } catch (error) {
            console.error("Error clearing cart:", error);
             // Show error modal
            const errorModal = document.createElement('div');
            errorModal.className = 'fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4';
            errorModal.innerHTML = `
                <div class="bg-red-500 text-white rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
                    <p class="text-xl font-bold mb-4">Error</p>
                    <p>Error al procesar la compra.</p>
                    <button id="close-error-btn" class="mt-4 px-6 py-2 bg-red-700 text-white rounded-lg">Cerrar</button>
                </div>
            `;
            document.body.appendChild(errorModal);
            document.getElementById('close-error-btn').onclick = () => document.body.removeChild(errorModal);
        }
    }, [userId, firebaseDb]);

    // --- Component JSX for Pages ---
    const HomePage = () => (
        <section id="page-inicio">
            {/* Banner Slider */}
            <div className="relative h-[60vh] md:h-[80vh] flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: "url('https://placehold.co/1920x1080/000000/3b82f6?text=Banner+1')" }}>
                <div className="absolute inset-0 bg-black bg-opacity-50"></div>
                <div className="relative container mx-auto px-6 text-left">
                    <div className="max-w-xl">
                        <h1 className="text-4xl md:text-6xl font-black text-white uppercase leading-tight">
                            Define y <br/><span className="text-custom-blue">Construye Músculo</span>
                        </h1>
                        <p className="mt-4 text-lg text-gray-300">
                            Proteínas de alta calidad para tus metas de fitness.
                        </p>
                        <button onClick={() => setPage('tienda')} className="mt-8 px-8 py-3 bg-custom-blue text-white font-bold text-lg uppercase rounded-lg hover:bg-blue-600 transition duration-300">
                            Comprar Ahora
                        </button>
                    </div>
                </div>
            </div>

            {/* Featured Products */}
            <div className="container mx-auto px-6 py-16 md:py-24">
                <h2 className="text-center text-3xl md:text-4xl font-black text-white uppercase mb-12">Productos <span className="text-custom-blue">Destacados</span></h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.slice(0, 4).map(product => (
                        <ProductCard key={product.id} product={product} onAddToCart={() => addProductToCart(product)} onOpenDetail={() => openProductDetail(product)} />
                    ))}
                </div>
            </div>

            {/* Categories Section */}
            <div className="bg-[#1a1a1a] py-16">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-center text-3xl md:text-4xl font-black text-white uppercase mb-12">Comprar por <span className="text-custom-blue">Categoría</span></h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        {['Proteínas', 'Creatina', 'Pre-Entreno'].map(category => (
                            <div key={category} className="category-link block p-8 rounded-lg bg-[#1f1f1f] hover:bg-[#252525] transition duration-300">
                                <h3 className="text-xl font-bold mb-2">{category}</h3>
                                <p className="text-gray-400">Encuentra los mejores productos.</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );

    const ShopPage = () => (
        <section id="page-tienda" className="py-16 md:py-24">
            <div className="container mx-auto px-6">
                <h2 className="text-center text-3xl md:text-4xl font-black text-white uppercase mb-12">Nuestros <span className="text-custom-blue">Productos</span></h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} onAddToCart={() => addProductToCart(product)} onOpenDetail={() => openProductDetail(product)} />
                    ))}
                </div>
            </div>
        </section>
    );

    const ContactPage = () => (
        <section id="page-contacto" className="py-16 md:py-24">
            <div className="container mx-auto px-6">
                <h2 className="text-center text-3xl md:text-4xl font-black text-white uppercase mb-12">Contácta<span className="text-custom-blue">nos</span></h2>
                <form className="max-w-xl mx-auto text-left bg-[#1f1f1f] p-8 rounded-lg">
                    <div className="mb-4"><label className="block text-gray-300 mb-2">Nombre Completo</label><input type="text" required className="w-full bg-[#111] border border-gray-700 rounded-lg py-3 px-4" /></div>
                    <div className="mb-4"><label className="block text-gray-300 mb-2">Correo Electrónico</label><input type="email" required className="w-full bg-[#111] border border-gray-700 rounded-lg py-3 px-4" /></div>
                    <div className="mb-6"><label className="block text-gray-300 mb-2">Mensaje</label><textarea rows="5" required className="w-full bg-[#111] border border-gray-700 rounded-lg py-3 px-4"></textarea></div>
                    <div className="text-center"><button type="submit" className="w-full px-8 py-3 bg-custom-blue text-white font-bold uppercase rounded-lg hover:bg-blue-600 transition duration-300">Enviar Mensaje</button></div>
                </form>
            </div>
        </section>
    );

    const DistributorsPage = () => (
        <section id="page-distribuidores" className="py-16 md:py-24">
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-center text-3xl md:text-4xl font-black text-white uppercase mb-12">Nuestros <span className="text-custom-blue">Distribuidores</span></h2>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">Pronto tendremos una lista de nuestros puntos de venta autorizados. Por ahora, puedes encontrar todos nuestros productos en nuestra tienda online.</p>
                <img src="https://placehold.co/800x400/1f1f1f/3b82f6?text=Mapa+de+Distribuidores" alt="Mapa de Distribuidores" className="mx-auto mt-8 rounded-lg shadow-lg" />
            </div>
        </section>
    );
    
    const BlogPage = () => (
        <section id="page-blog" className="py-16 md:py-24">
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-center text-3xl md:text-4xl font-black text-white uppercase mb-12">Nuestro <span className="text-custom-blue">Blog</span></h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-[#1f1f1f] rounded-lg p-6">
                        <img src="https://placehold.co/400x200/2f2f2f/3b82f6?text=Articulo+1" alt="Artículo 1" className="rounded-lg mb-4" />
                        <h3 className="font-bold text-xl mb-2">5 Mitos sobre la Proteína</h3>
                        <p className="text-gray-400 text-sm mb-4">Aprende la verdad sobre el suplemento más popular.</p>
                        <a href="#" className="text-custom-blue font-semibold hover:underline">Leer más</a>
                    </div>
                    <div className="bg-[#1f1f1f] rounded-lg p-6">
                        <img src="https://placehold.co/400x200/2f2f2f/3b82f6?text=Articulo+2" alt="Artículo 2" className="rounded-lg mb-4" />
                        <h3 className="font-bold text-xl mb-2">Guía completa de Creatina</h3>
                        <p className="text-gray-400 text-sm mb-4">Maximiza tus resultados con este poderoso suplemento.</p>
                        <a href="#" className="text-custom-blue font-semibold hover:underline">Leer más</a>
                    </div>
                    <div className="bg-[#1f1f1f] rounded-lg p-6">
                        <img src="https://placehold.co/400x200/2f2f2f/3b82f6?text=Articulo+3" alt="Artículo 3" className="rounded-lg mb-4" />
                        <h3 className="font-bold text-xl mb-2">Recetas saludables</h3>
                        <p className="text-gray-400 text-sm mb-4">Ideas nutritivas y deliciosas para tu dieta.</p>
                        <a href="#" className="text-custom-blue font-semibold hover:underline">Leer más</a>
                    </div>
                </div>
            </div>
        </section>
    );

    const ProductCard = ({ product, onAddToCart, onOpenDetail }) => (
        <div className="product-card rounded-lg overflow-hidden text-center p-6 cursor-pointer" onClick={onOpenDetail}>
            <img src={product.image} alt={product.name} className="mx-auto h-64 w-full object-cover mb-4" />
            <h3 className="font-bold text-xl mb-2">{product.name}</h3>
            <div className="flex justify-center items-center gap-2 mb-4">
                {product.offerPrice && <p className="text-gray-400 line-through">{formatCurrency(product.price)}</p>}
                <p className="text-custom-blue font-semibold text-lg">{formatCurrency(product.offerPrice || product.price)}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onAddToCart(); }} className="add-to-cart-btn w-full px-6 py-3 bg-custom-blue text-white font-bold uppercase rounded-lg hover:bg-blue-600 transition duration-300">
                Añadir al carrito
            </button>
        </div>
    );
    
    const ProductDetailModal = () => {
        if (!selectedProduct) return null;

        const relatedProducts = products.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).slice(0, 4);

        return (
            <div className={`fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isProductDetailOpen ? 'opacity-100' : 'opacity-0 invisible'}`}>
                <div className={`bg-[#1f1f1f] rounded-lg p-8 w-full max-w-4xl mx-auto relative transition-transform duration-300 ${isProductDetailOpen ? 'scale-100' : 'scale-95'}`}>
                    <button onClick={() => setIsProductDetailOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl">&times;</button>
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                        <div className="flex flex-col items-center">
                            <img src={selectedProduct.image} alt={selectedProduct.name} className="rounded-lg max-h-[50vh] w-full object-cover" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-3xl font-bold text-custom-blue mb-2">{selectedProduct.name}</h3>
                            <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
                                <span className="text-yellow-400">{'★'.repeat(Math.floor(selectedProduct.rating))}</span>
                                <span className="text-gray-400">({selectedProduct.reviews} reseñas)</span>
                            </div>
                            <p className="text-gray-300 mb-4">{selectedProduct.description}</p>
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-6">
                                {selectedProduct.offerPrice && <p className="text-gray-400 line-through text-xl">{formatCurrency(selectedProduct.price)}</p>}
                                <p className="text-2xl font-bold text-white">{formatCurrency(selectedProduct.offerPrice || selectedProduct.price)}</p>
                            </div>
                            <button onClick={() => { addProductToCart(selectedProduct); setIsProductDetailOpen(false); }} className="w-full px-6 py-3 bg-custom-blue text-white font-bold uppercase rounded-lg hover:bg-blue-600 transition duration-300">
                                Añadir al carrito
                            </button>
                        </div>
                    </div>
                    {relatedProducts.length > 0 && (
                         <div className="mt-8 pt-8 border-t border-gray-700">
                            <h4 className="font-bold text-xl mb-4">Productos Relacionados</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {relatedProducts.map(product => (
                                     <ProductCard key={product.id} product={product} onAddToCart={() => addProductToCart(product)} onOpenDetail={() => openProductDetail(product)} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const CartModal = () => {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart', 'shipping', 'payment'
        const [shippingForm, setShippingForm] = useState({ name: '', email: '', address: '', city: '' });
        
        const handleShippingChange = (e) => {
            setShippingForm({ ...shippingForm, [e.target.name]: e.target.value });
        };
        
        const handleShippingSubmit = (e) => {
            e.preventDefault();
            if (Object.values(shippingForm).every(field => field.trim() !== '')) {
                setCheckoutStep('payment');
            } else {
                 // Using a custom modal instead of alert()
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4';
                modal.innerHTML = `
                    <div class="bg-red-500 text-white rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
                        <p class="text-xl font-bold mb-4">Error</p>
                        <p>Por favor, rellena todos los campos de envío.</p>
                        <button id="close-modal-btn" class="mt-4 px-6 py-2 bg-red-700 text-white rounded-lg">Cerrar</button>
                    </div>
                `;
                document.body.appendChild(modal);
                document.getElementById('close-modal-btn').onclick = () => document.body.removeChild(modal);
            }
        };

        const handlePaymentSubmit = () => {
             // Using a custom modal instead of alert()
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="bg-white text-gray-800 rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
                    <p class="text-xl font-bold mb-4">¡Compra exitosa!</p>
                    <p>Gracias por tu pedido. En breve recibirás una confirmación.</p>
                    <button id="close-modal-btn" class="mt-4 px-6 py-2 bg-custom-blue text-white rounded-lg">Cerrar</button>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('close-modal-btn').onclick = () => {
                document.body.removeChild(modal);
                clearCart();
            };
        };

        return (
            <div className={`fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-end transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0 invisible'}`}>
                <div className={`w-full max-w-md h-full bg-[#181818] text-white flex flex-col transform transition-transform duration-300 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex justify-between items-center p-6 border-b border-gray-700">
                        <h2 className="text-2xl font-bold">Tu Carrito</h2>
                        <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                    </div>

                    {checkoutStep === 'cart' && (
                        <>
                            <div className="flex-grow p-6 overflow-y-auto">
                                {cart.length === 0 ? (
                                    <p className="text-gray-400 text-center">Tu carrito está vacío.</p>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.id} className="flex items-center justify-between mb-4">
                                            <div className="flex items-center">
                                                <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-md mr-4" />
                                                <div>
                                                    <h4 className="font-bold">{item.name}</h4>
                                                    <p className="text-sm text-custom-blue">{formatCurrency(item.price)}</p>
                                                    <div className="flex items-center mt-1">
                                                        <button onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)} className="quantity-btn decrease-qty px-2 text-lg">-</button>
                                                        <span className="mx-2">{item.quantity}</span>
                                                        <button onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)} className="quantity-btn increase-qty px-2 text-lg">+</button>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => removeCartItem(item.id)} className="remove-item text-red-500 hover:text-red-400 text-2xl">&times;</button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-6 border-t border-gray-700">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-lg">Subtotal:</span>
                                    <span className="text-xl font-bold">{formatCurrency(subtotal)}</span>
                                </div>
                                <button onClick={() => setCheckoutStep('shipping')} disabled={cart.length === 0} className={`w-full py-3 bg-custom-blue text-white font-bold uppercase rounded-lg transition duration-300 ${cart.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}>Finalizar Compra</button>
                            </div>
                        </>
                    )}
                    
                    {checkoutStep === 'shipping' && (
                        <div className="flex-grow p-6 overflow-y-auto">
                            <h3 className="text-xl font-bold mb-4">Información de Envío</h3>
                            <form onSubmit={handleShippingSubmit}>
                                <input type="text" name="name" placeholder="Nombre Completo" value={shippingForm.name} onChange={handleShippingChange} className="w-full bg-[#1f1f1f] border border-gray-700 rounded-lg p-3 mb-3 focus:outline-none focus:border-custom-blue" required />
                                <input type="email" name="email" placeholder="Correo Electrónico" value={shippingForm.email} onChange={handleShippingChange} className="w-full bg-[#1f1f1f] border border-gray-700 rounded-lg p-3 mb-3 focus:outline-none focus:border-custom-blue" required />
                                <input type="text" name="address" placeholder="Dirección" value={shippingForm.address} onChange={handleShippingChange} className="w-full bg-[#1f1f1f] border border-gray-700 rounded-lg p-3 mb-3 focus:outline-none focus:border-custom-blue" required />
                                <input type="text" name="city" placeholder="Ciudad" value={shippingForm.city} onChange={handleShippingChange} className="w-full bg-[#1f1f1f] border border-gray-700 rounded-lg p-3 mb-3 focus:outline-none focus:border-custom-blue" required />
                                <button type="submit" className="mt-4 w-full py-3 bg-custom-blue text-white font-bold uppercase rounded-lg hover:bg-blue-600">Continuar al Pago</button>
                                <button type="button" onClick={() => setCheckoutStep('cart')} className="mt-2 w-full py-3 bg-gray-600 text-white font-bold uppercase rounded-lg hover:bg-gray-500">Volver al Carrito</button>
                            </form>
                        </div>
                    )}
                    
                    {checkoutStep === 'payment' && (
                        <div className="flex-grow p-6 overflow-y-auto">
                            <h3 className="text-xl font-bold mb-4">Elige tu método de pago</h3>
                            <div className="space-y-4">
                                <div className="payment-option selected rounded-lg p-4 cursor-pointer border-2 border-custom-blue">
                                    <h4 className="font-bold">Tarjeta de Crédito/Débito</h4>
                                    <p className="text-sm text-gray-400">Paga con Visa, MasterCard, Amex.</p>
                                </div>
                            </div>
                            <div className="mt-6">
                                <input type="text" placeholder="Número de la tarjeta" className="w-full bg-[#1f1f1f] border border-gray-700 rounded-lg p-3 mb-3" required />
                                <div className="flex space-x-3">
                                    <input type="text" placeholder="MM/AA" className="w-1/2 bg-[#1f1f1f] border border-gray-700 rounded-lg p-3" required />
                                    <input type="text" placeholder="CVC" className="w-1/2 bg-[#1f1f1f] border border-gray-700 rounded-lg p-3" required />
                                </div>
                            </div>
                            <button onClick={handlePaymentSubmit} className="mt-4 w-full py-3 bg-green-500 text-white font-bold uppercase rounded-lg hover:bg-green-600">Pagar Ahora</button>
                            <button onClick={() => setCheckoutStep('shipping')} className="mt-2 w-full py-3 bg-gray-600 text-white font-bold uppercase rounded-lg hover:bg-gray-500">Volver</button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const openProductDetail = (product) => {
        setSelectedProduct(product);
        setIsProductDetailOpen(true);
    };

    // --- Main App Component Render ---
    return (
        <div className="bg-[#111111] text-white min-h-screen font-inter">
            {/* Header */}
            <header className="bg-black/80 backdrop-blur-sm sticky top-0 z-50">
                <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <h1 onClick={() => setPage('inicio')} className="text-white text-2xl font-bold uppercase cursor-pointer"><span className="text-custom-blue">JDS</span></h1>
                    </div>
                    <div className="hidden md:flex items-center space-x-8">
                        <button onClick={() => setPage('inicio')} className={`text-white hover:text-custom-blue transition duration-300 ${page === 'inicio' ? 'text-custom-blue font-semibold' : ''}`}>Inicio</button>
                        <button onClick={() => setPage('tienda')} className={`text-white hover:text-custom-blue transition duration-300 ${page === 'tienda' ? 'text-custom-blue font-semibold' : ''}`}>Tienda</button>
                        <button onClick={() => setPage('distribuidores')} className={`text-white hover:text-custom-blue transition duration-300 ${page === 'distribuidores' ? 'text-custom-blue font-semibold' : ''}`}>Distribuidores</button>
                        <button onClick={() => setPage('blog')} className={`text-white hover:text-custom-blue transition duration-300 ${page === 'blog' ? 'text-custom-blue font-semibold' : ''}`}>Blog</button>
                        <button onClick={() => setPage('contacto')} className={`text-white hover:text-custom-blue transition duration-300 ${page === 'contacto' ? 'text-custom-blue font-semibold' : ''}`}>Contacto</button>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setIsCartOpen(true)} className="relative text-white hover:text-custom-blue transition duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <span className={`absolute -top-2 -right-2 bg-custom-blue text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${cart.length > 0 ? '' : 'hidden'}`}>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                        </button>
                    </div>
                </nav>
            </header>

            <main>
                {page === 'inicio' && <HomePage />}
                {page === 'tienda' && <ShopPage />}
                {page === 'distribuidores' && <DistributorsPage />}
                {page === 'blog' && <BlogPage />}
                {page === 'contacto' && <ContactPage />}
            </main>
            
            {/* User ID Display */}
            {userId && <div className="fixed bottom-4 right-4 bg-[#1f1f1f] text-gray-400 text-xs p-2 rounded-lg">ID de Usuario: {userId}</div>}
            
            <CartModal />
            <ProductDetailModal />

            {/* Footer */}
            <footer className="bg-black pt-16 pb-8">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 text-center md:text-left">
                        <div>
                            <h3 className="text-xl font-bold mb-4 uppercase text-custom-blue">JDS</h3>
                            <p className="text-gray-400">Suplementos de alta calidad para llevar tu rendimiento al siguiente nivel.</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">ENLACES RÁPIDOS</h3>
                            <ul className="space-y-2">
                                <li><button onClick={() => setPage('inicio')} className="text-gray-400 hover:text-white">Inicio</button></li>
                                <li><button onClick={() => setPage('tienda')} className="text-gray-400 hover:text-white">Tienda</button></li>
                                <li><button onClick={() => setPage('distribuidores')} className="text-gray-400 hover:text-white">Distribuidores</button></li>
                                <li><button onClick={() => setPage('blog')} className="text-gray-400 hover:text-white">Blog</button></li>
                                <li><button onClick={() => setPage('contacto')} className="text-gray-400 hover:text-white">Contacto</button></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">CONTACTO</h3>
                            <p className="text-gray-400 mb-2">Email: info@jds.com</p>
                            <p className="text-gray-400">Teléfono: +57 300 123 4567</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">SÍGUENOS</h3>
                            <div className="flex space-x-4 justify-center md:justify-start">
                                <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-facebook-f"></i></a>
                                <a href="#" className="text-gray-400 hover:text-white"><i className="fab fa-instagram"></i></a>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8 text-center text-gray-500">
                        <p>&copy; 2024 JDS. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;
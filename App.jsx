import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, query, where, orderBy, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- CONFIGURATION FIREBASE ---
// ATTENTION : Remplacez ces valeurs par les clés de votre propre projet Firebase.
// Ces variables globales sont fournies par l'environnement Canvas.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_AUTH_DOMAIN",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_STORAGE_BUCKET",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId: "VOTRE_APP_ID"
};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-arited-cms';

// Initialisation de Firebase
let app, db, auth;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error("Erreur lors de l'initialisation de Firebase:", error);
}

// Fonction utilitaire pour gérer l'authentification et l'UID de l'utilisateur
const useAuthAndDb = () => {
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (!auth) return;

    // 1. Authentification Initiale
    const authenticate = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Erreur d'authentification initiale:", e);
      }
    };
    authenticate();

    // 2. Écouter les changements d'état d'authentification
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  return { db, auth, userId, isAuthReady };
};

// --- COMPOSANT BARRE DE PROGRESSION ---
const ProgressBar = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-2.5 my-2">
    <div
      className="h-2.5 rounded-full transition-all duration-500 ease-in-out bg-blue-600"
      style={{ width: `${progress}%` }}
    ></div>
  </div>
);

// --- COMPOSANT FORMULAIRE DE CRÉATION/ÉDITION DE CONTENU ---
const ContentForm = ({ type, siteId, db, userId, onContentAdded }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState(0); // Utilisé seulement pour 'project'
  const [isSaving, setIsSaving] = useState(false);

  const isProject = type === 'project';
  const collectionPath = `/artifacts/${appId}/public/data/${type}s`;
  const typeName = type === 'news' ? 'Actualité' : type === 'project' ? 'Projet' : 'Page';

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!db || !userId) {
      console.error("Erreur: La base de données ou l'utilisateur n'est pas prêt.");
      return;
    }
    if (!title || !content) {
      // Remplacé alert() par console.log pour éviter les popups non gérés dans l'iFrame
      console.log("Le titre et le contenu sont requis.");
      return;
    }

    setIsSaving(true);

    const newContent = {
      title,
      content,
      type,
      siteId,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
    };

    if (isProject) {
      newContent.progress = Math.min(100, Math.max(0, parseInt(progress) || 0));
    }

    try {
      await addDoc(collection(db, collectionPath), newContent);
      setTitle('');
      setContent('');
      setProgress(0);
      console.log(`Le nouveau(elle) ${typeName} a été publié(e) !`);
      if (onContentAdded) onContentAdded();
    } catch (error) {
      console.error("Erreur lors de la publication du contenu:", error);
      console.log("Erreur lors de la publication.");
    } finally {
      setIsSaving(false);
    }
  }, [title, content, type, siteId, db, userId, progress, onContentAdded, collectionPath, isProject, typeName]);

  return (
    <div className="p-6 bg-white shadow-xl rounded-xl">
      <h2 className="text-2xl font-semibold mb-4 text-blue-800">
        Publier un(e) nouveau(elle) {typeName}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={`Titre de l'${type}`}
            required
          />
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">Contenu</label>
          <textarea
            id="content"
            rows="5"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={`Texte détaillé de l'${type}`}
            required
          />
        </div>
        {isProject && (
          <div>
            <label htmlFor="progress" className="block text-sm font-medium text-gray-700">Avancement (%)</label>
            <input
              id="progress"
              type="number"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <ProgressBar progress={progress} />
          </div>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSaving ? 'Publication...' : 'Publier'}
        </button>
      </form>
    </div>
  );
};

// --- COMPOSANT LISTE DE CONTENU (Affichage des articles) ---
const ContentList = ({ type, siteId, db, userId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const collectionPath = `/artifacts/${appId}/public/data/${type}s`;

  useEffect(() => {
    if (!db) return;

    // Requête pour les articles de ce type et ce site, triés par date de création (desc)
    const q = query(
      collection(db, collectionPath),
      where("siteId", "==", siteId),
      orderBy("createdAt", "desc")
    );

    // Écouteur en temps réel
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setItems(fetchedItems);
      setLoading(false);
    }, (error) => {
      console.error("Erreur de récupération des données:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, siteId, collectionPath]);

  const handleDelete = useCallback(async (id) => {
    // Remplacé window.confirm par console.log pour éviter les popups
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) return;
    try {
      await deleteDoc(doc(db, collectionPath, id));
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      console.log("Erreur lors de la suppression.");
    }
  }, [db, collectionPath]);

  const isProject = type === 'project';
  const typeName = type === 'news' ? 'Actualité' : type === 'project' ? 'Projet' : 'Page';
  const typeNamePlural = type === 'news' ? 'Actualités' : type === 'project' ? 'Projets' : 'Pages';


  if (loading) return <p>Chargement des {typeNamePlural}...</p>;
  if (items.length === 0) return <p className="text-gray-500">Aucun(e) {typeName.toLowerCase()} publié(e) pour ce site.</p>;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold border-b pb-2 text-blue-700">Liste des {typeNamePlural} ({items.length})</h3>
      {items.map(item => (
        <div key={item.id} className="p-4 border rounded-lg bg-gray-50 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-lg text-gray-900 truncate">{item.title}</h4>
              <p className="text-sm text-gray-500 mt-1">Publié le {item.createdAt ? item.createdAt.toLocaleDateString() : 'N/A'}</p>
            </div>
            <button
              onClick={() => handleDelete(item.id)}
              className="ml-4 p-2 text-red-600 hover:text-red-800 bg-red-100 rounded-full transition duration-150"
              aria-label={`Supprimer ${item.title}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 102 0v6a1 1 0 10-2 0V8z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <p className="text-gray-700 mt-2 line-clamp-2">{item.content}</p>
          {isProject && (
            <div className="mt-3">
              <span className="text-sm font-medium text-gray-700">Avancement : {item.progress}%</span>
              <ProgressBar progress={item.progress} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// --- COMPOSANT ADMIN : GESTION DES DEMANDES DE SERVICES ---
const ServiceRequestsAdmin = ({ siteId, db, userId }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const collectionPath = `/artifacts/${appId}/public/data/requests`;

  useEffect(() => {
    if (!db) return;

    // Requête pour les demandes de ce site, triées par date (les plus récentes en premier)
    const q = query(
      collection(db, collectionPath),
      where("siteId", "==", siteId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setRequests(fetchedRequests);
      setLoading(false);
    }, (error) => {
      console.error("Erreur de récupération des demandes:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, siteId, collectionPath]);

  const updateRequestStatus = useCallback(async (id, newStatus) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, collectionPath, id), { status: newStatus, handledBy: userId, handledAt: new Date() });
    } catch (error) {
      console.error("Erreur de mise à jour du statut:", error);
    }
  }, [db, collectionPath, userId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Nouveau': return 'bg-red-100 text-red-800';
      case 'En Cours': return 'bg-yellow-100 text-yellow-800';
      case 'Traité': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <p className="p-6">Chargement des demandes...</p>;

  return (
    <div className="p-6 bg-white shadow-xl rounded-xl">
      <h2 className="text-2xl font-semibold mb-6 text-blue-800 border-b pb-2">Gestion des Demandes de Services ({siteId})</h2>
      {requests.length === 0 ? (
        <p className="text-gray-500">Aucune demande soumise pour l'instant.</p>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="p-4 border rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="flex-1 min-w-0 pr-4 space-y-1">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getStatusColor(req.status)}`}>
                  {req.status}
                </span>
                <h4 className="font-bold text-lg text-gray-900">{req.serviceType} de la part de {req.name}</h4>
                <p className="text-sm text-gray-700 line-clamp-3">{req.description}</p>
                <p className="text-xs text-gray-500">Contact: {req.email}</p>
                <p className="text-xs text-gray-500">Soumis le: {req.createdAt ? req.createdAt.toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="mt-3 md:mt-0 flex-shrink-0">
                {req.status === 'Nouveau' && (
                  <button
                    onClick={() => updateRequestStatus(req.id, 'En Cours')}
                    className="py-1.5 px-3 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition"
                  >
                    Prendre en Charge
                  </button>
                )}
                {req.status === 'En Cours' && (
                  <button
                    onClick={() => updateRequestStatus(req.id, 'Traité')}
                    className="py-1.5 px-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition"
                  >
                    Passer à Traité
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- COMPOSANT VUE ADMINISTRATEUR ---
const AdminView = ({ siteId, db, userId }) => {
  const [activeTab, setActiveTab] = useState('requests'); // requests, news, projects, pages

  const renderContentManager = () => {
    switch (activeTab) {
      case 'news':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ContentForm type="news" siteId={siteId} db={db} userId={userId} />
            <ContentList type="news" siteId={siteId} db={db} userId={userId} />
          </div>
        );
      case 'projects':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ContentForm type="project" siteId={siteId} db={db} userId={userId} />
            <ContentList type="project" siteId={siteId} db={db} userId={userId} />
          </div>
        );
      case 'pages':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ContentForm type="page" siteId={siteId} db={db} userId={userId} />
            <ContentList type="page" siteId={siteId} db={db} userId={userId} />
          </div>
        );
      case 'requests':
      default:
        return <ServiceRequestsAdmin siteId={siteId} db={db} userId={userId} />;
    }
  };

  const tabs = [
    { id: 'requests', name: 'Demandes de Services' },
    { id: 'news', name: 'Actualités' },
    { id: 'projects', name: 'Projets' },
    { id: 'pages', name: 'Pages Statiques' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-blue-800">Tableau de Bord Admin</h1>
        <p className="text-gray-600 mt-2">Gestion du contenu pour le site ID: <span className="font-mono bg-gray-200 px-2 py-1 rounded-md">{siteId}</span></p>
      </header>

      {/* Navigation des Onglets */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition duration-150
              `}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <main>
        {renderContentManager()}
      </main>
    </div>
  );
};

// --- COMPOSANT FORMULAIRE DE DEMANDE DE SERVICES (FRONT-OFFICE) ---
const ServiceRequestForm = ({ siteId, db, userId }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [serviceType, setServiceType] = useState('Rendez-vous');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const collectionPath = `/artifacts/${appId}/public/data/requests`;

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!db || !name || !email || !description) return;

    setIsSaving(true);
    setMessage(null);

    const newRequest = {
      name,
      email,
      serviceType,
      description,
      siteId,
      status: 'Nouveau', // Statut initial
      createdAt: new Date(),
      userId: userId || 'public' // Utilisateur public si non authentifié
    };

    try {
      await addDoc(collection(db, collectionPath), newRequest);
      setMessage({ type: 'success', text: "Votre demande a été soumise avec succès ! Nous vous recontacterons bientôt." });
      setName('');
      setEmail('');
      setDescription('');
    } catch (error) {
      console.error("Erreur lors de la soumission de la demande:", error);
      setMessage({ type: 'error', text: "Erreur lors de la soumission de la demande. Veuillez réessayer." });
    } finally {
      setIsSaving(false);
    }
  }, [name, email, serviceType, description, siteId, db, userId, collectionPath]);

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow-2xl rounded-xl">
      <h2 className="text-3xl font-bold mb-4 text-blue-800">Demande de Services</h2>
      <p className="text-gray-600 mb-6">Veuillez remplir ce formulaire pour une demande de rendez-vous ou un signalement.</p>

      {message && (
        <div className={`p-4 mb-4 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom Complet</label>
          <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div>
          <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700">Type de Service</label>
          <select id="serviceType" value={serviceType} onChange={(e) => setServiceType(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500">
            <option>Rendez-vous</option>
            <option>Signalement / Problème</option>
            <option>Autre Demande</option>
          </select>
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description Détaillée</label>
          <textarea id="description" rows="4" value={description} onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <button type="submit" disabled={isSaving}
          className="w-full py-3 px-4 border border-transparent rounded-md shadow-lg text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition duration-150 disabled:opacity-50"
        >
          {isSaving ? 'Envoi en cours...' : 'Soumettre la Demande'}
        </button>
      </form>
    </div>
  );
};

// --- COMPOSANT VUE PUBLIQUE (FRONT-OFFICE) ---
const PublicView = ({ siteId, db, userId, onNavigate }) => {
  const [content, setContent] = useState({ news: [], projects: [], pages: [] });
  const [loading, setLoading] = useState(true);

  // Fonction pour charger un type de contenu
  const fetchContent = useCallback(async (type) => {
    if (!db) return;
    const collectionPath = `/artifacts/${appId}/public/data/${type}s`;
    const q = query(
      collection(db, collectionPath),
      where("siteId", "==", siteId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setContent(prev => ({ ...prev, [type]: fetchedItems }));
      setLoading(false);
    }, (error) => {
      console.error(`Erreur de récupération des ${type}:`, error);
      setLoading(false);
    });

    return unsubscribe;
  }, [db, siteId]);

  useEffect(() => {
    if (db) {
      const unsubNews = fetchContent('news');
      const unsubProjects = fetchContent('project');
      const unsubPages = fetchContent('page');
      return () => {
        unsubNews.then(u => u());
        unsubProjects.then(u => u());
        unsubPages.then(u => u());
      };
    }
  }, [db, fetchContent]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-blue-600">Chargement du contenu...</p>
      </div>
    );
  }

  const PageCard = ({ title, content }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full flex flex-col">
      <h3 className="text-xl font-bold text-blue-700 mb-3">{title}</h3>
      <p className="text-gray-600 flex-1 line-clamp-3">{content}</p>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700">Page Statique</span>
      </div>
    </div>
  );

  const ProjectCard = ({ title, content, progress }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 line-clamp-2">{content}</p>
      <span className="text-sm font-medium text-gray-700">Avancement : {progress}%</span>
      <ProgressBar progress={progress} />
    </div>
  );

  const NewsCard = ({ title, content }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 line-clamp-3">{content}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header / Navigation */}
      <header className="bg-blue-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          {/* Logo ARITED (Placeholder pour image externe) */}
          <div className="flex items-center space-x-2">
            <img
              // REMPLACER CETTE URL PAR L'URL DU VÉRITABLE LOGO ARITED
              src="https://placehold.co/400x100/1e40af/ffffff?text=ARITED+Logo"
              alt="Logo ARITED"
              className="h-10 w-auto"
            />
            <span className="text-xl font-medium text-blue-200 hidden sm:block">| Site {siteId}</span>
          </div>

          <button
            onClick={() => onNavigate('admin')}
            className="px-4 py-2 bg-white text-blue-800 font-semibold rounded-lg shadow-md hover:bg-gray-100 transition duration-150"
          >
            Aller à l'Admin
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-16">

        {/* Section Projets en Cours */}
        <section>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-8 border-b-4 border-blue-500 pb-2">Nos Projets en Cours</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {content.projects.length > 0 ? (
              content.projects.map(p => (
                <ProjectCard key={p.id} title={p.title} content={p.content} progress={p.progress || 0} />
              ))
            ) : (
              <p className="col-span-3 text-gray-500">Aucun projet en cours n'a été publié pour l'instant.</p>
            )}
          </div>
        </section>

        {/* Section Actualités Récentes et Pages Statiques */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Section Actualités */}
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-6 border-b-2 border-blue-500 pb-1">Actualités Récentes</h2>
            <div className="space-y-6">
              {content.news.length > 0 ? (
                content.news.map(n => (
                  <NewsCard key={n.id} title={n.title} content={n.content} />
                ))
              ) : (
                <p className="text-gray-500">Aucune actualité récente à afficher.</p>
              )}
            </div>
          </div>

          {/* Section Pages Statiques */}
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-6 border-b-2 border-blue-500 pb-1">Pages Clés</h2>
            <div className="space-y-6">
              {content.pages.length > 0 ? (
                content.pages.slice(0, 3).map(pg => (
                  <PageCard key={pg.id} title={pg.title} content={pg.content} />
                ))
              ) : (
                <p className="text-gray-500">Aucune page statique publiée.</p>
              )}
            </div>
          </div>
        </section>

        {/* Section Formulaire de Contact/Demande */}
        <section>
          <ServiceRequestForm siteId={siteId} db={db} userId={userId} />
        </section>
      </main>

      <footer className="bg-gray-800 text-white p-6 text-center mt-12">
        <p>© {new Date().getFullYear()} ARITED E-CMS. Développé par Rafael Azevedo.</p>
        <p className="text-sm mt-1 text-gray-400">ID Utilisateur Actuel: <span className="font-mono">{userId || 'Public/Non-authentifié'}</span></p>
      </footer>
    </div>
  );
};

// --- COMPOSANT PRINCIPAL APP ---
const App = () => {
  const [view, setView] = useState('public'); // 'public' ou 'admin'
  const { db, userId, isAuthReady } = useAuthAndDb();

  // Récupérer le siteId depuis l'URL (paramètre ?siteId=...)
  const getSiteIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('siteId') || 'demo-site'; // Valeur par défaut si non spécifié
  };
  const siteId = getSiteIdFromUrl();

  const handleNavigate = (newView) => {
    setView(newView);
    // Optionnel: mettre à jour l'historique du navigateur
    window.history.pushState(null, '', `?siteId=${siteId}&view=${newView}`);
  };

  // Logique pour basculer la vue si on clique sur les boutons de navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view');
    if (urlView && (urlView === 'public' || urlView === 'admin')) {
      setView(urlView);
    }
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-blue-600">Initialisation du système...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {view === 'public' ? (
        <PublicView siteId={siteId} db={db} userId={userId} onNavigate={handleNavigate} />
      ) : (
        <AdminView siteId={siteId} db={db} userId={userId} />
      )}
      {/* Bouton de retour à la vue publique pour l'Admin */}
      {view === 'admin' && (
        <button
          onClick={() => handleNavigate('public')}
          className="fixed bottom-4 right-4 p-3 bg-red-600 text-white font-semibold rounded-full shadow-lg hover:bg-red-700 transition duration-150 z-50"
          aria-label="Retour au site public"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default App;

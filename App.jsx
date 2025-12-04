import React, { useState, useEffect, useCallback } from 'react';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

// --- Configuration et Utilitaires Firebase (À PERSONNALISER LORS DU DÉPLOIEMENT) ---
// Ces variables sont lues depuis l'environnement de la plateforme. 
// Pour un lancement local/GitHub, vous DEVEZ les remplacer par vos propres clés (voir README.md)
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Définition des Couleurs du Thème ARITED ---
// Utilisez les classes Tailwind pour le style
const ARITED_COLORS = {
  primary: 'bg-blue-800',
  primaryText: 'text-blue-800',
  secondary: 'bg-emerald-500',
  secondaryText: 'text-emerald-500',
  accent: 'bg-indigo-600',
  background: 'bg-gray-50',
  card: 'bg-white',
  textDark: 'text-gray-800',
  textLight: 'text-white',
};

// --- Composant d'Icône (pour la lisibilité) ---
const Icon = ({ name, className = "w-6 h-6", fill = "none" }) => {
  const icons = {
    Home: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    Users: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    Settings: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.2a2 2 0 0 1-1.42 1.42l-.2.08a2 2 0 0 0-1.84 1.84l-.08.2a2 2 0 0 1-1.42 1.42v.44a2 2 0 0 0 2 2h.2a2 2 0 0 1 1.42 1.42l.08.2a2 2 0 0 0 1.84 1.84l.2.08a2 2 0 0 1 1.42 1.42v.44a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1.42-1.42l.2-.08a2 2 0 0 0 1.84-1.84l.08-.2a2 2 0 0 1 1.42-1.42v-.44a2 2 0 0 0-2-2h-.2a2 2 0 0 1-1.42-1.42l-.08-.2a2 2 0 0 0-1.84-1.84l-.2-.08a2 2 0 0 1-1.42-1.42V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
    Globe: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>,
    Zap: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    Calendar: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>,
    CheckCircle: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.6-8.97"/><path d="M12 2v4"/><path d="m10 12 2 2 4-4"/></svg>,
    Clipboard: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>,
    Newspaper: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12"/><path d="M10 6h8"/><path d="M10 10h8"/><path d="M10 14h8"/><path d="M10 18h8"/><path d="M6 6h2"/><path d="M6 10h2"/><path d="M6 14h2"/><path d="M6 18h2"/></svg>,
    Layers: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.17 4.17 4.17-10 10-4.17-4.17zm.34 8.24c-.05.17-.1.35-.16.53"/><path d="M14 14c-.06.18-.12.35-.19.53"/><path d="M16 16c-.07.18-.14.35-.22.53"/><path d="M18 18c-.09.18-.18.35-.27.53"/><path d="M20 20c-.1.18-.2.35-.3.53"/><path d="M22 22c-.11.18-.23.35-.35.53"/><path d="M9 14.5l5.5-5.5"/><path d="M12 21.5l2-2 4-4 2-2"/></svg>,
    MessageCircle: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    Mail: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 7L2 7"/></svg>,
  };
  const SelectedIcon = icons[name];
  return SelectedIcon ? <SelectedIcon className={className} /> : <div className={className}>?</div>;
};

// --- Composant d'Affichage de Message (pour remplacer alert()) ---
const MessageModal = ({ message, type, onClose }) => {
  if (!message) return null;
  
  const typeClasses = {
    error: 'bg-red-100 border-red-400 text-red-700',
    success: 'bg-emerald-100 border-emerald-400 text-emerald-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700',
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className={`max-w-sm w-full border-l-4 p-4 rounded-lg shadow-xl ${typeClasses[type]}`}>
        <p className="font-bold mb-2">{type === 'success' ? 'Succès' : type === 'error' ? 'Erreur' : 'Information'}</p>
        <p className="text-sm">{message}</p>
        <button
          onClick={onClose}
          className={`mt-3 px-3 py-1 text-sm rounded-md font-medium transition duration-150 ${type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

// --- Formulaire d'Ajout/Modification de Contenu/Actualité/Projet ---
const ContentForm = ({ db, userId, siteId, type, onSave }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [advancement, setAdvancement] = useState(0); // Pour les projets
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !body || !db || !userId) {
      setMessage({ text: 'Le titre et le corps ne peuvent pas être vides.', type: 'error' });
      return;
    }

    const contentData = {
      siteId,
      type, // 'page', 'news', ou 'project'
      title,
      body,
      advancement: type === 'project' ? parseInt(advancement, 10) : undefined,
      timestamp: serverTimestamp(),
      authorId: userId,
    };

    try {
      // Stockage dans la collection publique pour être partagé sur le site
      const path = `/artifacts/${appId}/public/data/cms_content`;
      await addDoc(collection(db, path), contentData);
      
      setMessage({ text: `${title} a été ajouté(e) avec succès !`, type: 'success' });
      setTitle('');
      setBody('');
      setAdvancement(0);
      if (onSave) onSave(); // Fermer le modal ou recharger la liste
    } catch (error) {
      console.error("Erreur lors de l'ajout du contenu:", error);
      setMessage({ text: `Erreur d'enregistrement: ${error.message}`, type: 'error' });
    }
  };

  const isProject = type === 'project';
  const label = type === 'page' ? 'Page de Contenu' : type === 'news' ? 'Nouvelle / Actualité' : 'Projet';

  return (
    <div className={`${ARITED_COLORS.card} p-6 rounded-xl shadow-lg`}>
      <h2 className={`text-2xl font-bold mb-6 ${ARITED_COLORS.primaryText}`}>Créer une nouvelle {label}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${ARITED_COLORS.textDark}`}>Titre</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${ARITED_COLORS.textDark}`}>Contenu (Corps du texte)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows="6"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {isProject && (
          <div>
            <label className={`block text-sm font-medium mb-1 ${ARITED_COLORS.textDark}`}>Avancement (%)</label>
            <input
              type="number"
              value={advancement}
              onChange={(e) => setAdvancement(Math.min(100, Math.max(0, parseInt(e.target.value, 10))))}
              min="0"
              max="100"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
             <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div 
                    className={`${ARITED_COLORS.secondary} h-2.5 rounded-full transition-all duration-500`} 
                    style={{ width: `${advancement}%` }}
                ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">Avancement actuel: {advancement}%</p>
          </div>
        )}

        <button
          type="submit"
          className={`w-full py-2 px-4 rounded-lg font-semibold ${ARITED_COLORS.accent} ${ARITED_COLORS.textLight} hover:bg-indigo-700 transition duration-150 shadow-md`}
        >
          Publier la {label}
        </button>
      </form>
      <MessageModal message={message?.text} type={message?.type} onClose={() => setMessage(null)} />
    </div>
  );
};


// --- Formulaire de Demande de Service (Front-Office) ---
const ServiceRequestForm = ({ db, siteId }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [type, setType] = useState('rendez-vous'); // 'rendez-vous' ou 'signalement'
    const [details, setDetails] = useState('');
    const [message, setMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !email || !details || !db) {
            setMessage({ text: 'Veuillez remplir tous les champs requis.', type: 'error' });
            return;
        }

        const requestData = {
            siteId,
            type,
            name,
            email,
            details,
            status: 'Nouveau', // Statut initial
            timestamp: serverTimestamp(),
        };

        try {
            const path = `/artifacts/${appId}/public/data/service_requests`;
            await addDoc(collection(db, path), requestData);
            
            setMessage({ text: `Votre demande a été envoyée avec succès ! Nous vous recontacterons bientôt.`, type: 'success' });
            setName('');
            setEmail('');
            setDetails('');
        } catch (error) {
            console.error("Erreur lors de l'envoi de la demande:", error);
            setMessage({ text: `Erreur d'envoi: ${error.message}`, type: 'error' });
        }
    };

    return (
        <div className={`p-8 rounded-xl shadow-2xl ${ARITED_COLORS.card}`}>
            <h2 className={`text-3xl font-bold mb-6 ${ARITED_COLORS.primaryText}`}>Demande de Services</h2>
            <p className="mb-6 text-gray-600">Prenez rendez-vous ou signalez un problème directement à notre équipe.</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Sélecteur de Type de Demande */}
                <div>
                    <label className={`block text-sm font-medium mb-1 ${ARITED_COLORS.textDark}`}>Type de Demande</label>
                    <div className="flex space-x-4">
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                name="type"
                                value="rendez-vous"
                                checked={type === 'rendez-vous'}
                                onChange={() => setType('rendez-vous')}
                                className={`${ARITED_COLORS.primaryText} focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                            />
                            <span className="ml-2 text-gray-700">Prise de Rendez-vous</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input
                                type="radio"
                                name="type"
                                value="signalement"
                                checked={type === 'signalement'}
                                onChange={() => setType('signalement')}
                                className={`${ARITED_COLORS.primaryText} focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                            />
                            <span className="ml-2 text-gray-700">Signalement / Problème</span>
                        </label>
                    </div>
                </div>

                {/* Nom et Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${ARITED_COLORS.textDark}`}>Nom Complet</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${ARITED_COLORS.textDark}`}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                </div>

                {/* Détails */}
                <div>
                    <label className={`block text-sm font-medium mb-1 ${ARITED_COLORS.textDark}`}>Détails de la Demande</label>
                    <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        rows="4"
                        placeholder={type === 'rendez-vous' ? 'Date souhaitée, sujet du rendez-vous...' : 'Décrivez le problème rencontré...'}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className={`w-full py-3 px-4 rounded-lg font-semibold ${ARITED_COLORS.secondary} ${ARITED_COLORS.textLight} hover:bg-emerald-600 transition duration-150 shadow-lg`}
                >
                    Envoyer la Demande
                </button>
            </form>
            <MessageModal message={message?.text} type={message?.type} onClose={() => setMessage(null)} />
        </div>
    );
};


// Affichage d'une barre de progression pour la transparence
const ProjectCard = ({ project }) => (
    <div className={`p-5 rounded-xl shadow-lg ${ARITED_COLORS.card}`}>
        <div className="flex justify-between items-start mb-3">
            <h3 className={`text-xl font-bold ${ARITED_COLORS.primaryText}`}>{project.title}</h3>
            <span className={`text-sm font-semibold p-1.5 rounded-full ${ARITED_COLORS.secondary} ${ARITED_COLORS.textLight}`}>{project.advancement}%</span>
        </div>
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{project.body}</p>
        
        {/* Barre de progression */}
        <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
                className={`${ARITED_COLORS.secondary} h-3 rounded-full transition-all duration-500`} 
                style={{ width: `${project.advancement}%` }}
                aria-valuenow={project.advancement}
                aria-valuemin="0"
                aria-valuemax="100"
            ></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Avancement du projet</p>
    </div>
);

// Affichage des Actualités
const NewsItem = ({ item }) => (
    <div className="border-b border-gray-200 pb-4 mb-4">
        <h4 className={`text-lg font-semibold ${ARITED_COLORS.accent}`}>{item.title}</h4>
        <p className="text-sm text-gray-500 mb-2">Publié le {new Date(item.timestamp).toLocaleDateString()}</p>
        <p className="text-gray-700 line-clamp-2">{item.body}</p>
        <a href="#" className={`text-sm font-medium ${ARITED_COLORS.primaryText} hover:underline`}>Lire la suite</a>
    </div>
);


// Vue Principale du Site Vitrine
const FrontendView = ({ siteId, db, content, news, projects }) => (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="text-center mb-16">
            <p className={`${ARITED_COLORS.secondaryText} font-semibold uppercase tracking-wider mb-3`}>
                Bienvenue sur l'espace {siteId.toUpperCase()}
            </p>
            <h1 className={`${ARITED_COLORS.textDark} text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4`}>
                Recherche, Innovation et Technologie pour le Développement
            </h1>
        </div>

        {/* Section 1: Transparence & Projets */}
        <section className="mb-16">
            <h2 className={`text-3xl font-bold mb-8 text-center ${ARITED_COLORS.primaryText}`}>
                <Icon name="Layers" className="w-8 h-8 inline-block mr-2" />
                Transparence & Projets en Cours
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {projects.length > 0 ? (
                    projects.map(p => <ProjectCard key={p.id} project={p} />)
                ) : (
                    <p className="col-span-3 text-center text-gray-500 italic">Aucun projet en cours pour ce site.</p>
                )}
            </div>
        </section>

        {/* Section 2: Actualités */}
        <section className="mb-16">
            <h2 className={`text-3xl font-bold mb-8 text-center ${ARITED_COLORS.primaryText}`}>
                <Icon name="Newspaper" className="w-8 h-8 inline-block mr-2" />
                Dernières Actualités
            </h2>
            <div className="max-w-4xl mx-auto">
                {news.length > 0 ? (
                    news.slice(0, 5).map(n => <NewsItem key={n.id} item={n} />)
                ) : (
                    <p className="text-center text-gray-500 italic">Aucune actualité récente pour ce site.</p>
                )}
            </div>
        </section>
        
        {/* Section 3: Services et Contact */}
        <section className="mb-16">
            <div className="max-w-3xl mx-auto">
                <ServiceRequestForm db={db} siteId={siteId} />
            </div>
        </section>

        {/* Section 4: Contenu Statique (Pages) */}
        <section>
             <h2 className={`text-3xl font-bold mb-8 text-center ${ARITED_COLORS.primaryText}`}>
                <Icon name="Clipboard" className="w-8 h-8 inline-block mr-2" />
                Pages Clés
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {content.length > 0 ? (
                    content.map(p => (
                        <div key={p.id} className={`${ARITED_COLORS.card} p-5 rounded-xl shadow-md`}>
                            <h3 className={`text-xl font-bold mb-2 ${ARITED_COLORS.accent}`}>{p.title}</h3>
                            <p className="text-gray-600 text-sm line-clamp-3">{p.body}</p>
                             <a href="#" className={`mt-2 inline-block text-sm font-medium ${ARITED_COLORS.secondaryText} hover:underline`}>Détails</a>
                        </div>
                    ))
                ) : (
                    <p className="col-span-3 text-center text-gray-500 italic">Aucune page de contenu définie.</p>
                )}
            </div>
        </section>

    </main>
);

// --- Composants Admin (Back-Office) ---

// Liste des Demandes de Service
const RequestsList = ({ db, requests }) => {
    const handleStatusUpdate = async (id, currentStatus) => {
        const newStatus = currentStatus === 'Nouveau' ? 'En Cours' : 'Traité';
        if (!db) return;

        try {
            const path = `/artifacts/${appId}/public/data/service_requests`;
            const requestRef = doc(db, path, id);
            await updateDoc(requestRef, {
                status: newStatus,
            });
            console.log(`Statut de la demande ${id} mis à jour à ${newStatus}`);
        } catch (error) {
            console.error("Erreur de mise à jour du statut:", error);
        }
    };

    const getStatusClasses = (status) => {
        switch (status) {
            case 'Nouveau': return 'bg-yellow-100 text-yellow-800';
            case 'En Cours': return 'bg-blue-100 text-blue-800';
            case 'Traité': return 'bg-emerald-100 text-emerald-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-4">
            {requests.length > 0 ? (
                requests.map(req => (
                    <div key={req.id} className={`p-4 rounded-xl shadow-md ${ARITED_COLORS.card} flex justify-between items-center transition duration-150`}>
                        <div className="flex-grow">
                            <div className="flex items-center space-x-3 mb-1">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${getStatusClasses(req.status)}`}>
                                    {req.status}
                                </span>
                                <span className={`text-sm font-medium ${ARITED_COLORS.accent}`}>{req.type === 'rendez-vous' ? 'Rendez-vous' : 'Signalement'}</span>
                            </div>
                            <p className="font-bold text-gray-800">{req.name} ({req.email})</p>
                            <p className="text-sm text-gray-600 italic mt-1 line-clamp-2">{req.details}</p>
                            <p className="text-xs text-gray-400 mt-2">Reçu le {new Date(req.timestamp).toLocaleDateString()}</p>
                        </div>
                        <button
                            onClick={() => handleStatusUpdate(req.id, req.status)}
                            disabled={req.status === 'Traité'}
                            className={`ml-4 py-1.5 px-3 text-sm rounded-lg font-medium transition duration-150 ${
                                req.status === 'Traité' ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : `${ARITED_COLORS.primary} ${ARITED_COLORS.textLight} hover:bg-blue-700`
                            }`}
                        >
                            {req.status === 'Traité' ? 'Traité' : (req.status === 'En Cours' ? 'Passer à Traité' : 'Prendre en Charge')}
                        </button>
                    </div>
                ))
            ) : (
                <div className="p-6 bg-white rounded-xl shadow-inner text-center text-gray-500 italic">
                    Aucune demande de service ou de rendez-vous pour ce site.
                </div>
            )}
        </div>
    );
};

// Liste des Contenus (Actualités, Projets, Pages)
const ContentList = ({ contentList, type }) => {
    const label = type === 'page' ? 'Pages' : type === 'news' ? 'Actualités' : 'Projets';
    return (
        <div className="space-y-4">
             {contentList.length > 0 ? (
                contentList.map(item => (
                    <div key={item.id} className={`p-4 rounded-xl shadow-md ${ARITED_COLORS.card} border-l-4 border-indigo-400`}>
                        <div className="flex justify-between items-center">
                            <div className="flex-grow">
                                <h4 className={`text-lg font-bold ${ARITED_COLORS.textDark}`}>{item.title}</h4>
                                <p className="text-sm text-gray-600 line-clamp-1">{item.body}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Publié le {new Date(item.timestamp).toLocaleDateString()} par {item.authorId.substring(0, 8)}...
                                    {item.advancement !== undefined && (
                                        <span className={`ml-3 font-semibold ${ARITED_COLORS.secondaryText}`}>({item.advancement}%)</span>
                                    )}
                                </p>
                            </div>
                            {/* Les boutons d'édition/suppression seraient ici pour un système complet */}
                        </div>
                    </div>
                ))
            ) : (
                <div className="p-6 bg-white rounded-xl shadow-inner text-center text-gray-500 italic">
                    Aucun(e) {label.toLowerCase()} créé(e) pour ce site.
                </div>
            )}
        </div>
    );
}

// Vue d'Administration (Back-Office)
const AdminView = ({ db, userId, siteId, setView, cmsData, requestsData }) => {
    const [activeTab, setActiveTab] = useState('news');

    const newsList = cmsData.filter(item => item.type === 'news').sort((a, b) => b.timestamp - a.timestamp);
    const projectsList = cmsData.filter(item => item.type === 'project').sort((a, b) => b.timestamp - a.timestamp);
    const pagesList = cmsData.filter(item => item.type === 'page').sort((a, b) => b.timestamp - a.timestamp);

    // Les types de contenu gérés
    const contentTypes = [
        { id: 'news', name: 'Actualités', icon: 'Newspaper', type: 'news', list: newsList },
        { id: 'projects', name: 'Projets & Transparence', icon: 'Layers', type: 'project', list: projectsList },
        { id: 'pages', name: 'Pages de Contenu', icon: 'Clipboard', type: 'page', list: pagesList },
        { id: 'requests', name: 'Demandes de Services', icon: 'Mail', type: 'request', list: requestsData },
    ];

    const currentType = contentTypes.find(t => t.id === activeTab);


    return (
        <div className={`p-8 max-w-7xl mx-auto ${ARITED_COLORS.background}`}>
            <h1 className={`text-3xl font-bold mb-6 ${ARITED_COLORS.primaryText}`}>
                Panneau d'Administration E-CMS ({siteId.toUpperCase()})
            </h1>
            <button 
                onClick={() => setView('frontend')}
                className={`mb-6 py-1 px-3 text-sm rounded-lg font-medium ${ARITED_COLORS.primary} ${ARITED_COLORS.textLight} hover:bg-blue-700 transition duration-150`}
            >
                &larr; Retour au Site Vitrine
            </button>

            {/* Navigation des Onglets Admin */}
            <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
                {contentTypes.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-3 px-6 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                            activeTab === tab.id
                                ? `${ARITED_COLORS.primaryText} border-b-2 border-blue-800`
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Icon name={tab.icon} className="w-5 h-5 inline-block mr-2" />
                        {tab.name} ({tab.list.length})
                    </button>
                ))}
            </div>

            {/* Affichage des Formulaires de Création et des Listes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Colonne de Création (Pour Contenu CMS) */}
                <div className="lg:col-span-1">
                     {currentType.type !== 'request' && <ContentForm 
                        db={db} 
                        userId={userId} 
                        siteId={siteId} 
                        type={currentType.type}
                     />}

                    {/* Message pour la Demande de Service */}
                    {currentType.type === 'request' && (
                        <div className={`${ARITED_COLORS.card} p-6 rounded-xl shadow-lg border-l-4 border-emerald-500`}>
                             <h2 className={`text-2xl font-bold mb-4 ${ARITED_COLORS.secondaryText}`}>Interface de Gestion des Demandes</h2>
                             <p className="text-gray-600">
                                 Les demandes de service et de rendez-vous sont gérées dans la liste ci-contre.
                                 Cliquez sur "Prendre en Charge" pour changer le statut.
                             </p>
                             <Icon name="MessageCircle" className={`w-12 h-12 mt-4 text-gray-300 mx-auto`} />
                        </div>
                    )}
                </div>

                {/* Colonne des Listes de Contenu/Demandes */}
                <div className="lg:col-span-2">
                    <h2 className={`text-2xl font-bold mb-4 ${ARITED_COLORS.primaryText}`}>
                        {currentType.name} Existantes pour {siteId.toUpperCase()}
                    </h2>
                    
                    {currentType.type === 'request' ? (
                        <RequestsList db={db} requests={requestsData.sort((a, b) => b.timestamp - a.timestamp)} />
                    ) : (
                        <ContentList contentList={currentType.list} type={currentType.type} />
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Composant Principal de l'Application E-CMS ---
const App = () => {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [siteId, setSiteId] = useState('arited-demo'); // Site ID par défaut
  const [view, setView] = useState('frontend'); // 'frontend' ou 'admin'

  // Données temps réel du CMS
  const [cmsData, setCmsData] = useState([]);
  const [requestsData, setRequestsData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // 1. Initialisation de Firebase & Authentification
  useEffect(() => {
    const initFirebase = async () => {
      try {
        // Initialisation de l'application Firebase
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const fAuth = getAuth(app);
        setDb(firestore);

        // Connexion
        if (initialAuthToken) {
          // Utilise le token de l'environnement de la plateforme (si disponible)
          await signInWithCustomToken(fAuth, initialAuthToken);
        } else {
          // Utilise l'authentification anonyme (standard pour les tests/déploiement local)
          await signInAnonymously(fAuth);
        }

        fAuth.onAuthStateChanged(user => {
          if (user) {
            setUserId(user.uid);
            console.log("Utilisateur connecté avec l'ID:", user.uid);
          } else {
            console.warn("Utilisateur déconnecté.");
            setUserId(null);
          }
        });
      } catch (error) {
        console.error("Erreur d'initialisation Firebase:", error);
      }
    };
    initFirebase();
  }, []);

  // 2. Gestion de l'URL pour le Multi-tenancy
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const site = urlParams.get('siteId');
    if (site) {
      // Sécurité: force un format simple pour siteId
      setSiteId(site.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    }
  }, []);
  
  // 3. Récupération des Données en Temps Réel (Multi-tenancy Filter)
  useEffect(() => {
    // S'assurer que la base de données est prête
    if (!db || !userId) return; 

    setLoadingData(true);
    const cmsPath = `/artifacts/${appId}/public/data/cms_content`;
    const requestsPath = `/artifacts/${appId}/public/data/service_requests`;
    
    // Requête 1: Contenu CMS (Actualités, Projets, Pages)
    const qCms = query(
        collection(db, cmsPath),
        where("siteId", "==", siteId),
    );

    const unsubscribeCms = onSnapshot(qCms, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convertir la date Firestore en objet Date si elle existe
        timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : new Date(),
      }));
      // Trier en JavaScript car orderBy est désactivé
      data.sort((a, b) => b.timestamp - a.timestamp); 
      setCmsData(data);
      console.log(`Données CMS chargées pour le site ${siteId}:`, data.length);
    }, (error) => {
        console.error("Erreur de chargement des données CMS:", error);
    });

    // Requête 2: Demandes de Service (Rendez-vous / Signalement)
    const qRequests = query(
        collection(db, requestsPath),
        where("siteId", "==", siteId),
    );

    const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : new Date(),
      }));
       // Trier en JavaScript
      data.sort((a, b) => b.timestamp - a.timestamp); 
      setRequestsData(data);
      console.log(`Demandes de service chargées pour le site ${siteId}:`, data.length);
      setLoadingData(false); // Fin du chargement après les deux requêtes
    }, (error) => {
        console.error("Erreur de chargement des demandes:", error);
        setLoadingData(false);
    });

    // Nettoyage des écouteurs lors du démontage du composant
    return () => {
        unsubscribeCms();
        unsubscribeRequests();
    };
  }, [db, userId, siteId]); // Déclenchement si db, userId ou siteId changent


  // Préparation des données pour le Frontend
  const news = cmsData.filter(item => item.type === 'news');
  const projects = cmsData.filter(item => item.type === 'project').sort((a, b) => b.advancement - a.advancement);
  const content = cmsData.filter(item => item.type === 'page');

  // Affichage principal
  return (
    <div className={`min-h-screen font-sans ${ARITED_COLORS.background}`}>
      
      {/* Barre de Navigation */}
      <header className={`${ARITED_COLORS.primary} shadow-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className={`${ARITED_COLORS.textLight} text-2xl font-bold flex items-center`}>
            <Icon name="Zap" className="w-7 h-7 mr-2" />
            E-CMS <span className="text-blue-200 ml-2 text-base font-normal">| Site: {siteId}</span>
          </div>
          <div className="flex space-x-4 items-center">
            <button 
                onClick={() => setView(view === 'frontend' ? 'admin' : 'frontend')}
                className={`py-1 px-3 text-sm rounded-lg font-medium transition duration-150 ${view === 'frontend' ? 'bg-white text-blue-800 hover:bg-gray-200' : 'bg-indigo-400 text-white hover:bg-indigo-500'}`}
            >
                {view === 'frontend' ? 'Aller à l\'Admin' : 'Aller au Site'}
            </button>
            <div className={`text-sm ${ARITED_COLORS.textLight} hidden sm:block`}>
                ID Utilisateur: {userId ? `${userId.substring(0, 8)}...` : 'Connexion...'}
            </div>
          </div>
        </div>
      </header>
      
      {/* Contenu principal (Vue Admin ou Vue Public) */}
      {view === 'frontend' ? (
        <FrontendView 
            siteId={siteId} 
            db={db}
            content={content} 
            news={news} 
            projects={projects} 
        />
      ) : (
        <AdminView 
            db={db} 
            userId={userId} 
            siteId={siteId} 
            setView={setView} 
            cmsData={cmsData}
            requestsData={requestsData}
        />
      )}

      {/* Indicateur de Chargement */}
      {loadingData && (
        <div className="fixed top-0 left-0 w-full h-1 bg-emerald-500 animate-pulse"></div>
      )}


      {/* Section Footer */}
      <footer className="w-full mt-12 py-8 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          E-CMS MVP | Projet Autonome - App ID: {appId}
        </div>
      </footer>
    </div>
  );
};

export default App;

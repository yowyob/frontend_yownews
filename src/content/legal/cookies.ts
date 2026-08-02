import type { LegalDocument } from './types';

export const cookiesDocument: { fr: LegalDocument; en: LegalDocument } = {
  "fr": {
    "title": "Notice relative aux cookies, traceurs et à la publicité",
    "subtitle": "Web, PWA, applications mobiles, contenus intégrés et analytics pédagogiques",
    "importantNotice": "Le registre ci-dessous est un modèle opérationnel. Les noms exacts, domaines, fournisseurs, durées et finalités doivent être alimentés automatiquement ou validés à partir du déploiement réel avant publication définitive.",
    "effectiveDate": "29 juillet 2026",
    "docControl": {
      "status": "Bêta publiée",
      "version": "1.0",
      "date": "29 juillet 2026",
      "publisher": "Yowyob Inc. Ltd",
      "system": "Yowyob Education",
      "document": "Cookies, Trackers and Advertising Notice"
    },
    "systemScope": "education.yowyob.com; interfaces Web et PWA; applications mobiles; espaces apprenant, créateur et administration; articles, podcasts, cours, forums, newsletters, API, SDK, notifications et intégrations autorisées",
    "officialSource": "https://education.yowyob.com/en — plateforme gratuite de contenus éducatifs comprenant articles, podcasts, cours, communauté, forums, newsletter et profils de créateurs.",
    "federatedArchitecture": "Yowyob Education peut utiliser des services communs de l’écosystème Yowyob — identité, recherche, stockage, sécurité, notifications, paiement lorsqu’il est activé, analytics et support. Cette architecture est conceptuellement inspirée des écosystèmes intégrés tels que Google.com, sans affiliation, licence, partenariat, approbation, identité technique ni garantie d’interopérabilité avec Google.",
    "quickTableTitle": "Choix rapide",
    "quickTableHeaders": [
      "Catégorie",
      "Règle"
    ],
    "quickTable": [
      [
        "Nécessaire",
        "Compte, sécurité, consentement, équilibrage et accessibilité; ne peut pas toujours être désactivé."
      ],
      [
        "Fonctionnel",
        "Langue, thème, progression locale, lecture, favoris et accessibilité."
      ],
      [
        "Analytics",
        "Audience, performance, erreurs et compréhension de l’usage; facultatif lorsque la loi l’exige."
      ],
      [
        "Personnalisation",
        "Recommandations et continuité de parcours; contrôlable séparément lorsque nécessaire."
      ],
      [
        "Publicité",
        "Contenu sponsorisé, attribution et fréquence; pas de publicité comportementale aux mineurs par défaut."
      ]
    ],
    "legalReferencesTitle": "Principales références juridiques",
    "contacts": "Contacts : privacy@yowyob.com pour les choix et droits; support@yowyob.com pour le technique; legal@yowyob.com pour le contractuel. Portail : https://education.yowyob.com/en.",
    "sections": [
      {
        "number": "1",
        "heading": "Objet et champ",
        "paragraphs": [
          "Cette Notice couvre le site education.yowyob.com, les espaces publics et connectés, la PWA, les applications mobiles, l’espace créateur, les forums, newsletters, médias intégrés, notifications, API et technologies de mesure associées.",
          "Un partenaire qui ajoute ses propres pixels, SDK ou lecteurs dans un espace dédié doit les documenter, fournir les choix requis et ne pas contourner les préférences Yowyob."
        ]
      },
      {
        "number": "2",
        "heading": "Définitions",
        "paragraphs": [
          "Un cookie est un petit fichier ou identifiant du navigateur. Local storage, session storage, IndexedDB et service workers sont des technologies Web distinctes. Un SDK mobile, un pixel, un jeton push, une empreinte d’appareil ou un journal serveur ne sont pas nécessairement des cookies mais peuvent traiter des données similaires.",
          "Les identifiants nécessaires à la sécurité, à la session ou à la progression ne doivent pas être confondus avec les identifiants publicitaires."
        ]
      },
      {
        "number": "3",
        "heading": "Technologies strictement nécessaires",
        "paragraphs": [
          "Session, authentification, anti-CSRF, protection anti-abus, équilibrage, consentement, préférence de langue, accessibilité essentielle, intégrité, cache technique, reprise et sécurité. Elles peuvent fonctionner sans consentement lorsqu’une autre base les autorise.",
          "Le refus de la publicité ou des analytics ne désactive pas les contrôles nécessaires à la connexion, à la sécurité, au téléchargement demandé ou à la synchronisation."
        ]
      },
      {
        "number": "4",
        "heading": "Fonctionnels et préférences",
        "paragraphs": [
          "Langue, thème, taille de texte, vitesse de lecture, volume, sous-titres, position d’écoute, cours récent, favoris, filtres, mise en page, fuseau, téléchargement et options d’accessibilité.",
          "Ces technologies servent à la continuité d’usage et ne créent pas par défaut un profil marketing inter-services."
        ]
      },
      {
        "number": "5",
        "heading": "Progression et analytics pédagogiques",
        "paragraphs": [
          "La plateforme peut enregistrer le contenu ouvert, la position, l’unité achevée, le temps indicatif, la tentative, le résultat, les erreurs, la reprise hors ligne et la synchronisation pour fournir et améliorer le parcours.",
          "La mesure pédagogique est distincte de la publicité. Elle doit être proportionnée et ne doit pas devenir une surveillance permanente de la personne."
        ]
      },
      {
        "number": "6",
        "heading": "Audience, performance et tests",
        "paragraphs": [
          "Des outils peuvent mesurer pages, événements, appareils, réseaux, temps de chargement, crash, erreurs, source de visite, conversion d’inscription et tests A/B. Les données sont agrégées ou pseudonymisées lorsque possible.",
          "Les analytics facultatifs ne doivent pas capturer les réponses libres, mots de passe, contenus privés, informations sensibles ou secrets."
        ]
      },
      {
        "number": "7",
        "heading": "Personnalisation et recommandation",
        "paragraphs": [
          "Des identifiants ou stockages peuvent mémoriser catégories, niveau, historique, favoris et préférences afin de recommander des contenus ou reprendre un parcours.",
          "Lorsque requis, la personnalisation avancée est séparée de la fourniture de base. L’utilisateur peut effacer l’historique ou désactiver certaines recommandations."
        ]
      },
      {
        "number": "8",
        "heading": "Publicité, sponsoring et affiliation",
        "paragraphs": [
          "La plateforme peut afficher des contenus sponsorisés, promotions Yowyob, partenariats, liens affiliés ou messages contextuels clairement identifiés. Des traceurs peuvent mesurer l’affichage, le clic, l’attribution et la fréquence selon la base et les choix.",
          "Les notes, réponses, résultats, messages privés, données sensibles et données de mineurs ne sont pas utilisés par défaut pour une publicité comportementale. Yowyob ne vend pas par défaut les données des apprenants aux annonceurs."
        ]
      },
      {
        "number": "9",
        "heading": "Médias et contenus tiers",
        "paragraphs": [
          "Un lecteur vidéo, audio, carte, police, widget social, outil de visioconférence ou contenu externe peut contacter le fournisseur, transmettre IP, appareil, page et interaction, et déposer ses propres traceurs.",
          "Lorsque possible, le chargement est différé jusqu’au choix ou à l’action de l’utilisateur. Les conditions du tiers s’appliquent après activation ou ouverture."
        ]
      },
      {
        "number": "10",
        "heading": "Connexion sociale et identité fédérée",
        "paragraphs": [
          "Les boutons Google, Apple ou autres fournisseurs peuvent rediriger vers leur service et recevoir des données techniques. Après consentement chez le fournisseur, Yowyob reçoit les données autorisées pour créer ou connecter le compte.",
          "Cette utilisation ne signifie pas que Google, Apple ou un fournisseur approuve Yowyob Education."
        ]
      },
      {
        "number": "11",
        "heading": "Newsletter, email et attribution",
        "paragraphs": [
          "Les emails peuvent contenir des identifiants limités pour mesurer livraison, ouverture ou clic lorsque permis. Une version sans mesure ou un désabonnement est proposé selon la loi et la configuration.",
          "Les paramètres de campagne peuvent mémoriser l’origine d’une inscription ou d’un cours pour une durée limitée."
        ]
      },
      {
        "number": "12",
        "heading": "PWA, cache et mode hors ligne",
        "paragraphs": [
          "La PWA peut mettre en cache l’interface, des médias autorisés, contenus téléchargés, préférences et données provisoires. Le service worker gère les mises à jour, la reprise et la synchronisation.",
          "Un appareil partagé peut révéler des téléchargements et une progression. L’utilisateur se déconnecte, supprime le cache ou utilise un profil protégé. La suppression de l’application ne supprime pas le compte serveur."
        ]
      },
      {
        "number": "13",
        "heading": "Applications mobiles et SDK",
        "paragraphs": [
          "Selon fonction : notifications, stockage ou médias pour téléchargement; caméra pour profil ou création initiée; microphone pour enregistrement initié; biométrie locale pour déverrouillage; intégrité d’appareil; crash et réseau.",
          "Contacts, localisation précise, microphone permanent et identifiant publicitaire ne sont pas nécessaires par défaut à l’apprentissage. Chaque permission est contextuelle et révocable."
        ]
      },
      {
        "number": "14",
        "heading": "Notifications push",
        "paragraphs": [
          "Un jeton de notification peut envoyer sécurité, rappel de cours, nouveau contenu, réponse communautaire ou campagne choisie. Les catégories sont réglables et le jeton est supprimé ou désactivé après révocation, désinstallation ou inactivité selon le système."
        ]
      },
      {
        "number": "15",
        "heading": "Espace créateur et administration",
        "paragraphs": [
          "Les espaces créateur et modération utilisent session, anti-CSRF, rôle, brouillons, version, outils d’édition, upload, statistiques et sécurité. Un appareil partagé ne doit pas conserver une session ou des médias confidentiels.",
          "Les outils d’édition peuvent intégrer stockage de brouillon, correction, transcription ou IA avec information contextuelle."
        ]
      },
      {
        "number": "16",
        "heading": "API et journaux serveur",
        "paragraphs": [
          "Les appels API utilisent généralement clé, OAuth/JWT, certificat ou signature plutôt qu’un cookie publicitaire. Ils produisent des journaux d’IP, endpoint, statut, latence, quota, erreur, corrélation et événement de sécurité.",
          "Ces journaux servent à la sécurité, au diagnostic, à la preuve et au quota et ne sont pas réutilisés par défaut comme identifiants publicitaires."
        ]
      },
      {
        "number": "17",
        "heading": "Consentement et centre de préférences",
        "paragraphs": [
          "Lorsque requis, les traceurs facultatifs ne sont activés qu’après un choix libre, spécifique, informé et prouvable. Refuser est aussi simple qu’accepter. Les catégories sont séparées.",
          "Le choix est mémorisé pour une durée limitée et redemandé en cas de changement substantiel, expiration ou retrait."
        ]
      },
      {
        "number": "18",
        "heading": "GPC, DNT et réglages des plateformes",
        "paragraphs": [
          "Global Privacy Control est interprété selon sa portée lorsqu’il est supporté. Do Not Track ne dispose pas d’une signification uniforme. Les réglages navigateur, Android et iOS relatifs à publicité, notifications, micro, caméra, stockage et suivi sont respectés par les composants concernés."
        ]
      },
      {
        "number": "19",
        "heading": "Mineurs",
        "paragraphs": [
          "Les espaces destinés aux mineurs utilisent des paramètres protecteurs et évitent par défaut publicité comportementale, pixels tiers non nécessaires, profilage invasif et partage public de progression.",
          "Un parent ou établissement ne doit pas installer des traceurs additionnels sans base, transparence et proportionnalité."
        ]
      },
      {
        "number": "20",
        "heading": "Durées indicatives",
        "paragraphs": [
          "Session : session à courte période; consentement : jusqu’à 12 mois; préférence : jusqu’au retrait; progression locale : compte ou suppression du cache; analytics : durée limitée souvent jusqu’à 13 mois; publicité : selon consentement et campagne; sécurité : selon risque et preuve; jeton push : jusqu’à révocation/inactivité.",
          "Le registre technique prévaut pour les durées réelles."
        ]
      },
      {
        "number": "21",
        "heading": "Sécurité et appareils partagés",
        "paragraphs": [
          "Yowyob utilise selon le cas Secure, HttpOnly, SameSite, chiffrement, rotation, limitation, consent mode et séparation des environnements. Les utilisateurs protègent appareil, extensions et navigateur.",
          "Un appareil public ou partagé ne doit pas conserver session, téléchargements privés, réponses, certificats, clés ou médias de créateur."
        ]
      },
      {
        "number": "22",
        "heading": "Données hors du Cloud Yowyob",
        "paragraphs": [
          "L’export de rapports, audiences, contenus, captures, identifiants, certificats ou journaux vers un outil tiers relève de l’exportateur. Les choix et suppressions doivent être propagés lorsque nécessaire.",
          "Effacer un cookie ou cache ne supprime pas les comptes, contributions, certificats, journaux serveur ou copies externes traités sous une autre base."
        ]
      },
      {
        "number": "23",
        "heading": "Contact et réclamation",
        "paragraphs": [
          "Contacts : privacy@yowyob.com pour les choix et droits; support@yowyob.com pour le technique; legal@yowyob.com pour le contractuel. Portail : https://education.yowyob.com/en."
        ]
      }
    ],
    "appendices": [
      {
        "title": "Annexe A — Registre opérationnel indicatif",
        "kind": "table",
        "headers": [
          "Catégorie",
          "Exemples",
          "Finalité",
          "Durée indicative"
        ],
        "rows": [
          [
            "Nécessaire",
            "Session, CSRF, consentement, sécurité",
            "Compte et intégrité",
            "Session à 12 mois"
          ],
          [
            "Fonctionnel",
            "Langue, thème, lecture, favoris",
            "Préférences et continuité",
            "Jusqu’au retrait"
          ],
          [
            "Apprentissage",
            "Progression, unité, tentative",
            "Fournir le parcours",
            "Compte/programme"
          ],
          [
            "Analytics",
            "Audience, performance, crash",
            "Amélioration",
            "Souvent ≤ 13 mois"
          ],
          [
            "Personnalisation",
            "Historique, catégories",
            "Recommandations",
            "Jusqu’à effacement"
          ],
          [
            "Publicité",
            "Impression, clic, campagne",
            "Sponsoring/attribution",
            "Selon consentement"
          ]
        ]
      },
      {
        "title": "Annexe B — Matrice indicative des permissions mobiles",
        "kind": "table",
        "headers": [
          "Permission",
          "Usage possible",
          "Principe"
        ],
        "rows": [
          [
            "Notifications",
            "Sécurité, cours, communauté, newsletter",
            "Opt-in et réglable"
          ],
          [
            "Stockage / médias",
            "Téléchargement et création",
            "Action initiée, minimisation"
          ],
          [
            "Caméra",
            "Photo de profil ou média créateur",
            "Seulement à la demande"
          ],
          [
            "Microphone",
            "Enregistrement podcast ou réponse audio",
            "Pas d’écoute en arrière-plan"
          ],
          [
            "Biométrie locale",
            "Déverrouillage",
            "Gabarit conservé par l’OS"
          ],
          [
            "Localisation / contacts",
            "Aucun besoin général",
            "Désactivés par défaut"
          ]
        ]
      }
    ],
    "legalReferences": [
      "Loi n° 2024/017 du 23 décembre 2024 relative à la protection des données à caractère personnel au Cameroun et textes d’application applicables.",
      "Loi n° 2010/021 du 21 décembre 2010 régissant le commerce électronique et décret n° 2011/1521/PM du 15 juin 2011.",
      "Loi n° 2010/012 du 21 décembre 2010 relative à la cybersécurité et à la cybercriminalité, ainsi que réglementation des communications électroniques.",
      "Actes uniformes OHADA et règles camerounaises applicables aux contrats, sociétés, preuve, comptabilité, fiscalité, consommation, publicité, concurrence et propriété intellectuelle.",
      "Réglementations CEMAC/BEAC/COBAC relatives aux paiements, à la monnaie électronique et à la lutte contre le blanchiment lorsque des fonctions réglementées sont effectivement activées.",
      "Loi n° 2000/011 du 19 décembre 2000 relative au droit d’auteur et aux droits voisins, instruments OAPI et Convention de Berne applicables.",
      "Règles camerounaises et, selon le public visé, étrangères applicables à l’éducation, à la protection des mineurs, à la publicité, aux communications audiovisuelles, à la consommation, à la santé et aux professions réglementées."
    ],
    "legalReferencesNote": "Réserve — Cette liste est indicative et ne remplace pas l’analyse des lois sectorielles, du pays de l’utilisateur, de l’activité configurée ou des traitements effectivement réalisés."
  },
  "en": {
    "title": "Cookies, Trackers and Advertising Notice",
    "subtitle": "Web, PWA, mobile apps, embedded content and learning analytics",
    "importantNotice": "The register below is an operational model. Exact names, domains, vendors, durations and purposes must be automatically populated or validated from the real deployment before final publication.",
    "effectiveDate": "29 July 2026",
    "docControl": {
      "status": "Published Beta",
      "version": "1.0",
      "date": "29 July 2026",
      "publisher": "Yowyob Inc. Ltd",
      "system": "Yowyob Education",
      "document": "Cookies, Trackers and Advertising Notice"
    },
    "systemScope": "education.yowyob.com; Web and PWA interfaces; mobile applications; learner, creator and administration spaces; articles, podcasts, courses, forums, newsletters, APIs, SDKs, notifications and authorised integrations",
    "officialSource": "https://education.yowyob.com/en — Free educational-content platform including articles, podcasts, courses, community, forums, newsletter and creator profiles.",
    "federatedArchitecture": "Yowyob Education may use common Yowyob ecosystem services — identity, search, storage, security, notifications, payment where enabled, analytics and support. This architecture is conceptually inspired by integrated ecosystems such as Google.com, without affiliation, licence, partnership, endorsement, technical identity or interoperability warranty with Google.",
    "quickTableTitle": "Quick choices",
    "quickTableHeaders": [
      "Category",
      "Rule"
    ],
    "quickTable": [
      [
        "Necessary",
        "Account, security, consent, load balancing and accessibility; cannot always be disabled."
      ],
      [
        "Functional",
        "Language, theme, local progress, playback, favourites and accessibility."
      ],
      [
        "Analytics",
        "Audience, performance, errors and usage understanding; optional where law requires."
      ],
      [
        "Personalisation",
        "Recommendations and learning continuity; separately controllable where necessary."
      ],
      [
        "Advertising",
        "Sponsored content, attribution and frequency; no behavioural advertising to children by default."
      ]
    ],
    "legalReferencesTitle": "Main legal references",
    "contacts": "Contacts: privacy@yowyob.com for choices and rights; support@yowyob.com for technical matters; legal@yowyob.com for contractual matters. Portal: https://education.yowyob.com/en.",
    "sections": [
      {
        "number": "1",
        "heading": "Purpose and scope",
        "paragraphs": [
          "This Notice covers education.yowyob.com, public and signed-in areas, PWA, mobile apps, creator tools, forums, newsletters, embedded media, notifications, APIs and related measurement technologies.",
          "A partner adding pixels, SDKs or players to a dedicated area must document them, provide required choices and not bypass Yowyob preferences."
        ]
      },
      {
        "number": "2",
        "heading": "Definitions",
        "paragraphs": [
          "A cookie is a browser file or identifier. Local storage, session storage, IndexedDB and service workers are distinct Web technologies. A mobile SDK, pixel, push token, device fingerprint or server log may process similar data without being a cookie.",
          "Security, session and progress identifiers must not be confused with advertising identifiers."
        ]
      },
      {
        "number": "3",
        "heading": "Strictly necessary technologies",
        "paragraphs": [
          "Session, authentication, anti-CSRF, abuse protection, load balancing, consent, language, essential accessibility, integrity, technical cache, recovery and security may operate without consent where another lawful basis applies.",
          "Refusing advertising or analytics does not disable controls needed for sign-in, security, requested downloads or synchronisation."
        ]
      },
      {
        "number": "4",
        "heading": "Functional technologies and preferences",
        "paragraphs": [
          "Language, theme, text size, playback speed, volume, captions, listening position, recent course, favourites, filters, layout, time zone, download and accessibility options support continuity without creating a cross-service marketing profile by default."
        ]
      },
      {
        "number": "5",
        "heading": "Progress and learning analytics",
        "paragraphs": [
          "The platform may record opened content, position, completed units, indicative time, attempts, results, errors, offline recovery and synchronisation to deliver and improve learning.",
          "Learning measurement is distinct from advertising and must remain proportionate rather than continuous personal surveillance."
        ]
      },
      {
        "number": "6",
        "heading": "Audience, performance and testing",
        "paragraphs": [
          "Tools may measure pages, events, devices, networks, load time, crashes, errors, visit source, registration conversion and A/B tests. Data are aggregated or pseudonymised where possible.",
          "Optional analytics must not capture free-text answers, passwords, private content, sensitive information or secrets."
        ]
      },
      {
        "number": "7",
        "heading": "Personalisation and recommendation",
        "paragraphs": [
          "Identifiers or storage may remember categories, level, history, favourites and preferences to recommend content or resume learning.",
          "Where required, advanced personalisation is separate from basic delivery and users can clear history or disable certain recommendations."
        ]
      },
      {
        "number": "8",
        "heading": "Advertising, sponsorship and affiliation",
        "paragraphs": [
          "The platform may show clearly labelled sponsored content, Yowyob offers, partnerships, affiliate links or contextual messages. Trackers may measure view, click, attribution and frequency according to basis and choices.",
          "Notes, answers, results, private messages, sensitive data and children’s data are not used by default for behavioural advertising. Yowyob does not by default sell learner data to advertisers."
        ]
      },
      {
        "number": "9",
        "heading": "Third-party media and content",
        "paragraphs": [
          "A video/audio player, map, font, social widget, conferencing tool or external material may contact its provider and transmit IP, device, page and interaction and set its own trackers.",
          "Where possible, loading waits for user choice or action. Third-party terms apply after activation or opening."
        ]
      },
      {
        "number": "10",
        "heading": "Social sign-in and federated identity",
        "paragraphs": [
          "Google, Apple or other sign-in buttons may redirect to the provider and transmit technical data. After the provider-side choice, Yowyob receives authorised data to create or connect the account.",
          "This does not mean that Google, Apple or another provider endorses Yowyob Education."
        ]
      },
      {
        "number": "11",
        "heading": "Newsletter, email and attribution",
        "paragraphs": [
          "Emails may include limited identifiers to measure delivery, open or click where permitted. A no-measure option or unsubscribe is provided according to law and configuration.",
          "Campaign parameters may remember the source of a sign-up or course for a limited period."
        ]
      },
      {
        "number": "12",
        "heading": "PWA, cache and offline mode",
        "paragraphs": [
          "The PWA may cache the interface, authorised media, downloads, preferences and provisional data. The service worker manages updates, recovery and synchronisation.",
          "A shared device may reveal downloads and progress. Users sign out, clear cache or use a protected profile. Removing the app does not delete the server account."
        ]
      },
      {
        "number": "13",
        "heading": "Mobile apps and SDKs",
        "paragraphs": [
          "Depending on feature: notifications; storage/media for downloads; camera for user-initiated profile or creation; microphone for initiated recording; local biometrics for unlock; device integrity; crash and network data.",
          "Contacts, precise location, permanent microphone and advertising ID are not required by default for learning. Permissions are contextual and revocable."
        ]
      },
      {
        "number": "14",
        "heading": "Push notifications",
        "paragraphs": [
          "A push token may deliver security, course reminders, new content, community replies or chosen campaigns. Categories are adjustable and the token is removed or disabled after revocation, uninstall or inactivity according to the system."
        ]
      },
      {
        "number": "15",
        "heading": "Creator and administration areas",
        "paragraphs": [
          "Creator and moderation spaces use session, anti-CSRF, role, drafts, version, editing, upload, analytics and security. Shared devices must not retain sessions or confidential media.",
          "Editing tools may integrate draft storage, correction, transcription or AI with contextual notice."
        ]
      },
      {
        "number": "16",
        "heading": "APIs and server logs",
        "paragraphs": [
          "API calls generally use keys, OAuth/JWT, certificates or signatures rather than advertising cookies and produce IP, endpoint, status, latency, quota, error, correlation and security logs.",
          "These logs support security, diagnostics, evidence and quotas and are not reused by default as advertising IDs."
        ]
      },
      {
        "number": "17",
        "heading": "Consent and preference centre",
        "paragraphs": [
          "Where required, optional trackers wait for a free, specific, informed and demonstrable choice. Refusal is as easy as acceptance and categories are separated.",
          "The choice is retained for a limited period and requested again after material change, expiry or withdrawal."
        ]
      },
      {
        "number": "18",
        "heading": "GPC, DNT and platform settings",
        "paragraphs": [
          "Global Privacy Control is interpreted according to scope where supported. Do Not Track has no uniform meaning. Browser, Android and iOS settings for advertising, notifications, microphone, camera, storage and tracking are respected by relevant components."
        ]
      },
      {
        "number": "19",
        "heading": "Children",
        "paragraphs": [
          "Child-directed areas use protective defaults and avoid behavioural advertising, unnecessary third-party pixels, invasive profiling and public progress sharing by default.",
          "Parents or institutions must not add trackers without a lawful basis, transparency and proportionality."
        ]
      },
      {
        "number": "20",
        "heading": "Indicative retention",
        "paragraphs": [
          "Session: session to short period; consent: up to 12 months; preference: until withdrawal; local progress: account or cache deletion; analytics: often up to 13 months; advertising: consent/campaign based; security: risk/evidence based; push token: until revocation/inactivity.",
          "The technical register governs actual periods."
        ]
      },
      {
        "number": "21",
        "heading": "Security and shared devices",
        "paragraphs": [
          "Yowyob applies Secure, HttpOnly, SameSite, encryption, rotation, limits, consent mode and environment separation as appropriate. Users protect devices, extensions and browsers.",
          "Public or shared devices must not retain sessions, private downloads, answers, certificates, keys or creator media."
        ]
      },
      {
        "number": "22",
        "heading": "Data outside Yowyob Cloud",
        "paragraphs": [
          "The exporter of reports, audiences, content, screenshots, identifiers, certificates or logs to another tool is responsible for the destination and propagating choices and deletion where necessary.",
          "Deleting a cookie or cache does not delete accounts, contributions, certificates, server logs or external copies processed under another basis."
        ]
      },
      {
        "number": "23",
        "heading": "Contact and complaints",
        "paragraphs": [
          "Contacts: privacy@yowyob.com for choices and rights; support@yowyob.com for technical matters; legal@yowyob.com for contractual matters. Portal: https://education.yowyob.com/en."
        ]
      }
    ],
    "appendices": [
      {
        "title": "Appendix A — Indicative operational register",
        "kind": "table",
        "headers": [
          "Category",
          "Examples",
          "Purpose",
          "Indicative duration"
        ],
        "rows": [
          [
            "Necessary",
            "Session, CSRF, consent, security",
            "Account and integrity",
            "Session to 12 months"
          ],
          [
            "Functional",
            "Language, theme, playback, favourites",
            "Preferences and continuity",
            "Until withdrawal"
          ],
          [
            "Learning",
            "Progress, unit, attempt",
            "Deliver the path",
            "Account/programme"
          ],
          [
            "Analytics",
            "Audience, performance, crash",
            "Improvement",
            "Often ≤ 13 months"
          ],
          [
            "Personalisation",
            "History, categories",
            "Recommendations",
            "Until deletion"
          ],
          [
            "Advertising",
            "Impression, click, campaign",
            "Sponsorship/attribution",
            "Consent based"
          ]
        ]
      },
      {
        "title": "Appendix B — Indicative mobile permission matrix",
        "kind": "table",
        "headers": [
          "Permission",
          "Possible use",
          "Principle"
        ],
        "rows": [
          [
            "Notifications",
            "Security, course, community, newsletter",
            "Opt-in and adjustable"
          ],
          [
            "Storage / media",
            "Downloads and creation",
            "User action and minimisation"
          ],
          [
            "Camera",
            "Profile or creator media",
            "On request only"
          ],
          [
            "Microphone",
            "Podcast or audio response",
            "No background listening"
          ],
          [
            "Local biometrics",
            "Unlock",
            "Template remains with OS"
          ],
          [
            "Location / contacts",
            "No general need",
            "Off by default"
          ]
        ]
      }
    ],
    "legalReferences": [
      "Law No. 2024/017 of 23 December 2024 relating to personal data protection in Cameroon and applicable implementing instruments.",
      "Law No. 2010/021 of 21 December 2010 governing electronic commerce and Decree No. 2011/1521/PM of 15 June 2011.",
      "Law No. 2010/012 of 21 December 2010 on cybersecurity and cybercrime, together with electronic communications regulation.",
      "Applicable OHADA Uniform Acts and Cameroonian rules on contracts, companies, evidence, accounting, tax, consumer protection, advertising, competition and intellectual property.",
      "Applicable CEMAC/BEAC/COBAC payment, electronic-money and anti-money-laundering rules where regulated functions are actually enabled.",
      "Law No. 2000/011 of 19 December 2000 on copyright and neighbouring rights, applicable OAPI instruments and the Berne Convention.",
      "Cameroonian and, depending on the target audience, foreign rules applicable to education, child protection, advertising, audiovisual communications, consumer protection, health and regulated professions."
    ],
    "legalReferencesNote": "Qualification — This list is indicative and does not replace analysis of sector-specific law, the user’s country, the configured activity or the processing actually performed."
  }
};

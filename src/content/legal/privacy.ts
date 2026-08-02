import type { LegalDocument } from './types';

export const privacyDocument: { fr: LegalDocument; en: LegalDocument } = {
  "fr": {
    "title": "Notice de confidentialité et de protection des données",
    "subtitle": "Apprenants, créateurs, communauté, analytics pédagogiques et services fédérés",
    "importantNotice": "Cette Notice décrit des catégories et scénarios possibles. Le registre opérationnel, les écrans contextuels et les contrats identifient les fonctions réellement activées, les sous-traitants, les lieux et les durées.",
    "effectiveDate": "29 juillet 2026",
    "docControl": {
      "status": "Bêta publiée",
      "version": "1.0",
      "date": "29 juillet 2026",
      "publisher": "Yowyob Inc. Ltd",
      "system": "Yowyob Education",
      "document": "Notice de confidentialité et de protection des données"
    },
    "systemScope": "education.yowyob.com; interfaces Web et PWA; applications mobiles; espaces apprenant, créateur et administration; articles, podcasts, cours, forums, newsletters, API, SDK, notifications et intégrations autorisées",
    "officialSource": "https://education.yowyob.com/en — plateforme gratuite de contenus éducatifs comprenant articles, podcasts, cours, communauté, forums, newsletter et profils de créateurs.",
    "federatedArchitecture": "Yowyob Education peut utiliser des services communs de l’écosystème Yowyob — identité, recherche, stockage, sécurité, notifications, paiement lorsqu’il est activé, analytics et support. Cette architecture est conceptuellement inspirée des écosystèmes intégrés tels que Google.com, sans affiliation, licence, partenariat, approbation, identité technique ni garantie d’interopérabilité avec Google.",
    "quickTableTitle": "Vue d’ensemble",
    "quickTableHeaders": [
      "Question",
      "Réponse"
    ],
    "quickTable": [
      [
        "Qui décide ?",
        "Yowyob décide pour le compte, la sécurité, le portail et ses contenus; un partenaire décide pour son espace ou programme."
      ],
      [
        "Quelles données ?",
        "Compte, profil, apprentissage, progression, créations, communauté, appareils, communications et préférences."
      ],
      [
        "Pourquoi ?",
        "Fournir, personnaliser raisonnablement, sécuriser, modérer, mesurer, assister, communiquer et respecter la loi."
      ],
      [
        "Publicité ?",
        "Pas d’utilisation par défaut des contenus privés, résultats ou données sensibles pour une publicité comportementale."
      ],
      [
        "Vos droits ?",
        "Information, accès, rectification, effacement, limitation, opposition, portabilité, retrait et intervention humaine selon la loi."
      ]
    ],
    "legalReferencesTitle": "Principales références juridiques",
    "contacts": "Contacts : privacy@yowyob.com; legal@yowyob.com; support@yowyob.com. Portail : https://education.yowyob.com/en.",
    "sections": [
      {
        "number": "1",
        "heading": "Responsable, sous-traitant et contacts",
        "paragraphs": [
          "Yowyob Inc. Ltd agit comme responsable du traitement pour la gestion du portail public, des comptes Yowyob, de la sécurité, de la facturation éventuelle, de ses communications, de ses propres contenus, de la modération générale et de la conformité de l’écosystème.",
          "Lorsqu’une organisation partenaire détermine les finalités d’un espace, d’un cours, d’une cohorte, d’une évaluation ou d’une communication, elle est responsable de ces traitements; Yowyob peut agir comme sous-traitant selon le contrat. Contact : privacy@yowyob.com."
        ]
      },
      {
        "number": "2",
        "heading": "Personnes concernées",
        "paragraphs": [
          "Visiteurs, apprenants, abonnés à la newsletter, créateurs, auteurs, enseignants, podcasteurs, modérateurs, administrateurs, représentants de partenaires, intégrateurs, contacts de support et personnes apparaissant dans les contenus peuvent être concernés.",
          "Une personne ne doit publier les données d’un tiers que si elle dispose d’une base, d’une information et des droits nécessaires."
        ]
      },
      {
        "number": "3",
        "heading": "Données de compte, identité et authentification",
        "paragraphs": [
          "Nom, pseudonyme, email, téléphone lorsque activé, langue, pays, âge ou tranche d’âge, rôle, photo, biographie, qualifications, organisation, préférences, statut de vérification, identifiants de connexion, MFA, jetons, historique de sécurité et fournisseur de connexion fédérée.",
          "Yowyob ne reçoit généralement pas le mot de passe du fournisseur social. Il peut recevoir un identifiant, nom, email, photo et signaux autorisés par l’utilisateur et le fournisseur."
        ]
      },
      {
        "number": "4",
        "heading": "Données d’apprentissage et de progression",
        "paragraphs": [
          "Cours, articles ou podcasts consultés; recherches; inscriptions; favoris; téléchargements; progression; position de lecture ou d’écoute; durée indicative; unités terminées; réponses; tentatives; scores; badges; certificats; notes personnelles; objectifs et préférences.",
          "Ces données ne doivent pas être interprétées automatiquement comme une mesure exhaustive de l’intelligence, de la productivité, de l’aptitude professionnelle ou de la santé."
        ]
      },
      {
        "number": "5",
        "heading": "Données des créateurs et contenus",
        "paragraphs": [
          "Profil professionnel, qualifications, justificatifs, portfolio, coordonnées, accords, paiements éventuels, fiscalité, statistiques, manuscrits, médias, voix, image, transcriptions, sources, droits, métadonnées, brouillons, historiques de version et déclarations de sponsor ou d’IA.",
          "Les contenus publiés et profils publics sont accessibles aux utilisateurs et peuvent être indexés par des moteurs de recherche. Les brouillons privés ne sont pas rendus publics sans action ou règle documentée."
        ]
      },
      {
        "number": "6",
        "heading": "Communauté, forums et contributions",
        "paragraphs": [
          "Commentaires, messages, réactions, signalements, abonnements, relations de suivi, modération, sanctions, preuves et recours. Un message public peut être lu, cité ou capturé par d’autres personnes.",
          "Les messages privés, lorsqu’ils existent, peuvent être analysés de façon proportionnée pour sécurité, abus et support; ils ne doivent pas être utilisés par défaut pour la publicité comportementale."
        ]
      },
      {
        "number": "7",
        "heading": "Données techniques, PWA et applications mobiles",
        "paragraphs": [
          "Adresse IP, appareil, navigateur, système, langue, identifiants d’application, version, réseau, fuseau, journaux, crash, performance, cache, service worker, jeton push, événement de sécurité et consentement.",
          "Les permissions telles que notifications, stockage, caméra, microphone, média ou biométrie locale ne sont demandées qu’au contexte d’une fonction et restent révocables dans l’appareil."
        ]
      },
      {
        "number": "8",
        "heading": "Sources",
        "paragraphs": [
          "Données fournies par l’utilisateur; générées par son usage; fournies par une organisation, un créateur ou un fournisseur d’authentification; issues de services Yowyob autorisés; de prestataires techniques; ou de sources publiques et légales pour vérifier une qualification ou traiter un signalement.",
          "Lorsque les données ne sont pas collectées directement, l’information requise est fournie selon la loi et les exceptions applicables."
        ]
      },
      {
        "number": "9",
        "heading": "Finalités",
        "paragraphs": [
          "Créer et sécuriser les comptes; fournir contenus, recherche, recommandations, progression, téléchargements et communauté; publier et gérer les créateurs; modérer; répondre au support; prévenir fraude et abus; mesurer l’audience et la qualité; améliorer l’accessibilité; envoyer communications choisies; respecter contrats et obligations.",
          "Les données d’apprentissage ne sont pas réutilisées pour une finalité incompatible sans nouvelle base, information et, lorsque requis, consentement."
        ]
      },
      {
        "number": "10",
        "heading": "Bases juridiques",
        "paragraphs": [
          "Exécution du contrat ou mesures précontractuelles; obligations légales; intérêts légitimes proportionnés de sécurité, administration, modération, amélioration et défense des droits; consentement pour traceurs, newsletters, permissions ou traitements qui l’exigent; intérêt vital ou mission spécifique lorsque la loi l’autorise.",
          "Une organisation partenaire détermine et documente sa propre base pour les cohortes, évaluations, rapports, communication, emploi ou formation obligatoire."
        ]
      },
      {
        "number": "11",
        "heading": "Personnalisation, recommandation et profilage",
        "paragraphs": [
          "La plateforme peut recommander un contenu selon langue, catégories, niveau déclaré, historique, favoris, progression, popularité ou contexte d’appareil. L’utilisateur peut disposer de contrôles pour effacer l’historique, désactiver certaines personnalisations ou repartir sur un profil neutre.",
          "Aucune décision produisant un effet juridique ou significatif ne devrait reposer exclusivement sur un score ou profil automatisé lorsque la loi exige information, contestation et intervention humaine."
        ]
      },
      {
        "number": "12",
        "heading": "Intelligence artificielle",
        "paragraphs": [
          "Les prompts, requêtes, réponses, transcriptions, résumés, corrections ou signaux de modération peuvent être traités pour fournir une fonction d’IA. Les données sont minimisées, les secrets et données sensibles doivent être évités et les fournisseurs sont contractuellement encadrés.",
          "Les contenus privés, travaux, voix, résultats et données de mineurs ne sont pas utilisés pour entraîner un modèle général sans base juridique claire, information appropriée et choix distinct lorsqu’il est requis."
        ]
      },
      {
        "number": "13",
        "heading": "Données sensibles et contenus à risque",
        "paragraphs": [
          "Une réponse, recherche, commentaire ou cours peut révéler santé, religion, opinion, origine, handicap, situation financière, sexualité ou autres données sensibles. L’utilisateur est invité à ne pas publier de données sensibles inutiles.",
          "Tout traitement intentionnel de telles données exige une finalité, une base, une minimisation, des accès, une durée et, selon le cas, une autorisation ou analyse d’impact renforcés."
        ]
      },
      {
        "number": "14",
        "heading": "Mineurs",
        "paragraphs": [
          "Les paramètres concernant les mineurs favorisent la confidentialité, la minimisation, la modération, l’absence de publicité comportementale et la limitation de la visibilité. Une vérification proportionnée d’âge ou d’autorité peut être utilisée.",
          "Les parents, tuteurs et établissements ne doivent pas exercer une surveillance disproportionnée ni publier publiquement les résultats, voix, images ou difficultés d’un mineur sans nécessité et garanties."
        ]
      },
      {
        "number": "15",
        "heading": "Destinataires et accès",
        "paragraphs": [
          "Personnel Yowyob autorisé; créateurs ou modérateurs selon leur rôle; organisation partenaire; hébergeurs, CDN, sécurité, analytics, support, email, notifications, transcription, traduction, authentification, paiement ou autres prestataires; conseils, auditeurs et autorités habilitées.",
          "Chaque destinataire reçoit le minimum nécessaire. Les créateurs n’accèdent pas automatiquement à l’identité détaillée de chaque lecteur ou auditeur."
        ]
      },
      {
        "number": "16",
        "heading": "Publicité, sponsors et mesure",
        "paragraphs": [
          "Les données de compte et de navigation peuvent servir à afficher une promotion contextuelle, mesurer une campagne ou limiter la répétition selon la base et les préférences. Les contenus privés, notes, réponses, résultats, données sensibles et données de mineurs ne sont pas utilisés par défaut pour une publicité comportementale.",
          "Yowyob ne vend pas par défaut les données personnelles des apprenants à des annonceurs. Un partenaire ne doit pas traiter l’adhésion à un cours comme consentement global au marketing."
        ]
      },
      {
        "number": "17",
        "heading": "Transferts internationaux",
        "paragraphs": [
          "Les contenus et services mondiaux peuvent nécessiter hébergement, accès ou sous-traitance hors du Cameroun. Yowyob évalue les pays, fournisseurs, clauses, chiffrement, accès public et autorisations applicables et met en place les garanties requises.",
          "La localisation réelle des sous-traitants et les mécanismes sont tenus dans le registre opérationnel ou les contrats."
        ]
      },
      {
        "number": "18",
        "heading": "Durées de conservation",
        "paragraphs": [
          "Compte : pendant la relation puis délais de preuve et obligations; progression : pendant le compte ou la durée du programme puis suppression/anonymisation; contenu public : jusqu’au retrait, fin de licence ou nécessité d’archive; brouillon : durée de travail et sauvegarde; communauté : durée du fil plus modération; sécurité : durée proportionnée au risque; consentement : durée de preuve.",
          "Les durées réelles sont documentées. À l’échéance, les données sont supprimées, anonymisées ou archivées avec accès restreint."
        ]
      },
      {
        "number": "19",
        "heading": "Sécurité",
        "paragraphs": [
          "Mesures possibles : chiffrement en transit, contrôle d’accès, MFA, séparation des rôles, journalisation, sauvegardes, tests, modération, protection anti-abus, pseudonymisation et procédures d’incident.",
          "Aucun service n’est invulnérable. Les utilisateurs protègent leurs appareils, évitent les secrets dans les commentaires et signalent les incidents."
        ]
      },
      {
        "number": "20",
        "heading": "Violations de données",
        "paragraphs": [
          "Yowyob et les partenaires contiennent l’incident, préservent les preuves, évaluent les risques, corrigent et notifient l’autorité ou les personnes lorsque la loi l’exige. Les communications distinguent faits connus, hypothèses et mesures."
        ]
      },
      {
        "number": "21",
        "heading": "Droits des personnes",
        "paragraphs": [
          "Sous conditions : information, accès, rectification, effacement, limitation, opposition, portabilité, retrait du consentement, intervention humaine et réclamation auprès de l’autorité compétente.",
          "Une vérification proportionnée d’identité peut être demandée. Une demande relative à un espace partenaire peut être transmise à l’organisation responsable."
        ]
      },
      {
        "number": "22",
        "heading": "Portabilité, fermeture et héritage des contenus",
        "paragraphs": [
          "L’utilisateur peut obtenir certaines données dans un format raisonnable selon la fonction et la loi. La portabilité ne garantit pas la compatibilité avec un autre LMS ou média.",
          "La fermeture de compte peut dissocier ou anonymiser les contributions collectives; un contenu créateur public peut rester pendant la licence ou une période de transition si le contrat le prévoit."
        ]
      },
      {
        "number": "23",
        "heading": "Données hors du Cloud Yowyob",
        "paragraphs": [
          "L’entité qui exporte des listes, profils, rapports, résultats, certificats, médias ou journaux vers LMS, CRM, tableur, appareil, cloud, messagerie, sauvegarde ou API devient responsable de la destination, des accès, durées, droits et incidents.",
          "La suppression dans Yowyob Education ne supprime pas automatiquement les copies externes ou indexées."
        ]
      },
      {
        "number": "24",
        "heading": "Cookies, SDK et choix",
        "paragraphs": [
          "La Cookies & Ads Notice détaille cookies, local storage, IndexedDB, PWA, service workers, SDK, analytics, contenus intégrés, notifications, publicité et signaux de consentement."
        ]
      },
      {
        "number": "25",
        "heading": "Modifications et contacts",
        "paragraphs": [
          "La Notice est mise à jour lorsque les rôles, finalités, catégories, fournisseurs, technologies ou lois évoluent. Les changements substantiels sont communiqués de manière appropriée.",
          "Contacts : privacy@yowyob.com; legal@yowyob.com; support@yowyob.com. Portail : https://education.yowyob.com/en."
        ]
      }
    ],
    "appendices": [
      {
        "title": "Annexe A — Cartographie synthétique des traitements",
        "kind": "table",
        "headers": [
          "Traitement",
          "Données principales",
          "Rôle indicatif",
          "Durée / contrôle"
        ],
        "rows": [
          [
            "Compte et sécurité",
            "Identité, email, authentification, IP, appareil",
            "Yowyob responsable",
            "Relation + preuve et sécurité"
          ],
          [
            "Apprentissage",
            "Inscriptions, progression, réponses, scores",
            "Yowyob ou partenaire selon programme",
            "Compte/programme + période limitée"
          ],
          [
            "Créateurs",
            "Profil, contenus, droits, statistiques",
            "Yowyob et/ou partenaire",
            "Relation, licence et obligations"
          ],
          [
            "Communauté",
            "Commentaires, messages, signalements",
            "Yowyob responsable ou conjoint selon espace",
            "Fil + modération et preuve"
          ],
          [
            "Personnalisation",
            "Historique, catégories, préférences",
            "Yowyob responsable",
            "Jusqu’au retrait/effacement"
          ],
          [
            "Support et sécurité",
            "Tickets, journaux, preuves",
            "Yowyob responsable ou sous-traitant",
            "Résolution + risque"
          ]
        ]
      },
      {
        "title": "Annexe B — Exemples de durées à confirmer dans le registre",
        "kind": "table",
        "headers": [
          "Catégorie",
          "Durée indicative",
          "Déclencheur de suppression"
        ],
        "rows": [
          [
            "Session technique",
            "Session à quelques jours",
            "Déconnexion, expiration ou rotation"
          ],
          [
            "Préférence de consentement",
            "Jusqu’à 12 mois",
            "Nouveau choix ou changement substantiel"
          ],
          [
            "Historique d’apprentissage",
            "Vie du compte ou du programme",
            "Fermeture, fin de programme ou demande recevable"
          ],
          [
            "Brouillons",
            "Période de création + sauvegarde courte",
            "Suppression par créateur ou inactivité"
          ],
          [
            "Journaux de sécurité",
            "Période proportionnée au risque",
            "Expiration du besoin de sécurité/preuve"
          ],
          [
            "Newsletter",
            "Jusqu’au désabonnement + preuve",
            "Opposition ou retrait"
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
    "title": "Privacy and Personal Data Protection Notice",
    "subtitle": "Learners, creators, community, learning analytics and federated services",
    "importantNotice": "This Notice describes possible categories and scenarios. The operational register, contextual screens and agreements identify actually enabled features, processors, locations and retention periods.",
    "effectiveDate": "29 July 2026",
    "docControl": {
      "status": "Published Beta",
      "version": "1.0",
      "date": "29 July 2026",
      "publisher": "Yowyob Inc. Ltd",
      "system": "Yowyob Education",
      "document": "Privacy and Personal Data Protection Notice"
    },
    "systemScope": "education.yowyob.com; Web and PWA interfaces; mobile applications; learner, creator and administration spaces; articles, podcasts, courses, forums, newsletters, APIs, SDKs, notifications and authorised integrations",
    "officialSource": "https://education.yowyob.com/en — Free educational-content platform including articles, podcasts, courses, community, forums, newsletter and creator profiles.",
    "federatedArchitecture": "Yowyob Education may use common Yowyob ecosystem services — identity, search, storage, security, notifications, payment where enabled, analytics and support. This architecture is conceptually inspired by integrated ecosystems such as Google.com, without affiliation, licence, partnership, endorsement, technical identity or interoperability warranty with Google.",
    "quickTableTitle": "At a glance",
    "quickTableHeaders": [
      "Question",
      "Answer"
    ],
    "quickTable": [
      [
        "Who decides?",
        "Yowyob decides for accounts, security, the portal and its content; a partner decides for its own area or programme."
      ],
      [
        "What data?",
        "Account, profile, learning, progress, creator, community, device, communications and preference data."
      ],
      [
        "Why?",
        "To deliver, reasonably personalise, secure, moderate, measure, support, communicate and comply."
      ],
      [
        "Advertising?",
        "Private content, results and sensitive data are not used by default for behavioural advertising."
      ],
      [
        "Your rights?",
        "Notice, access, correction, deletion, restriction, objection, portability, withdrawal and human intervention as provided by law."
      ]
    ],
    "legalReferencesTitle": "Main legal references",
    "contacts": "Contacts: privacy@yowyob.com; legal@yowyob.com; support@yowyob.com. Portal: https://education.yowyob.com/en.",
    "sections": [
      {
        "number": "1",
        "heading": "Controller, processor and contacts",
        "paragraphs": [
          "Yowyob Inc. Ltd is controller for the public portal, Yowyob accounts, security, any billing, its communications and content, general moderation and ecosystem compliance.",
          "Where a partner organisation determines purposes of an area, course, cohort, assessment or communication, it controls that processing and Yowyob may be processor under contract. Contact: privacy@yowyob.com."
        ]
      },
      {
        "number": "2",
        "heading": "Data subjects",
        "paragraphs": [
          "Visitors, learners, newsletter subscribers, creators, authors, instructors, podcasters, moderators, administrators, partner representatives, integrators, support contacts and people appearing in content may be concerned.",
          "A person should publish third-party data only with a lawful basis, notice and authority."
        ]
      },
      {
        "number": "3",
        "heading": "Account, identity and authentication data",
        "paragraphs": [
          "Name, pseudonym, email, phone where enabled, language, country, age or age band, role, photo, biography, qualifications, organisation, preferences, verification status, sign-in identifiers, MFA, tokens, security history and federated sign-in provider.",
          "Yowyob generally does not receive the social-provider password. It may receive an identifier, name, email, photo and signals authorised by the user and provider."
        ]
      },
      {
        "number": "4",
        "heading": "Learning and progress data",
        "paragraphs": [
          "Viewed courses, articles or podcasts; searches; enrolments; favourites; downloads; progress; reading/listening position; indicative time; completed units; answers; attempts; scores; badges; certificates; notes; objectives and preferences.",
          "These data must not automatically be treated as a complete measure of intelligence, productivity, professional aptitude or health."
        ]
      },
      {
        "number": "5",
        "heading": "Creator data and content",
        "paragraphs": [
          "Professional profile, qualifications, evidence, portfolio, contacts, agreements, possible payments and tax, analytics, manuscripts, media, voice, image, transcripts, sources, rights, metadata, drafts, version history and sponsor or AI disclosures.",
          "Published content and public profiles can be accessed and indexed by search engines. Private drafts are not public without an action or documented rule."
        ]
      },
      {
        "number": "6",
        "heading": "Community, forums and contributions",
        "paragraphs": [
          "Comments, messages, reactions, reports, subscriptions, follows, moderation, sanctions, evidence and appeals. A public message can be read, quoted or captured by others.",
          "Private messages, where offered, may be proportionately analysed for safety, abuse and support and are not used by default for behavioural advertising."
        ]
      },
      {
        "number": "7",
        "heading": "Technical, PWA and mobile-app data",
        "paragraphs": [
          "IP address, device, browser, operating system, language, app identifiers, version, network, time zone, logs, crash, performance, cache, service worker, push token, security event and consent.",
          "Permissions such as notifications, storage, camera, microphone, media or local biometrics are requested only in context and remain revocable on the device."
        ]
      },
      {
        "number": "8",
        "heading": "Sources",
        "paragraphs": [
          "Data supplied by the user; generated through use; provided by an organisation, creator or identity provider; obtained from authorised Yowyob services, technical suppliers or lawful public sources to verify qualifications or handle reports.",
          "Where data are not obtained directly, required notice is provided subject to legal exceptions."
        ]
      },
      {
        "number": "9",
        "heading": "Purposes",
        "paragraphs": [
          "Create and secure accounts; deliver content, search, recommendations, progress, downloads and community; publish and manage creators; moderate; support; prevent fraud and abuse; measure audience and quality; improve accessibility; send chosen communications; comply with contracts and law.",
          "Learning data are not reused for an incompatible purpose without a new basis, notice and consent where required."
        ]
      },
      {
        "number": "10",
        "heading": "Lawful bases",
        "paragraphs": [
          "Contract or pre-contract steps; legal duties; proportionate legitimate interests in security, administration, moderation, improvement and legal defence; consent for trackers, newsletters, permissions or processing that requires it; vital interests or specific missions where law permits.",
          "A partner organisation identifies and documents its own basis for cohorts, assessments, reports, communications, employment or mandatory training."
        ]
      },
      {
        "number": "11",
        "heading": "Personalisation, recommendation and profiling",
        "paragraphs": [
          "The platform may recommend content by language, category, declared level, history, favourites, progress, popularity or device context. Controls may allow clearing history, disabling certain personalisation or resetting to a neutral profile.",
          "No decision with legal or similarly significant effect should rely solely on an automated score or profile where law requires notice, challenge and human intervention."
        ]
      },
      {
        "number": "12",
        "heading": "Artificial intelligence",
        "paragraphs": [
          "Prompts, requests, answers, transcripts, summaries, corrections or moderation signals may be processed to deliver an AI feature. Data are minimised, secrets and sensitive data should be avoided, and suppliers are contractually governed.",
          "Private content, work, voice, results and children’s data are not used to train a general model without a clear lawful basis, suitable notice and distinct choice where required."
        ]
      },
      {
        "number": "13",
        "heading": "Sensitive data and risky content",
        "paragraphs": [
          "An answer, search, comment or course may reveal health, religion, opinion, origin, disability, finances, sexuality or other sensitive data. Users should not publish unnecessary sensitive data.",
          "Intentional processing requires purpose, basis, minimisation, access limits, retention and, where applicable, authorisation or enhanced impact assessment."
        ]
      },
      {
        "number": "14",
        "heading": "Children",
        "paragraphs": [
          "Features involving children favour privacy, minimisation, moderation, no behavioural advertising and restricted visibility. Proportionate age or authority checks may be used.",
          "Parents, guardians and institutions must not conduct disproportionate surveillance or publicly disclose a child’s results, voice, image or difficulties without necessity and safeguards."
        ]
      },
      {
        "number": "15",
        "heading": "Recipients and access",
        "paragraphs": [
          "Authorised Yowyob staff; creators or moderators according to role; partner organisations; hosting, CDN, security, analytics, support, email, notification, transcription, translation, sign-in, payment or other suppliers; advisers, auditors and authorised authorities.",
          "Each recipient receives the minimum. Creators do not automatically receive detailed identity of every reader or listener."
        ]
      },
      {
        "number": "16",
        "heading": "Advertising, sponsors and measurement",
        "paragraphs": [
          "Account and navigation data may support contextual promotion, campaign measurement or frequency capping according to basis and preferences. Private content, notes, answers, results, sensitive data and children’s data are not used by default for behavioural advertising.",
          "Yowyob does not by default sell learners’ personal data to advertisers. Joining a course is not global consent to a partner’s marketing."
        ]
      },
      {
        "number": "17",
        "heading": "International transfers",
        "paragraphs": [
          "Global content and services may require hosting, access or processing outside Cameroon. Yowyob assesses countries, suppliers, terms, encryption, government access and applicable authorisations and implements required safeguards.",
          "Actual supplier locations and mechanisms are maintained in the operational register or agreements."
        ]
      },
      {
        "number": "18",
        "heading": "Retention",
        "paragraphs": [
          "Account data lasts for the relationship plus evidence and legal periods; progress for the account/programme then deletion or anonymisation; public content until withdrawal, licence expiry or archive need; drafts for work and backup; community for thread plus moderation; security according to risk; consent for proof.",
          "Actual periods are documented. On expiry, data are deleted, anonymised or restricted in archive."
        ]
      },
      {
        "number": "19",
        "heading": "Security",
        "paragraphs": [
          "Measures may include encryption in transit, access controls, MFA, role separation, logging, backups, testing, moderation, anti-abuse protection, pseudonymisation and incident procedures.",
          "No service is invulnerable. Users protect devices, avoid secrets in comments and report incidents."
        ]
      },
      {
        "number": "20",
        "heading": "Data breaches",
        "paragraphs": [
          "Yowyob and partners contain incidents, preserve evidence, assess risks, remediate and notify authorities or individuals where legally required. Communications distinguish known facts, hypotheses and measures."
        ]
      },
      {
        "number": "21",
        "heading": "Individual rights",
        "paragraphs": [
          "Subject to conditions: notice, access, correction, deletion, restriction, objection, portability, consent withdrawal, human intervention and complaint to the competent authority.",
          "Proportionate identity verification may be required. A request about a partner area may be routed to the responsible organisation."
        ]
      },
      {
        "number": "22",
        "heading": "Portability, closure and content legacy",
        "paragraphs": [
          "Users may obtain certain data in a reasonable format according to feature and law. Portability does not guarantee compatibility with another LMS or media service.",
          "Account closure may dissociate or anonymise collective contributions; public creator content may remain during the licence or transition period where agreed."
        ]
      },
      {
        "number": "23",
        "heading": "Data outside Yowyob Cloud",
        "paragraphs": [
          "The entity exporting lists, profiles, reports, results, certificates, media or logs to an LMS, CRM, spreadsheet, device, cloud, messenger, backup or API is responsible for the destination, access, retention, rights and incidents.",
          "Deletion in Yowyob Education does not automatically delete external or indexed copies."
        ]
      },
      {
        "number": "24",
        "heading": "Cookies, SDKs and choices",
        "paragraphs": [
          "The Cookies & Ads Notice details cookies, local storage, IndexedDB, PWA, service workers, SDKs, analytics, embedded content, notifications, advertising and consent signals."
        ]
      },
      {
        "number": "25",
        "heading": "Changes and contacts",
        "paragraphs": [
          "This Notice changes when roles, purposes, categories, suppliers, technology or law changes. Material changes are communicated appropriately.",
          "Contacts: privacy@yowyob.com; legal@yowyob.com; support@yowyob.com. Portal: https://education.yowyob.com/en."
        ]
      }
    ],
    "appendices": [
      {
        "title": "Appendix A — Summary processing map",
        "kind": "table",
        "headers": [
          "Processing",
          "Main data",
          "Indicative role",
          "Retention / control"
        ],
        "rows": [
          [
            "Account and security",
            "Identity, email, authentication, IP, device",
            "Yowyob controller",
            "Relationship + evidence/security"
          ],
          [
            "Learning",
            "Enrolments, progress, answers, scores",
            "Yowyob or partner by programme",
            "Account/programme + limited period"
          ],
          [
            "Creators",
            "Profile, content, rights, analytics",
            "Yowyob and/or partner",
            "Relationship, licence and duties"
          ],
          [
            "Community",
            "Comments, messages, reports",
            "Yowyob controller or joint by area",
            "Thread + moderation/evidence"
          ],
          [
            "Personalisation",
            "History, categories, preferences",
            "Yowyob controller",
            "Until withdrawal/deletion"
          ],
          [
            "Support and security",
            "Tickets, logs, evidence",
            "Yowyob controller or processor",
            "Resolution + risk"
          ]
        ]
      },
      {
        "title": "Appendix B — Retention examples to confirm in the register",
        "kind": "table",
        "headers": [
          "Category",
          "Indicative period",
          "Deletion trigger"
        ],
        "rows": [
          [
            "Technical session",
            "Session to a few days",
            "Sign-out, expiry or rotation"
          ],
          [
            "Consent preference",
            "Up to 12 months",
            "New choice or material change"
          ],
          [
            "Learning history",
            "Life of account or programme",
            "Closure, programme end or valid request"
          ],
          [
            "Drafts",
            "Creation period + short backup",
            "Creator deletion or inactivity"
          ],
          [
            "Security logs",
            "Risk-proportionate period",
            "Security/evidence need expires"
          ],
          [
            "Newsletter",
            "Until unsubscribe + proof",
            "Objection or withdrawal"
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

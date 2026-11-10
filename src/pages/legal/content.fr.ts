import type { LegalDocuments } from "./contentTypes";

export const legalDocumentsFr: LegalDocuments = {
  terms: {
    title: "Conditions d’utilisation",
    summary:
      "Projet de conditions encadrant l’accès à PAJES et son utilisation dans le cadre professionnel d’EXCI-MAA.",
    version: "Projet 0.1",
    effectiveDate: null,
    lastUpdated: null,
    sections: [
      {
        id: "objet",
        title: "1. Objet et champ d’application",
        paragraphs: [
          "Le présent document décrit les règles proposées pour l’accès à PAJES et son utilisation dans le cadre des activités professionnelles autorisées par EXCI-MAA. Il s’adresse aux personnes auxquelles un accès a été accordé.",
          "Il doit être relu et approuvé par EXCI-MAA et ses conseils. Les règles internes, contrats et obligations légales applicables prévalent lorsqu’ils imposent une exigence différente.",
        ],
      },
      {
        id: "identite",
        title: "2. EXCI-MAA et PAJES",
        paragraphs: [
          "L’application identifie l’organisation sous le nom EXCI-MAA et présente PAJES comme une plateforme de gestion des activités professionnelles du cabinet. La dénomination légale complète, les coordonnées officielles et la qualité de l’entité responsable restent à confirmer avant publication.",
          "PAJES regroupe des fonctions de gestion et de suivi opérationnel. Sa disponibilité et ses modules peuvent dépendre de la configuration de l’organisation.",
        ],
      },
      {
        id: "eligibilite",
        title: "3. Éligibilité et accès autorisé",
        paragraphs: [
          "L’accès est réservé aux personnes autorisées par EXCI-MAA pour un besoin professionnel. L’utilisateur doit respecter les procédures internes d’habilitation et n’utiliser que les fonctionnalités auxquelles son accès lui permet de prétendre.",
          "La création d’un compte ne vaut pas approbation automatique d’un accès à l’ensemble des modules ou dossiers.",
        ],
      },
      {
        id: "compte",
        title: "4. Création du compte et authentification",
        paragraphs: [
          "La création d’un compte nécessite les informations demandées par le parcours d’inscription. L’authentification de l’application s’appuie sur Supabase. Les identifiants sont personnels et ne doivent pas être partagés.",
          "L’utilisateur doit fournir des informations exactes et signaler les changements nécessaires par le canal interne approprié. La procédure de vérification et d’activation des comptes doit être confirmée par EXCI-MAA.",
        ],
      },
      {
        id: "responsabilites",
        title: "5. Responsabilités et confidentialité des identifiants",
        paragraphs: [
          "L’utilisateur protège son mot de passe et ses moyens d’authentification, verrouille ses appareils et se déconnecte lorsqu’il n’utilise plus PAJES sur un appareil partagé.",
          "Toute suspicion de perte, de divulgation ou d’utilisation non autorisée des identifiants doit être signalée sans délai selon la procédure de sécurité interne.",
        ],
      },
      {
        id: "permissions",
        title: "6. Rôles, permissions et utilisation autorisée",
        paragraphs: [
          "L’interface d’PAJES comporte des rôles et des permissions qui conditionnent l’accès aux modules et aux actions. Les droits attribués à chaque compte doivent correspondre aux responsabilités professionnelles de son titulaire.",
          "Le contrôle effectif de l’accès aux enregistrements dépend également des règles actives sur les services côté serveur. EXCI-MAA doit vérifier ces règles et leur cohérence avant publication de ces conditions ; ce projet ne certifie pas leur configuration.",
        ],
      },
      {
        id: "confidentialite",
        title: "7. Confidentialité des informations",
        paragraphs: [
          "Les informations de l’organisation, de ses clients, collaborateurs, fournisseurs et partenaires auxquelles l’utilisateur accède dans le cadre de son rôle doivent être traitées comme confidentielles, sous réserve des règles légales et contractuelles applicables.",
          "L’utilisateur ne consulte, n’utilise ni ne communique ces informations qu’en fonction d’un besoin professionnel autorisé, et applique les politiques internes de confidentialité et de conservation.",
        ],
      },
      {
        id: "exactitude",
        title: "8. Exactitude et intégrité des informations",
        paragraphs: [
          "L’utilisateur saisit des informations exactes, pertinentes et à jour, corrige les erreurs selon les procédures applicables et ne falsifie pas, ne supprime pas ou ne modifie pas sans autorisation les données ou traces d’activité.",
          "PAJES ne remplace pas les contrôles professionnels, pièces justificatives, vérifications comptables ou validations requises par les procédures de l’organisation.",
        ],
      },
      {
        id: "modules",
        title: "9. Modules et enregistrements",
        paragraphs: [
          "Selon les droits attribués et la configuration active, PAJES peut proposer la gestion des clients, missions, dossiers et feuilles de travail, notes de revue, constats, collaborateurs, congés, notes de frais, factures, caisse, stock, immobilisations, fournisseurs, ressources et rapports.",
          "La présence d’un module ou d’un enregistrement ne confère pas à l’utilisateur un droit d’accès ou d’approbation. Seules les fonctions activées et autorisées pour son compte peuvent être utilisées.",
        ],
      },
      {
        id: "workflows",
        title: "10. Soumission, modification et validation",
        paragraphs: [
          "Les demandes et enregistrements suivent les étapes et responsabilités prévues par le module concerné et les procédures internes. Une saisie, un envoi ou un statut affiché ne constitue pas à lui seul une approbation, sauf lorsque le processus applicable indique explicitement le contraire.",
          "Les étapes de validation, les personnes habilitées et les effets de chaque statut doivent être confirmés par les responsables de processus d’EXCI-MAA.",
        ],
      },
      {
        id: "interdictions",
        title: "11. Activités interdites",
        paragraphs: [
          "Il est interdit d’utiliser PAJES en dehors des habilitations reçues, de tenter d’obtenir des privilèges supplémentaires, d’accéder à des dossiers sans motif autorisé, ou d’extraire, copier ou divulguer des données sans autorisation.",
          "Il est également interdit de contourner les contrôles, d’introduire un code malveillant, de perturber le service, de tester ses vulnérabilités sans accord écrit ou d’utiliser PAJES à des fins illicites.",
        ],
      },
      {
        id: "incident",
        title: "12. Signalement des incidents de sécurité",
        paragraphs: [
          "Toute perte d’appareil, activité inhabituelle, erreur d’accès, divulgation possible ou suspicion d’accès non autorisé doit être signalée rapidement au responsable informatique ou au canal de sécurité désigné par EXCI-MAA.",
          "N’effectuez pas d’investigation ou de suppression susceptible d’altérer les éléments utiles. Les coordonnées et délais de signalement internes sont à confirmer par EXCI-MAA.",
        ],
      },
      {
        id: "propriete",
        title: "13. Propriété intellectuelle et usage permis",
        paragraphs: [
          "Les droits relatifs à PAJES, à ses composants, contenus et signes distinctifs appartiennent à leurs titulaires respectifs ou sont utilisés avec leur autorisation, conformément au droit applicable.",
          "L’utilisateur bénéficie uniquement du droit limité d’utiliser l’application pour les activités professionnelles autorisées. L’identité des titulaires de droits et les licences des composants doivent être vérifiées avant publication.",
        ],
      },
      {
        id: "disponibilite",
        title: "14. Disponibilité, maintenance et limites techniques",
        paragraphs: [
          "L’accès peut être interrompu ou limité pour maintenance, mises à jour, incidents, contraintes techniques ou dépendances de services tiers. Aucune disponibilité ininterrompue n’est promise par ce projet.",
          "Les utilisateurs suivent les procédures de sauvegarde et de continuité définies par EXCI-MAA et ne considèrent pas PAJES comme l’unique copie d’un document ou d’une donnée requérant une conservation distincte.",
        ],
      },
      {
        id: "suspension",
        title: "15. Suspension, retrait d’accès et fin d’utilisation",
        paragraphs: [
          "EXCI-MAA peut, selon ses procédures internes et le droit applicable, réviser, suspendre ou retirer un accès lorsqu’un besoin professionnel prend fin, qu’un risque est identifié ou qu’une règle est enfreinte.",
          "La clôture d’un compte ne détermine pas à elle seule le sort des dossiers professionnels associés ; leur conservation, archivage ou suppression relève des règles applicables et des responsables compétents.",
        ],
      },
      {
        id: "modifications",
        title: "16. Modification des conditions",
        paragraphs: [
          "Toute version applicable devra identifier son numéro, sa date d’entrée en vigueur et les modalités de notification des changements importants. Les utilisateurs seront informés selon la procédure approuvée par EXCI-MAA.",
          "Ces modalités de notification, ainsi que les conséquences d’un changement pour les utilisateurs, doivent être arrêtées avant publication.",
        ],
      },
      {
        id: "droit",
        title: "17. Droit applicable et règlement des différends",
        paragraphs: [
          "Le droit applicable, les mécanismes de règlement des différends et toute juridiction compétente ne sont pas déterminés dans ce projet. Ils doivent être validés par les conseils d’EXCI-MAA au regard de l’entité contractante et des textes applicables.",
          "Aucune juridiction ni exclusion de responsabilité n’est stipulée par cette version de travail.",
        ],
      },
      {
        id: "contact-date",
        title: "18. Contact et entrée en vigueur",
        paragraphs: [
          "Pour toute question relative à ces conditions, utilisez le canal officiel désigné par EXCI-MAA. Le nom légal complet, le contact de publication, la date d’effet et la version finale restent à confirmer.",
          "Le présent document est un projet non approuvé et n’indique aucune date d’entrée en vigueur.",
        ],
      },
    ],
  },
  privacy: {
    title: "Politique de confidentialité",
    summary:
      "Projet décrivant les catégories de données utilisées dans PAJES et les informations à confirmer par EXCI-MAA avant publication.",
    version: "Projet 0.1",
    effectiveDate: null,
    lastUpdated: null,
    sections: [
      {
        id: "responsable",
        title: "1. Organisation responsable et contact",
        paragraphs: [
          "L’application identifie EXCI-MAA comme organisation à l’origine d’PAJES. L’identité légale complète de l’entité qui détermine les finalités et moyens des traitements, son adresse et son contact dédié à la confidentialité doivent être confirmés avant publication.",
          "Ce projet ne désigne pas une personne de contact ni une autorité de contrôle particulière.",
        ],
      },
      {
        id: "perimetre",
        title: "2. Champ d’application",
        paragraphs: [
          "La politique proposée concerne les données personnelles traitées au moyen des fonctions PAJES utilisées par EXCI-MAA, y compris la gestion des comptes et les modules professionnels activés.",
          "Elle ne décrit pas les traitements externes ou les services tiers qui n’ont pas été vérifiés dans le déploiement.",
        ],
      },
      {
        id: "categories",
        title: "3. Catégories de données",
        paragraphs: [
          "Les écrans et structures de données examinés montrent que l’application peut traiter les catégories suivantes, lorsqu’elles sont renseignées et selon les modules utilisés :",
        ],
        bullets: [
          "Données de compte et de profil professionnel, notamment nom, adresse e-mail, rôle et informations de profil.",
          "Données de contact et informations commerciales associées aux clients et fournisseurs.",
          "Données contenues dans les missions, dossiers, feuilles de travail, notes de revue, constats, demandes de congé et notes de frais.",
          "Données de facturation et de gestion opérationnelle, ainsi que les informations saisies par les utilisateurs dans les modules concernés.",
          "Données d’authentification et métadonnées techniques requises par les services utilisés, selon leur configuration effective.",
        ],
      },
      {
        id: "compte-profil",
        title: "4. Compte et profil professionnel",
        paragraphs: [
          "Lors de l’inscription, le parcours demande une adresse e-mail, un mot de passe et un nom. Le profil associé peut inclure les nom et prénom, le nom complet, le rôle et d’autres champs professionnels selon les fonctions utilisées.",
          "Les informations de compte sont utilisées pour authentifier l’utilisateur et lui fournir les fonctionnalités activées.",
        ],
      },
      {
        id: "clients-entreprise",
        title: "5. Clients et dossiers professionnels",
        paragraphs: [
          "Les modules clients, missions et dossiers peuvent contenir des coordonnées professionnelles, des informations de contact et des éléments liés aux activités de clients ou de partenaires. Le contenu dépend de ce que les utilisateurs sont autorisés à saisir.",
          "Les utilisateurs doivent limiter la saisie aux informations pertinentes pour le travail autorisé et respecter les engagements de confidentialité applicables.",
        ],
      },
      {
        id: "donnees-operationnelles",
        title: "6. Données opérationnelles",
        paragraphs: [
          "Les fonctions actuellement repérées comprennent les missions, dossiers et feuilles de travail, notes de revue, constats, congés, notes de frais, factures, caisse, stocks, immobilisations, fournisseurs, collaborateurs et rapports. Les données personnelles éventuellement présentes dans ces enregistrements sont traitées pour les besoins des opérations correspondantes.",
          "Les catégories exactes de données et les circuits d’approbation doivent être validés avec les responsables de chaque module.",
        ],
      },
      {
        id: "technique",
        title: "7. Données techniques, journaux et diagnostics",
        paragraphs: [
          "Le code examiné confirme l’usage de Supabase pour l’authentification et l’accès aux données. Les services d’authentification et d’hébergement peuvent traiter des identifiants techniques et des métadonnées de fonctionnement selon la configuration du déploiement.",
          "La collecte effective des journaux d’accès, événements de sécurité, adresses IP et diagnostics n’a pas été établie par le seul examen de l’interface. EXCI-MAA doit la vérifier auprès des paramètres et fournisseurs de production avant d’en décrire la portée.",
        ],
      },
      {
        id: "finalites",
        title: "8. Finalités du traitement",
        paragraphs: [
          "Sous réserve de validation, les données décrites ci-dessus sont utilisées pour gérer les comptes et habilitations, fournir les fonctions de gestion des activités, suivre les tâches et demandes, produire les documents nécessaires aux opérations et maintenir le service.",
          "Les finalités propres à chaque module et à tout usage supplémentaire doivent être confirmées par EXCI-MAA. Aucun usage publicitaire ou profilage n’est affirmé par ce projet.",
        ],
      },
      {
        id: "base-legale",
        title: "9. Bases juridiques",
        paragraphs: [
          "La base juridique applicable à chaque finalité dépend de la relation concernée et du droit en vigueur. Elle peut nécessiter l’examen d’obligations légales, de relations contractuelles, d’intérêts légitimes ou d’un consentement lorsque celui-ci est réellement requis.",
          "Aucune base juridique n’est attribuée ici : cette analyse doit être menée et approuvée par les conseils d’EXCI-MAA avant publication.",
        ],
      },
      {
        id: "minimisation",
        title: "10. Minimisation et exactitude",
        paragraphs: [
          "Les données demandées et saisies doivent être pertinentes et limitées au besoin professionnel concerné. Les utilisateurs veillent à leur exactitude et signalent les corrections nécessaires selon les procédures de l’organisation.",
          "Les règles de validation et de mise à jour doivent être confirmées pour chaque catégorie de données.",
        ],
      },
      {
        id: "acces-interne",
        title: "11. Accès interne et habilitations",
        paragraphs: [
          "L’application comporte des rôles et des contrôles d’interface visant à différencier les actions disponibles selon les profils. L’accès approprié doit être limité aux personnes autorisées ayant un besoin professionnel.",
          "Les politiques actives côté serveur déterminent également l’accès effectif aux enregistrements. Leur vérification en production est indispensable ; ce projet ne garantit pas que les permissions limitent actuellement chaque donnée.",
        ],
      },
      {
        id: "prestataires",
        title: "12. Prestataires et sous-traitants",
        paragraphs: [
          "Supabase est utilisé par le code de l’application pour l’authentification et l’accès aux données. Les entités contractantes, rôles de traitement, sous-traitants ultérieurs et fonctions réellement déployées doivent être confirmés à partir des contrats et de la configuration de production.",
          "Aucun autre fournisseur de messagerie, d’analytique ou de stockage de fichiers n’est désigné ici sans vérification de son rôle effectif.",
        ],
      },
      {
        id: "hebergement-transferts",
        title: "13. Hébergement et transferts internationaux",
        paragraphs: [
          "La région d’hébergement, les lieux de traitement et tout transfert international ne peuvent pas être déduits du seul code source consulté. Ils doivent être vérifiés dans le projet Supabase, les contrats fournisseurs et la configuration de déploiement.",
          "Les garanties applicables aux transferts éventuels doivent être déterminées et décrites par EXCI-MAA avec ses conseils. Aucune localisation exclusive n’est affirmée.",
        ],
      },
      {
        id: "conservation",
        title: "14. Durées et critères de conservation",
        paragraphs: [
          "Aucune durée de conservation approuvée n’a été trouvée dans les éléments examinés. EXCI-MAA doit fixer des durées ou critères par catégorie et finalité, en tenant compte des obligations comptables, contractuelles, professionnelles et légales applicables.",
          "Les dossiers professionnels ou documents légalement requis peuvent devoir être conservés après la fermeture d’un compte, lorsque la loi ou les règles applicables l’exigent.",
        ],
      },
      {
        id: "archivage-suppression",
        title: "15. Archivage, suppression et clôture du compte",
        paragraphs: [
          "La clôture d’un compte ne provoque pas nécessairement la suppression immédiate des données présentes dans les dossiers professionnels. Les procédures d’archivage, de suppression, de sauvegarde et de traitement des demandes de suppression doivent être confirmées avec les responsables et les fournisseurs concernés.",
          "Les exceptions de conservation doivent reposer sur une base applicable et être communiquées clairement aux personnes concernées.",
        ],
      },
      {
        id: "securite",
        title: "16. Sécurité",
        paragraphs: [
          "EXCI-MAA doit mettre en œuvre des mesures techniques et organisationnelles adaptées aux risques, contrôler les accès et traiter les incidents selon ses procédures. Les utilisateurs contribuent à la sécurité en protégeant leurs identifiants et en signalant les anomalies.",
          "Les mesures concrètes et leur périmètre doivent être vérifiés par les responsables compétents. Aucune sécurité absolue ni certification n’est revendiquée par ce projet.",
        ],
      },
      {
        id: "droits",
        title: "17. Droits des personnes",
        paragraphs: [
          "Selon la loi applicable et la situation, les personnes peuvent disposer de droits relatifs à leurs données, tels que l’accès, la rectification, l’effacement, la limitation, l’opposition, la portabilité ou le retrait d’un consentement lorsque le traitement repose sur celui-ci. Ces droits peuvent être soumis à des conditions ou exceptions.",
          "La liste définitive, les exceptions et l’autorité compétente doivent être confirmées par les conseils d’EXCI-MAA pour les juridictions concernées.",
        ],
      },
      {
        id: "demandes",
        title: "18. Exercice des droits et demandes",
        paragraphs: [
          "Les demandes doivent être adressées au contact confidentialité officiel d’EXCI-MAA, qui reste à confirmer. La personne peut être invitée à fournir les éléments nécessaires pour vérifier son identité et préciser sa demande, sans collecte excessive.",
          "Les modalités de traitement, délais de réponse et voies de recours doivent être validés conformément au droit applicable.",
        ],
      },
      {
        id: "cookies",
        title: "19. Cookies et technologies similaires",
        paragraphs: [
          "L’application utilise le stockage local du navigateur pour conserver notamment la préférence de langue et le thème, et l’authentification peut recourir aux mécanismes de session du fournisseur utilisé.",
          "La présence de cookies, outils d’analyse ou autres traceurs dans le déploiement réel n’a pas été établie. Leur inventaire, leurs finalités et les choix offerts aux utilisateurs doivent être vérifiés avant publication.",
        ],
      },
      {
        id: "mineurs",
        title: "20. Données des mineurs",
        paragraphs: [
          "PAJES est présenté comme un outil professionnel destiné aux utilisateurs autorisés d’EXCI-MAA, et non comme un service destiné aux enfants. Les éventuelles données de mineurs contenues dans des dossiers professionnels nécessitent une analyse spécifique selon le contexte et le droit applicable.",
        ],
      },
      {
        id: "mises-a-jour",
        title: "21. Mises à jour de la politique",
        paragraphs: [
          "Toute version publiée devra préciser sa version, ses dates d’effet et de mise à jour, et expliquer comment les changements importants seront portés à la connaissance des utilisateurs et personnes concernées.",
          "La procédure de notification et l’approbation des mises à jour sont à confirmer par EXCI-MAA.",
        ],
      },
      {
        id: "contact-date",
        title: "22. Contact, version et dates",
        paragraphs: [
          "Pour une question relative à la confidentialité ou une demande concernant des données personnelles, contactez EXCI-MAA via son canal officiel. Le contact dédié, l’identité légale complète et les coordonnées de publication sont à confirmer.",
          "Version de travail 0.1. Aucune date d’entrée en vigueur ou de dernière mise à jour n’est publiée tant que le contenu n’a pas été approuvé.",
        ],
      },
    ],
  },
};

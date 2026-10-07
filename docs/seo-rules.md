# Règles SEO — standard pour nos nouveaux sites

Oct 6, 2026 · @Martin Ferret

## Objet et mode d'emploi

Tout nouveau site respecte ces règles avant sa mise en ligne, puis à chaque nouvelle page. Elles viennent des deux audits SEO réalisés par Julien Houyet le 3 octobre 2026, sur takeoutreader.com et dtv-thailand.com, et de ce que nous avons vérifié ensuite sur ces sites.

Les deux audits arrivent au même diagnostic : des sites propres techniquement, au contenu solide, mais mal ciblés. TakeoutReader avait 35 mots-clés et environ 29 visites par mois, DTV Thailand 1 mot-clé et environ 2 visites. Le problème n'était ni l'indexation ni la qualité, mais l'absence d'une requête claire par page et des incohérences d'information.

**Comment l'utiliser**

- Les règles sont numérotées (R1, R2…) pour pouvoir y renvoyer dans un ticket ou une revue de code.
- Toutes sont obligatoires, sauf celles marquées _(si pertinent)_.
- Les checklists de la fin servent au quotidien : avant lancement, à chaque nouvelle page, à chaque changement d'information et chaque mois.
- L'annexe liste les erreurs réelles des deux audits, avec la règle qui les évite.
- Les exemples techniques supposent notre stack habituelle : Next.js avec rendu côté serveur.

## 1. Règle n°1 : un mot-clé = une page

Chaque page vise une seule requête principale, et chaque requête n'a qu'une seule page. C'est le point déterminant des deux audits : un excellent contenu sans requête claire ne se classe sur rien.

**R1 — Une requête principale par page.** Les variantes d'une même intention vont sur la même page (« dtv visa thailand requirements » et « thailand dtv visa requirements »). Des intentions différentes vont sur des pages différentes.

**R2 — Le mot-clé se lit à trois endroits** : le title, le H1 et l'URL (dans le slug, ou dans le nom de domaine pour l'accueil).

**R3 — Jamais deux pages sur la même requête.** Quand une page doit aborder le sujet d'une autre, elle le fait en 2 phrases maximum, avec un lien vers la page propriétaire. Pas de H2 sur ce sujet. _Cas réel : /what-is-google-takeout se classait sur « takeout google com legit », qui appartenait à /is-google-takeout-safe._

**R4 — Une page ne couvre pas plusieurs requêtes.** Si un sujet a plusieurs demandes distinctes, on fait une page hub courte et une page dédiée par requête. _Cas réel : /google-activity-viewer couvrait YouTube, Search, Chrome et MyActivity, et ne se classait sur aucun._

**R5 — Le mot-clé commercial appartient à la page qui vend.** La requête du produit (« google takeout viewer », « dtv visa thailand ») est réservée à l'accueil ou à la page produit. Aucun guide, aucune page About ne l'utilise dans son title, son H1 ou ses H2. _Cas réel : Google affichait un guide en position 42 sur « google takeout viewer » à la place de l'accueil._

**R6 — Viser la formulation la plus cherchée d'une intention.** Avant de fixer un title, comparer les formulations. _Cas réel : « google takeout instructions » (110 recherches) au lieu de « how to use google takeout » (1 000)._

**R7 — Tenir une carte mots-clés à jour**, dans le dépôt du projet ou un tableur partagé, avant de créer la moindre page :

| Mot-clé principal         | Variantes               | Volume | Intention   | Page                       | Statut   |
| ------------------------- | ----------------------- | ------ | ----------- | -------------------------- | -------- |
| google takeout viewer     | —                       | 320    | Commerciale | /                          | En ligne |
| how to use google takeout | how do i use, how to do | 1 000  | Info        | /how-to-use-google-takeout | En ligne |

Toute nouvelle page commence par une ligne dans ce tableau. Si le mot-clé y figure déjà, on enrichit la page existante au lieu d'en créer une.

## 2. Recherche de mots-clés avant de construire

La liste des pages découle de la recherche de mots-clés, jamais l'inverse. On la fait avant de dessiner l'arborescence.

**R8 — Chercher dans le pays visé.** Volumes et positions se lisent pour le marché réel (États-Unis pour TakeoutReader). Les volumes sont des ordres de grandeur, pas des chiffres exacts.

**R9 — Domaine jeune = longue traîne d'abord.** Avec une autorité de 3 à 6 sur 100, la requête principale du secteur n'est pas atteignable à court terme. _Cas réel : « dtv visa thailand » (14 800/mois) est tenu par les consulats, Reddit et des cabinets d'autorité 50._ On vise des requêtes précises de plusieurs mots où la page 1 contient des sites d'autorité inférieure à 25 environ.

**R10 — Regarder la page de résultats avant de choisir.** Pour chaque requête cible, noter le type d'acteurs du top 3 : officiel, forum, cabinet, petit outil, blog. Un top 3 de petits sites ou de blogs = accessible. Un top 3 d'officiels et de sites d'autorité 50+ = objectif long terme.

**R11 — Classer chaque requête par intention** et prioriser celles proches de l'achat :

| Intention        | Exemple                                      | Priorité                             |
| ---------------- | -------------------------------------------- | ------------------------------------ |
| Pré-achat        | dtv visa cost, dtv visa requirements         | Haute                                |
| Transactionnelle | dtv visa application, apply for dtv visa     | Haute                                |
| Commerciale      | dtv visa agent, alternatives à un concurrent | Haute                                |
| Info             | what is google takeout                       | Moyenne, pour le volume              |
| Post-achat       | dtv visa 90 days report, bank account        | Basse, pour la fidélité et les liens |

**R12 — Regrouper par étape du parcours** : comprendre, se qualifier, passer à l'action, après l'achat. Ces étapes deviennent les rubriques du menu (section 3).

**R13 — Repérer les grosses requêtes adjacentes** que le produit couvre déjà. _Cas réel : « google takeout photos » (12 100/mois) n'avait pas de page alors que l'outil analyse Google Photos._

**R14 — Exploiter les requêtes de marques concurrentes** avec une page comparative honnête. _Cas réel : l'accueil de TakeoutReader se classait sur « corbett », « 4n6 » et « recoverytools google takeout viewer »._

**R15 — Repérer les mots ambigus.** Si le mot-clé a un autre sens (« takeout » fait remonter des restaurants), garder la formulation exacte complète en début de title.

**R16 — Quand une règle dépend du pays, prévoir une page par pays.** _Cas réel : depuis le 31 août 2026, le DTV se dépose depuis son pays de nationalité ou de résidence ; dtv.in.th se classe avec une autorité de 19 grâce à une page par pays de dépôt._

**R17 — Mesurer la demande par langue** avant toute version traduite (section 11).

## 3. Architecture, URLs et slugs

Le modèle de TakeoutReader est la référence : architecture plate, menus par étape du parcours, fil d'Ariane, URLs descriptives.

**R18 — Profondeur de 2 clics maximum** depuis l'accueil pour toute page qui doit se classer.

**R19 — Les rubriques suivent le parcours** défini en R12. Exemple : un menu « Guides » en 3 étapes (avant, pendant, après) et un menu « Outils » ou « Offres ». Chaque nouvelle page est rangée dans la bonne étape.

**R20 — Chaque catégorie a sa propre page.** Une rubrique ne pointe jamais vers un simple article. _Cas réel : les catégories « workation » et « soft power » avaient leur page, mais la catégorie « famille » renvoyait vers un article._

**R21 — Fil d'Ariane visible** sur tous les guides et pages de catégorie, et balisé (section 10).

**R22 — Le slug contient les mots du mot-clé absents du domaine.** Le domaine couvre déjà certains mots (« dtv », « thailand », « takeout », « reader ») : le slug ajoute les autres. Minuscules, mots séparés par des tirets, pas de mots vides inutiles.

| À éviter                              | À faire                       |
| ------------------------------------- | ----------------------------- |
| /lanes/workation                      | /lanes/digital-nomad-visa     |
| /field-notes/the-dtv-in-plain-english | /field-notes/what-is-dtv-visa |
| /timeline                             | /google-maps-timeline-viewer  |
| /google-takeout-instructions          | /how-to-use-google-takeout    |

**R23 — Pas de slug éditorial ou de nom de produit interne.** Le slug décrit la requête, pas le ton de la marque.

**R24 — L'accueil reste à la racine.** C'est la seule exception assumée à R2 : le mot-clé commercial y est porté par le domaine, le title et le H1.

**R25 — Slugs figés avant le lancement.** Renommer coûte cher. Si c'est inévitable :

1. Redirection 301 de l'ancienne URL vers la nouvelle.
2. Mise à jour du sitemap, des canonical, des hreflang et de tous les liens internes (menus, footer, liens dans le texte).
3. Renommer toutes les langues en une seule fois, pour ne rediriger qu'une fois.
4. Si la page avait des positions, prévoir 2 à 4 semaines de fluctuation. Sans position, renommer immédiatement.

**R26 — Pas d'URL à paramètre indexable comme page distincte.** Une URL comme /?demo=1 porte un canonical vers l'URL sans paramètre.

## 4. Title, meta description et titres Hn

Le title et le H1 sont les deux premiers signaux de pertinence. Le ton éditorial de la marque se garde, mais dans le sous-titre et le corps de page.

### Title

**R27 — Format : `[Mot-clé] : [promesse] | Marque`**, environ 60 caractères maximum, mot-clé en tête.

**R28 — Suffixe de marque court.** « | DTV Thailand », pas « · Field notes · DTV Thailand », qui consommait 28 caractères sur environ 60.

**R29 — Jamais de title purement éditorial.** _Cas réel : « The 500,000 THB question » ne contenait ni « DTV », ni « visa », ni « requirement »._

**R30 — Mot-clé générique avant le nom de produit.** « Google Maps Timeline Viewer: Read Your Timeline Export », pas « Timeline Reader: Open & Read… ».

**R31 — L'année en suffixe est autorisée sur les guides** (« (2026) ») si le contenu est vraiment mis à jour chaque année.

**R32 — Les pages institutionnelles n'utilisent pas le mot-clé commercial.** About, mentions légales, confidentialité, conditions : title au nom de la marque uniquement. _Cas réel : « About TakeoutReader - Google Takeout Viewer & Reader Tool »._

| Page    | Mauvais title                                                  | Bon title                                                   |
| ------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| Accueil | DTV Thailand · Independent visa concierge for the Thailand DTV | DTV Visa Thailand: File Prepared in 2 Days, From $199       |
| Article | The 500,000 THB question · Field notes · DTV Thailand          | DTV Visa Financial Requirements: The 500,000 THB Rule       |
| Guide   | Google Takeout Instructions: Step-by-Step Export Guide         | How to Use Google Takeout: Step-by-Step Instructions (2026) |

### Meta description

**R33 — 155 caractères maximum.** Au-delà, Google coupe. _Cas réel : la meta de l'accueil TakeoutReader faisait environ 300 caractères._

**R34 — Précise et chiffrée** : ce que la page apporte, un chiffre ou un délai, et la promesse principale. Unique pour chaque page.

### H1 et sous-titres

**R35 — Un seul H1 par page, contenant le mot-clé.** La phrase éditoriale passe en sous-titre. Exemple : H1 « Thailand DTV visa, prepared for you », sous-titre « Move to Thailand for five years. ».

**R36 — Title et H1 se modifient ensemble.** _Cas réel : après correction des titles, plusieurs H1 étaient restés sur l'ancien mot-clé (« Google Takeout Instructions », « Google Takeout JSON Viewer »)._

**R37 — Le H1 de la page commerciale contient le mot-clé seul**, sans mélange. « Google Takeout Viewer », pas « Google Takeout Viewer & Reader ».

**R38 — Les H2 sont des questions telles qu'on les tape** (« What is Google Location History? », « How do I see it? »), suivies d'une réponse de 2 à 3 phrases.

**R39 — Aucun H2 ne vise la requête d'une autre page** (voir R3).

## 5. Maillage interne et ancres

Les liens internes disent à Google quelles pages comptent et sur quel sujet. Le texte du lien (l'ancre) est un signal aussi fort que le lien lui-même.

**R40 — Chaque nouvelle page reçoit au moins 3 liens** depuis des pages existantes, dans le texte, le jour de sa mise en ligne.

**R41 — Les ancres reprennent le mot-clé de la page cible** (« DTV visa requirements », « DTV visa cost »). Les ancres génériques sont interdites dans le texte : « Home », « The rule in full », « How a family file works », « click here ».

**R42 — La page commerciale reçoit un lien contextuel par guide**, avec son mot-clé exact en ancre. Exemple : « TakeoutReader is a Google Takeout viewer that reads the whole archive… ». _Cas réel : aucune page de TakeoutReader ne liait l'accueil avec l'ancre « Google Takeout viewer »._

**R43 — Les boutons d'action gardent leur texte d'action** (« Open your Takeout », « Start my eligibility check »). R42 s'ajoute aux boutons, il ne les remplace pas.

**R44 — Relier articles et catégories dans les deux sens.** Chaque article lie sa catégorie, chaque catégorie liste ses articles.

**R45 — Quatre types de liens sur chaque site** : menu principal par étape, footer « Guides », liens contextuels dans le texte, bloc de guides sur l'accueil.

**R46 — Footer identique dans toutes les langues et sur toutes les pages.** _Cas réel : le lien « Why trust us » manquait dans le footer de l'accueil anglais de DTV Thailand._

**R47 — La page de confiance est liée depuis l'accueil** et le footer (section 9).

**R48 — Après un renommage de slug ou de mot-clé, mettre à jour les ancres** qui pointent vers la page. _Cas réel : des liens « Google Takeout JSON viewer » pointaient encore vers la page devenue « JSON files »._

## 6. Indexation technique

Les deux sites étaient propres sur ce plan, à quelques erreurs près qui se répètent : on les fige ici pour ne plus les refaire.

### Sitemap

**R49 — Le sitemap ne contient que les pages qui doivent se classer.** On en exclut les pages utilitaires : contact, mentions légales, confidentialité, conditions de vente, formulaires, paiement. Elles restent accessibles et indexables, sauf R55.

_Note : les deux audits divergeaient (ajouter /terms pour TakeoutReader, retirer /legal et /privacy pour DTV Thailand). Nous retenons l'exclusion, qui concentre l'exploration sur les pages utiles._

**R50 — Une vraie date de modification (lastmod) par page**, celle du dernier changement de contenu. Jamais la date du déploiement. _Cas réel sur les deux sites : toutes les URLs portaient la même date, celle du dernier build._ En Next.js, la tirer d'un champ `updatedAt` du contenu ou de l'historique git du fichier.

**R51 — Chaque nouvelle page entre dans le sitemap à sa publication**, avec ses alternatives linguistiques (section 11). Les balises changefreq et priority sont ignorées par Google : facultatives.

### Robots, canonical, noindex

**R52 — robots.txt minimal** : bloquer les routes techniques (/api/, /checkout/, le proxy d'analytics comme /ingest/), autoriser les robots des moteurs IA, déclarer le sitemap. Pas de directive « Host: », obsolète.

**R53 — Canonical absolu et auto-référent sur chaque page**, par langue.

**R54 — Les URLs à paramètres pointent leur canonical vers l'URL propre** (voir R26).

**R55 — noindex sur les pages sans valeur propre ou en doublon.** _Cas réel : /start était un simple formulaire qui doublonnait le quiz d'éligibilité._

### Hôte et redirections

**R56 — Un seul hôte canonique** (avec ou sans www, toujours en HTTPS). L'autre version redirige en une seule étape.

**R57 — Aucune redirection sur le chemin des liens internes et du sitemap.** Ils pointent directement vers l'URL finale. _Cas réel sur les deux sites : une redirection coûtait 630 ms sur mobile._

**R58 — Barre oblique finale cohérente** : choisir avec ou sans, et s'y tenir partout (Next.js : `trailingSlash`).

**R59 — Une vraie page 404** qui renvoie le code 404, avec des liens vers les guides principaux.

### Search Console

**R60 — Search Console connectée avant le lancement**, en propriété de domaine, avec le sitemap déclaré. Aucun des deux audits n'a pu s'appuyer sur des données réelles faute d'accès.

## 7. Performance et Core Web Vitals

Les deux sites étaient excellents sur desktop et trop lents sur mobile, que Google évalue en priorité. Le seuil se tient sur mobile, pas sur desktop.

| Mesure                              | Seuil    | TakeoutReader (mobile) | DTV Thailand (mobile) |
| ----------------------------------- | -------- | ---------------------- | --------------------- |
| LCP, affichage du contenu principal | < 2,5 s  | 5,3 s                  | 4,1 s                 |
| TBT, blocage du navigateur          | < 200 ms | 189 ms                 | 10 ms                 |
| CLS, stabilité visuelle             | < 0,1    | 0                      | 0                     |

**R61 — Objectif avant lancement : LCP mobile sous 2,5 s** dans PageSpeed Insights, sur l'accueil et sur un guide type.

**R62 — Zéro redirection** entre l'URL demandée et la page (voir R56 et R57).

**R63 — Charger le code lourd à la demande.** Les bibliothèques qui ne servent qu'après une action de l'utilisateur se chargent par import dynamique au moment de l'action. _Cas réel : JSZip et les parseurs, soit 215 Ko de JavaScript inutilisé, étaient chargés avant même le dépôt d'un fichier._

**R64 — Pas de vidéo chargée d'office.** Image fixe (poster) affichée d'abord, vidéo chargée au clic ou à l'entrée dans l'écran. _Cas réel : deux vidéos sur l'accueil de TakeoutReader._

**R65 — Images dimensionnées.** `next/image` avec un attribut `sizes` réaliste, `priority` uniquement sur l'image principale de l'écran d'accueil. _Cas réel : l'image d'en-tête de DTV Thailand était demandée jusqu'à 3 840 px de large._

**R66 — Polices via `next/font`**, sous-ensemble limité aux caractères utiles, pas de police externe bloquante.

**R67 — Contrôler le JavaScript inutilisé** avec l'analyseur de bundle avant chaque lancement, et après tout ajout de dépendance importante.

**R68 — Mesurer à chaque release majeure** : PageSpeed mobile sur l'accueil et une page de contenu, et rapport Core Web Vitals de Search Console chaque mois.

## 8. Cohérence, fraîcheur et fiabilité du contenu

Une information qui se contredit d'une page à l'autre fait perdre la confiance de Google, des moteurs IA et des prospects. Sur un sujet sensible (visa, argent, vie privée, santé), c'est rédhibitoire.

**R69 — Une source unique pour chaque donnée chiffrée.** Prix, durées, délais, règles, nombre de questions d'un quiz, nom de la marque : tout vit dans un fichier de configuration ou de contenu central, importé par les pages, les FAQ, le glossaire et les données structurées. Jamais tapé en dur dans un texte.

_Cas réels sur DTV Thailand : 69 $ / 189 $ dans le glossaire contre 99 $ / 199 $ sur l'accueil, passeport valable 12 mois contre 6 mois, quiz de 7 questions contre 6, ancien nom « DTV Help ». Sur TakeoutReader : durée de conservation de 18 mois sur deux pages, 3 mois sur une autre._

**R70 — Une question = une réponse sur tout le site.** Pas de FAQ dupliquée entre deux pages. _Cas réel : la FAQ du glossaire reprenait celle de l'accueil, avec d'anciennes réponses._

**R71 — Dater les informations qui changent** : « depuis le 31 août 2026 », « par défaut depuis juin 2020 ».

**R72 — Procédure de changement de règle ou de prix.** Quand une règle externe ou un tarif change :

1. Mettre à jour la source unique (R69).
2. Chercher dans tout le dépôt et toutes les langues les anciennes valeurs et les anciens termes (grep sur « Vientiane », « $69 », « 12 months »…).
3. Réécrire les pages concernées, glossaire compris.
4. Mettre à jour la date « Last updated » visible et le lastmod.

**R73 — Pas d'élément daté codé en dur.** Bandeaux de type « cohorte », mois en cours, année : générés dynamiquement ou supprimés. _Cas réel : « August cohort » sur le glossaire, « October cohort » sur l'accueil._

**R74 — Les textes d'action respectent la promesse du produit.** _Cas réel : des boutons « Upload your Takeout » à côté de la promesse « Nothing uploaded »._ Avant le lancement, relire tous les boutons et micro-textes à la lumière de la promesse principale.

**R75 — Pas de prix barré permanent.** Une réduction affichée doit être réelle et datée (règles européennes sur les annonces de réduction, règles de la FTC sur les comparaisons de prix aux États-Unis). Ce n'est pas un avis juridique : en cas de doute, ne pas barrer.

**R76 — Chasser les anciens noms.** Après un changement de marque ou de nom d'offre, grep sur l'ancien nom dans tout le dépôt et toutes les langues.

## 9. Confiance et expertise visibles

Google et les moteurs IA veulent savoir qui parle, avec quelle expertise et sur quelle base. Plus le sujet est sensible, plus l'exigence est forte.

**R77 — Chaque article est signé par une personne nommée**, pas par la marque. Courte bio et lien vers la page équipe ou About. _Cas réel : les field notes de DTV Thailand étaient signées « DTV Thailand »._

**R78 — Dates visibles sur chaque guide** : date de publication et date de dernière mise à jour. _Cas réel : aucune date visible sur les guides de TakeoutReader._

**R79 — Une page About ou équipe avec une vraie personne** : nom, photo, parcours, raison d'être du site.

**R80 — Une page de confiance pour les services** (type « Is X legit? ») : entité légale, SIREN, lien vers le registre officiel, adresse, contact. Liée depuis l'accueil et le footer (R47).

**R81 — Lier les sources officielles** : documentation Google, site officiel du visa, textes réglementaires. Un fait vérifiable vaut mieux qu'une affirmation.

**R82 — Faits techniques vérifiables.** Expliquer comment ça marche, et inviter à vérifier quand c'est possible (« ouvrez l'onglet Réseau, rien ne part »).

**R83 — Témoignages réels**, traduits ou annotés dans les versions non anglaises (section 11).

**R84 — Sujets sensibles (visa, argent, santé, données personnelles) : niveau d'exigence maximal.** Toutes les règles de cette section et de la section 8 deviennent bloquantes pour la mise en ligne.

## 10. Données structurées (JSON-LD)

Le balisage JSON-LD décrit chaque page à Google et aux moteurs IA. Chaque type de page porte un balisage précis, généré par le code à partir des mêmes données que la page.

| Balisage                                      | Pages                               | Contenu minimum                                          |
| --------------------------------------------- | ----------------------------------- | -------------------------------------------------------- |
| Organization ou ProfessionalService           | Accueil, About                      | Nom, logo, URL, contact, adresse ; SIREN pour un service |
| WebApplication ou SoftwareApplication + Offer | Page produit uniquement             | Nom, catégorie, fonctionnement, prix et devise           |
| Service + Offer                               | Page des offres                     | Chaque offre, son prix et sa devise                      |
| Article + auteur Person                       | Tous les guides et articles         | Titre, auteur nommé, datePublished, dateModified         |
| FAQPage                                       | Pages avec une section de questions | Questions et réponses visibles sur la page               |
| BreadcrumbList                                | Guides, catégories, outils          | Chemin identique au fil d'Ariane visible                 |

**R85 — Le balisage reprend exactement le texte visible**, prix compris. Les valeurs viennent de la source unique (R69).

**R86 — Le balisage produit n'est que sur la page produit.** _Cas réel : le balisage WebApplication de TakeoutReader, avec « Google Takeout Viewer » en nom alternatif, était chargé sur toutes les pages via le layout._

**R87 — FAQPage même sans affichage enrichi.** Google réserve les FAQ enrichies aux sites d'autorité, mais le balisage aide les moteurs IA à extraire les réponses.

**R88 — Validation avant lancement** avec le test des résultats enrichis de Google, sur un exemple de chaque type de page. Revalider après chaque changement de template.

## 11. Multilingue

Une langue ne s'ouvre que si la demande est mesurée et qu'on peut servir les clients dans cette langue. DTV Thailand a ouvert 6 langues, soit 108 URLs à maintenir, alors que l'italien, l'espagnol et le portugais n'avaient aucune demande mesurable et que le support n'existait qu'en anglais, français et espagnol.

### Décider

**R89 — Lancer en une seule langue**, celle du marché principal, et consolider avant d'en ajouter.

**R90 — Ouvrir une langue à deux conditions** : des requêtes mesurées dans cette langue (R17), et un support client dans cette langue. Sans support, on n'ouvre pas, ou la version passe en noindex.

**R91 — Tester une nouvelle langue sur 3 pages** (accueil, guide principal, guide pratique) avant de tout traduire.

**R92 — Afficher clairement la langue de suivi** sur chaque version si elle diffère de la langue de la page.

### Construire

**R93 — Un sous-répertoire par langue** : /fr/, /de/, /es/. La langue principale reste à la racine.

**R94 — Slugs traduits dès le départ** : /de/dtv-visum-voraussetzungen, pas /de/eligibility.

**R95 — hreflang réciproques** entre toutes les versions, plus une valeur **x-default** vers la langue principale. _Cas réel : x-default absent sur DTV Thailand._

**R96 — Canonical auto-référent par langue**, jamais vers la version anglaise.

**R97 — og:locale et og:locale:alternate complets** : la langue de la page, puis toutes les autres. _Cas réel : seule pt\_PT était listée, sur les pages anglaises comme françaises._

**R98 — Tout traduire** : title, meta, H1, corps, boutons, micro-textes, FAQ. Les témoignages sont traduits ou annotés « traduit de l'anglais ». Pas de terme anglais gardé tel quel s'il a un équivalent courant.

**R99 — Mot-clé local dans le title et le H1**, issu d'une recherche dans cette langue (« visa DTV thaïlande », « DTV Visum Thailand »), pas d'une traduction littérale.

**R100 — Compter le coût de maintenance.** Chaque changement de règle ou de prix se fait dans toutes les langues (R72) : N langues = N fois le travail.

## 12. Format des pages de contenu et moteurs IA (GEO)

Le format des guides de TakeoutReader et des field notes de DTV Thailand est déjà le bon : il est noté « excellent » pour les moteurs IA. On en fait le modèle obligatoire.

### Modèle de page guide

**R101 — Structure de chaque guide :**

1. H1 avec le mot-clé (R35), sous-titre éditorial facultatif.
2. Auteur, date de publication, date de mise à jour (R77, R78).
3. Réponse directe en 2 à 3 phrases, en haut de page, avant tout le reste.
4. H2 formulés comme des questions (R38), chacun ouvert par une réponse courte.
5. Tableaux pour les données comparables : délais par type, coûts par pays, étapes.
6. Section « Common questions » en fin de page, balisée FAQPage.
7. Un lien contextuel vers la page commerciale (R42) et un bouton d'action adapté à l'intention de la page.
8. Liens vers les sources officielles (R81) et vers 2 à 3 guides voisins.

**R102 — Le contenu répond d'abord à l'intention de la requête**, puis montre le produit. _Cas réel : sur « google takeout photos », l'intention est « exporter mes photos » ; la page explique l'export, puis ce que l'outil révèle de la bibliothèque._

**R103 — Page hub courte + pages dédiées** quand un sujet regroupe plusieurs requêtes (R4).

**R104 — Une page par pays ou par variante** quand la réponse change selon le pays (R16). Gabarit identique : autorité compétente, frais en devise locale, documents locaux, délais observés.

### Moteurs IA

**R105 — Robots IA autorisés** dans le robots.txt (GPTBot, ClaudeBot, PerplexityBot et équivalents).

**R106 — Réponses citables** : phrases autonomes, chiffrées, en début de section. Un moteur IA reprend une réponse qui se comprend hors contexte.

**R107 — Cohérence absolue des chiffres** (section 8). Un moteur IA peut citer la mauvaise version d'une information contradictoire, y compris une règle périmée.

**R108 — Signaux de confiance** (section 9) et **mentions sur des sites tiers** (section 13) : les moteurs IA recommandent surtout ce qui est cité ailleurs.

## 13. Liens externes et mentions tierces

Un nouveau domaine démarre avec une autorité de 3 à 6 sur 100 et une quinzaine à une vingtaine de domaines référents. Les liens restent le levier le plus fort une fois le ciblage corrigé, et le plus long à construire : on commence dès le lancement.

**R109 — Plan de liens dès le lancement**, pas après. Objectif : quelques domaines référents de qualité par mois.

**R110 — Reddit en son nom propre.** Répondre aux questions sur les subreddits du sujet, avec une vraie expertise, sans lien commercial systématique. Reddit est en page 1 sur la plupart des requêtes testées dans les deux audits. _Exemples : r/degoogle, r/privacy, r/DataHoarder pour TakeoutReader ; r/Thailand, r/digitalnomad pour DTV Thailand._

**R111 — Sources adaptées au type de produit :**

| Type de site            | Sources de liens                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Outil ou micro-SaaS     | Product Hunt, Show HN, listes « awesome » sur GitHub, annuaires d'outils                        |
| Service ou conciergerie | Articles invités sur des blogs du secteur, annuaires d'expatriés ou professionnels, partenaires |
| Tous                    | Blogs spécialisés, podcasts, réponses expertes sur les forums                                   |

**R112 — Jamais d'achat de liens** ni de réseaux de sites.

**R113 — Suivre chaque mois** le nombre de backlinks et de domaines référents (section 14).

## 14. Mesure et suivi

On mesure avec les vraies données de Search Console dès le premier jour, et on note un point de départ au lancement.

**R114 — Point de départ noté au lancement** : pages indexées, mots-clés positionnés, autorité de domaine, domaines référents, backlinks.

**R115 — Indicateurs suivis chaque mois :**

| Indicateur                                   | Où                                             | Ce qu'on vérifie                                   |
| -------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| Impressions et clics                         | Search Console, global et par langue           | La tendance monte                                  |
| Page affichée sur chaque requête commerciale | Search Console, Performances                   | C'est bien la page prévue (pas de cannibalisation) |
| Position moyenne                             | Search Console, requêtes de la carte mots-clés | Progression vers le top 10                         |
| Pages indexées / pages du sitemap            | Search Console, Pages                          | Pas d'écart inexpliqué                             |
| Core Web Vitals mobile                       | Search Console                                 | Tout en « Bon »                                    |
| Domaines référents et backlinks              | Outil SEO                                      | Progression régulière                              |
| Entonnoir de conversion                      | Analytics produit (PostHog)                    | Visite → action clé → paiement                     |

**R116 — Délais réalistes.** Les changements de title et la correction de cannibalisation agissent en quelques semaines. Les nouvelles pages demandent 3 à 6 mois. Pas de conclusion avant.

**R117 — Revue SEO complète à 6 mois** sur chaque site, interne ou externe, avec la carte mots-clés mise à jour.

## 15. Checklists

Copier la checklist voulue dans le ticket ou la PR concernée, et cocher au fur et à mesure.

### Avant le lancement d'un site

- [ ] Carte mots-clés créée : une requête par page, intention, volume (R7, R8 à R16)
- [ ] Arborescence par étape du parcours, chaque catégorie a sa page (R19, R20)
- [ ] Slugs définitifs avec les mots du mot-clé (R22 à R25)
- [ ] Titles au format `[Mot-clé] : [promesse] | Marque`, 60 caractères max (R27 à R32)
- [ ] Meta descriptions uniques, 155 caractères max (R33, R34)
- [ ] Un H1 par page avec le mot-clé, title et H1 cohérents (R35 à R37)
- [ ] Mot-clé commercial réservé à la page commerciale, absent de About et des guides (R5, R32)
- [ ] Liens contextuels vers la page commerciale avec son mot-clé en ancre (R42)
- [ ] Footer identique partout (R46)
- [ ] Sitemap : pages utiles seulement, lastmod réels (R49 à R51)
- [ ] robots.txt, canonical, noindex vérifiés (R52 à R55)
- [ ] Un seul hôte, zéro redirection interne (R56, R57)
- [ ] Page 404 (R59)
- [ ] LCP mobile sous 2,5 s sur l'accueil et un guide (R61 à R67)
- [ ] Source unique pour prix, durées, règles (R69)
- [ ] Aucune FAQ dupliquée, aucun élément daté codé en dur (R70, R73)
- [ ] Boutons et micro-textes relus face à la promesse (R74)
- [ ] Pas de prix barré permanent (R75)
- [ ] Auteur, dates, About et page de confiance en place (R77 à R80)
- [ ] Données structurées validées par type de page (R85 à R88)
- [ ] Multilingue : demande et support vérifiés, hreflang + x-default, slugs traduits (R89 à R99)
- [ ] Search Console connectée, sitemap déclaré, point de départ noté (R60, R114)
- [ ] Plan de liens démarré (R109 à R111)

### À chaque nouvelle page

- [ ] Requête ajoutée à la carte mots-clés, sans doublon (R7)
- [ ] Title, H1 et slug contiennent le mot-clé (R2)
- [ ] Structure du modèle de guide respectée (R101)
- [ ] Aucun H2 sur la requête d'une autre page (R39)
- [ ] Au moins 3 liens entrants avec ancre proche du mot-clé (R40, R41)
- [ ] Lien contextuel vers la page commerciale (R42)
- [ ] Ajoutée au menu, au sitemap et à toutes les langues ouvertes (R19, R51)
- [ ] Données structurées Article, FAQPage, BreadcrumbList (section 10)

### À chaque changement de prix, de règle ou de nom

- [ ] Source unique mise à jour (R69)
- [ ] Grep des anciennes valeurs dans tout le dépôt et toutes les langues (R72, R76)
- [ ] Pages, FAQ, glossaire et données structurées alignés
- [ ] Dates « Last updated » et lastmod mises à jour

### Revue mensuelle

- [ ] Indicateurs de R115 relevés et comparés au mois précédent
- [ ] Requêtes commerciales : la bonne page s'affiche (R5)
- [ ] Pages indexées = pages du sitemap
- [ ] Core Web Vitals mobile en « Bon »
- [ ] Contenus datés encore justes (R71, R73)
- [ ] Nouvelles mentions et liens obtenus (R113)

## Annexe : erreurs relevées dans les deux audits

Chaque erreur réelle des audits du 3 octobre 2026, avec la règle qui l'aurait évitée.

| Erreur                                                                                            | Site          | Règle    |
| ------------------------------------------------------------------------------------------------- | ------------- | -------- |
| Titles éditoriaux sans mot-clé (« The 500,000 THB question »)                                     | DTV Thailand  | R29      |
| H1 éditorial sans mot-clé (« Move to Thailand for five years. »)                                  | DTV Thailand  | R35      |
| Aucune page sur « dtv visa requirements » ni « thailand digital nomad visa »                      | DTV Thailand  | R7, R13  |
| Glossaire contredisant le site : règle de dépôt, prix, validité du passeport, nombre de questions | DTV Thailand  | R69, R72 |
| Ancien nom de marque « DTV Help »                                                                 | DTV Thailand  | R76      |
| FAQ dupliquée avec d'anciennes réponses                                                           | DTV Thailand  | R70      |
| Bandeau « August cohort » en octobre                                                              | DTV Thailand  | R73      |
| Slugs éditoriaux (/lanes/workation) et non traduits (/de/eligibility)                             | DTV Thailand  | R22, R94 |
| 6 langues dont 3 sans demande ni support                                                          | DTV Thailand  | R90      |
| x-default absent, og:locale:alternate faux                                                        | DTV Thailand  | R95, R97 |
| Pages utilitaires et formulaire dans le sitemap                                                   | DTV Thailand  | R49, R55 |
| Catégorie « famille » sans page propre                                                            | DTV Thailand  | R20      |
| Articles signés par la marque                                                                     | DTV Thailand  | R77      |
| Image d'en-tête jusqu'à 3 840 px                                                                  | DTV Thailand  | R65      |
| Guide classé à la place de l'accueil sur la requête commerciale                                   | TakeoutReader | R5, R42  |
| Une page sur 4 requêtes (/google-activity-viewer)                                                 | TakeoutReader | R4       |
| Deux pages sur la même requête (Timeline, « legit »)                                              | TakeoutReader | R3       |
| Title visant la petite formulation (instructions vs how to use)                                   | TakeoutReader | R6       |
| Aucun lien vers l'accueil avec le mot-clé commercial                                              | TakeoutReader | R42      |
| Page About utilisant le mot-clé commercial                                                        | TakeoutReader | R32      |
| H1 non mis à jour après changement de title                                                       | TakeoutReader | R36      |
| Boutons « Upload » face à la promesse « Nothing uploaded »                                        | TakeoutReader | R74      |
| Durée de conservation contradictoire (18 mois / 3 mois)                                           | TakeoutReader | R69      |
| Meta description d'environ 300 caractères                                                         | TakeoutReader | R33      |
| Prix barré permanent                                                                              | TakeoutReader | R75      |
| Balisage produit sur toutes les pages                                                             | TakeoutReader | R86      |
| JSZip et vidéos chargés d'office, LCP mobile 5,3 s                                                | TakeoutReader | R63, R64 |
| URL /?demo=1 explorable                                                                           | TakeoutReader | R26      |
| Aucune date ni auteur sur les guides                                                              | TakeoutReader | R77, R78 |
| Même lastmod sur toutes les URLs                                                                  | Les deux      | R50      |
| Redirection de 630 ms sur mobile                                                                  | Les deux      | R57      |
| Pas d'accès Search Console pour l'audit                                                           | Les deux      | R60      |

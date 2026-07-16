# Description AMO - version française

## Description courte

Surveille votre utilisation de Claude et vous notifie à l'approche d'une limite, avec un badge dans la barre d'outils, une tendance d'usage et un graphique sur 7 jours.

> Cette extension ne connaît **jamais** vos identifiants Claude.
> Il n'y a aucun formulaire de connexion, et l'extension ne lit, ne stocke ni n'envoie jamais votre mot de passe ou votre jeton de session.

**Description**
Claude of Duty est une petite extension Firefox qui surveille votre utilisation du forfait Claude et vous notifie à l'approche d'une limite, pour que vous le sachiez avant de l'atteindre.

Elle lit votre utilisation depuis l'API de Claude en utilisant votre session déjà ouverte, et fonctionne donc en arrière-plan. Vous n'avez pas besoin de garder la page d'utilisation ouverte.

**Ce qu'elle surveille**
Trois limites, chacune avec sa propre notification quand elle franchit le palier d'alerte et à nouveau lors de sa réinitialisation :

- Session en cours : la fenêtre glissante de 5 heures (réinitialisation affichée en heures).
- Tous les modèles : la limite hebdomadaire tous modèles confondus (réinitialisation affichée par jour).
- Modèle ciblé : la limite hebdomadaire du modèle actuellement soumis à un tel quota, identifiée par le nom de ce modèle. Si le modèle change, l'étiquette se met à jour automatiquement.

Le palier d'alerte vaut 5 % par défaut et peut être réglé sur 10 % ou 25 % depuis les préférences de l'extension. Quand une limite franchit un palier, la fenêtre d'alerte affiche les trois limites ensemble, pas seulement celle qui a changé.

**Dans le popup**
- La ligne de la session en cours est mise en valeur visuellement, car elle se réinitialise bien plus tôt que les limites hebdomadaires.
- Une ligne de tendance indique, à partir des dernières lectures, soit "Rythme compatible avec la réinitialisation." soit "À ce rythme : limite dans ~X h".
- Un graphique sur 7 jours trace l'historique de la limite de session, avec une ligne pointillée au niveau du palier d'alerte configuré.
- L'icône de la barre d'outils affiche en permanence l'utilisation de la session en cours sous forme de badge, coloré en vert, orange ou rouge selon la proximité de la limite.

**Fonctionnement**
- Appelle GET /api/organizations/{id}/usage sur claude.ai, authentifié par votre cookie de session. L'extension ne voit ni ne stocke jamais votre jeton.
- Trouve votre identifiant d'organisation automatiquement depuis /api/organizations.
- Interroge l'API selon un minuteur en arrière-plan, au démarrage du navigateur, et à la demande depuis le popup.

# System Magie

React-Oberfläche mit einer Three.js-Szene. Darstellung und Bedienung stammen aus dem bisherigen HTML-Prototyp; Three.js bleibt bewusst auf Version 0.169.0.

## Lokal starten

Node.js 24 verwenden (mit nvm: `nvm use`), dann:

```sh
npm ci
npm run dev
```

Die im Terminal angezeigte Adresse im Browser öffnen. Änderungen werden automatisch übernommen. Ein direktes Öffnen der `index.html` per Doppelklick wird nicht mehr unterstützt.

## Build und Prüfung

```sh
npm run build
npm run preview
```

Der Build prüft TypeScript und erstellt `dist/` mit HTML, JavaScript, CSS und Texturen. Dieser gesamte Ordner ist die veröffentlichbare Anwendung. Node.js ist nur für Entwicklung und Build notwendig, nicht auf dem Webserver.

## GitHub Pages

Im GitHub-Repository unter **Settings → Pages → Build and deployment → Source** einmalig **GitHub Actions** auswählen. Der Workflow `.github/workflows/deploy.yml` installiert bei jedem Push auf `main` die gesperrten Abhängigkeiten, prüft TypeScript, baut die Anwendung und veröffentlicht anschließend `dist/`. Er kann auch über **Actions → Deploy to GitHub Pages → Run workflow** gestartet werden.

Die Anwendung ist dann unter `https://kevinreuss.github.io/system-magie/` erreichbar, sobald Pages aktiviert und der erste Workflow erfolgreich ist. Relative Asset-Pfade funktionieren auch unter einer eigenen Domain. `dist/` und `node_modules/` werden nicht eingecheckt; `package-lock.json` wird eingecheckt.

## Aufbau

- `src/components/`: React-Oberfläche, einschließlich Seitenleiste und Figurenreglern.
- `src/scene/`: Szene, Tisch, Auswahl, Maus-/Touch-Steuerung, Figurensicht und Ressourcenfreigabe.
- `src/figures/`: Menschenfigur, Leuchtfigur, Farbauswahl, Größen und Vorschauen.
- `src/rooms/`: Raumkatalog und Winterraum mit Beleuchtung, Startkamera und Aufstellfläche.
- `src/state/`: typisierte Figurendaten und kleiner Store für die Oberfläche; keine Three.js-Objekte.
- `src/assets/textures/`: unveränderte Bilddaten aus dem Prototyp als reguläre Bilddateien.
- `original-files/`: historische Entwürfe, nicht Teil des Builds.

React verwaltet die Oberfläche; `createScene` stellt die Aktionen bereit und meldet Datenänderungen über den Store zurück. Die 3D-Animationsschleife läuft unabhängig von React. Positionen werden nach dem Ziehen/Drehen synchronisiert, statt React bei jedem Animationsframe neu zu rendern. Die Daten liegen bisher nur im Arbeitsspeicher; Speichern/Laden ist noch keine Funktion.

## Neue Figuren und Räume

**Figur:** Geometrie/Material in einem eigenen Modul in `src/figures/` erstellen und in `figureTypes` (`src/figures/index.ts`) registrieren. Der Eintrag enthält Anzeigename, Standardfarbname, Erzeugung und Einfärbung. Das Hinzufügen-Menü und die Vorschauen verwenden den Katalog automatisch. Die Figur braucht eine Bounding-Box für Größe und Begrenzung auf dem Brett. Gemeinsame Ressourcen gehören zur Bibliothek und werden erst mit ihr freigegeben; individuelle Geometrien/Materialien werden beim Löschen freigegeben.

**Raum:** Ein Modul nach dem Vorbild von `winterRoom.ts` anlegen, in `src/rooms/index.ts` registrieren und gegebenenfalls als `defaultRoom` wählen. Der Raum liefert Startkamera, Aufstellfläche, Beleuchtung und Aufbau. Der bestehende Tisch wird derzeit von der Szene ergänzt; ein Raum mit anderer Tischgeometrie braucht dazu passende Tischmaße. Eine sichtbare Raumauswahl ist bewusst noch nicht ergänzt.

Beim Abbau der Szene werden Animationsschleife und Listener beendet, Controls und GPU-Ressourcen freigegeben sowie verspätete Texturladevorgänge berücksichtigt. Das funktioniert auch beim erneuten Einbinden durch React Strict Mode während der Entwicklung.

## Prüfung der Migration

Der alte HTML-Prototyp und die React-Version wurden im selben Browser mit gleichen Fenstergrößen und Bedienaktionen verglichen: Startansicht, Farbmenüs beider Figurentypen, eingefärbte/vergrößerte Figur, Figurensicht, mobile Ansicht und Seitenleiste, Verschieben, Drehen und Kamera-Orbit. Die abschließenden Bildvergleiche waren pixelgleich; lediglich beim Orbit lag die maximale Abweichung eines Farbkanals bei 1 von 255. Zusätzlich wurde das wiederholte Erzeugen und Abbauen einer Szene während laufender Texturladevorgänge ohne übrig gebliebene Canvas-Elemente oder Laufzeitfehler geprüft. Diese Vergleichsaussage bezieht sich auf die geprüften Zustände, nicht auf alle denkbaren Geräte und Browser.

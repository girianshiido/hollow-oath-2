# Hollow Oath 2 — musique et bruitages

La bande originale est propre à Hollow Oath 2. Aucun morceau, motif ou
enregistrement de Hollow Oath n'a été repris. Les partitions MIDI éditables
et le programme de composition sont conservés avec le projet.

## Bande originale

| Fichier | Titre | Tempo | Construction | Durée approximative |
| --- | --- | --- | --- | --- |
| `music-title` | An Open Gate | 92 BPM | Flûte, hautbois, harpe et cordes ; thème, réponse, retour | 83,5 s |
| `music-camp` | A Fire for Two | 84 BPM | Clarinette, guitare, cordes et flûte ; respiration plus lumineuse | 68,6 s |
| `music-battle-1` | The Briar Road | 138 BPM | Flûte, hautbois et cordes rythmiques | 83,5 s |
| `music-battle-2` | Brass and Undertow | 144 BPM | Hautbois, clarinette, harpe et appuis syncopés | 80 s |
| `music-battle-3` | Across the Violet Sky | 152 BPM | Mélodie rétro, flûte et cordes | 75,8 s |
| `music-boss` | The Guardian Wakes | 160 BPM | Cors, cordes, timbales et réponse allégée | 72 s |
| `music-final` | Two Against the Eclipse | 168 BPM | Cors, cordes et contrechant final | 68,6 s |
| `music-bonus` | Lanterns Below | 128 BPM | Vibraphone, clarinette et harpe | 90 s |
| `music-victory` | A Promise Kept | 116 BPM | Courte fanfare résolue | 6,6 s |
| `music-defeat` | Embers Remain | 76 BPM | Descente de clarinette et cordes | 8,8 s |

Les huit grands morceaux bouclent sur la **totalité du fichier**, depuis
0 jusqu'à la durée exacte renseignée dans `music/audio-manifest.json`.
La victoire et la défaite sont des ponctuations non bouclées. Chaque grand
morceau utilise plusieurs phrases et une section centrale contrastée.

Le rendu de trois passages successifs permet de prélever le deuxième avec
les résonances instrumentales du passage précédent. Une jonction de 25 ms
rejoint la forme d'onde précédant exactement le début de boucle, ce qui
évite une coupure sèche des cordes et des réverbérations.

## Bruitages

`sfx-steel`, `sfx-fire`, `sfx-ice`, `sfx-heal`, `sfx-guard`, `sfx-reward`,
`sfx-select`, `sfx-hit` et `sfx-storm` sont synthétisés localement par le
programme, sans banque de bruitages externe. Le bruit aléatoire utilise une
graine fixe. Des enveloppes d'attaque et de fin évitent les clics.

## Formats et intégration

Tous les morceaux et bruitages existent en **OGG Vorbis** et **AAC/M4A**
dans `public/audio/`. Choisir OGG lorsque le navigateur le prend en charge
et AAC/M4A sinon. Les thèmes sont stéréo, à 44,1 kHz. Le SoundFont et les
WAV intermédiaires ne sont pas nécessaires à l'application.

Ne démarrer la lecture qu'après un geste de l'utilisateur ; respecter le
silence global, les volumes séparés et la suspension en arrière-plan. Le
cache hors ligne doit inclure le format effectivement utilisé et son
équivalent de secours pour garder l'installation autonome.

## Reproduction et contrôles

Prérequis : Python 3 avec `numpy`, FluidSynth, ffmpeg et une banque
General MIDI. Le chemin local par défaut est celui du
`MuseScore_General_HQ.sf2` déjà présent dans le projet voisin ; cette
banque n'est **pas distribuée** avec le jeu. Sa fonction est uniquement le
rendu local des instruments des compositions originales.

```sh
python3 scripts/compose-audio.py
```

Pour utiliser une autre banque, définir `HO2_SOUNDFONT` sur son chemin.
`--scores-only` produit les partitions sans rendu ; `--force` recrée les
enregistrements existants. Les WAV temporaires restent sous le répertoire
temporaire du système, dans `hollow-oath-2-audio`.

Le programme vérifie les hauteurs MIDI, les durées positives, l'absence de
recouvrement d'une même note sur un même instrument, les valeurs audio
finies et l'absence d'écrêtage. Le manifeste conserve les durées, niveaux
crête/RMS et écarts de jonction de boucle pour chaque thème.

Crédits : compositions, arrangement, partitions et synthèse des bruitages
créés pour Hollow Oath 2 pendant son développement. Rendu instrumental
local : FluidSynth et banque General MIDI ; encodage : ffmpeg.

## Mobile playback revision — Web Audio

All playback now uses a single `AudioContext` with master, music and effects
`GainNode` buses. Music and sound-effect sliders affect already-playing
sources immediately; global mute sets the master gain to zero and cancels
queued effects. No `HTMLAudioElement.volume` setting is relied upon on iOS.

An explicit user gesture calls `unlock(scene)`. The scene is selected before
context resume or any asynchronous load, so starting a new adventure cannot
briefly launch the title track. Repeated unlock/play calls coalesce. A
zero-gain one-sample warm-up supports older iOS activation paths. Title and
selection music remain gesture-gated; character selection has its own theme,
**Four Roads, One Promise**, 108 BPM, 71.111179 seconds, reproduced with
`python3 scripts/compose-selection.py`. Existing main music masters are intact.

Music is decoded once and played by looping `AudioBufferSourceNode` sources.
Loop endpoints use the source-master length rounded to the decoded sample
rate, excluding possible AAC packet-padding silence. During a scene switch,
the current track stays audible until the next buffer is ready, then a short
160 ms crossfade replaces it. Stale decodes cannot revive an obsolete scene.
Victory and defeat are non-looping stingers and do not restart on repeated
renders of the same scene.

The loader tries actual OGG decoding, falls back to AAC if fetching or decoding
fails, and forgets failed requests so they can be retried. The decoded LRU cache
targets 72 MiB and at most two music buffers. The current and predictable next
scene are preloaded after activation; short effects are warmed sequentially.
Backgrounding immediately mutes the master and suspends the context. Returning
attempts a resume; a later user tap can replace a context left stalled by an
OS interruption. Audio remains best-effort if the operating system refuses
to resume it.

The new `sfx-steel-1/2/3` recordings combine moving air, a short impact,
inharmonic metallic resonances and a quiet stereo reflection. Sword playback
cycles these three actual recordings, with restrained speed variation. The
other effects now use layered noise, resonant partials and controlled attack
and decay envelopes rather than a single oscillator. Reproduce only these
effects with `python3 scripts/compose-sfx.py`; music masters are not rewritten.
Their measured durations and levels are in `public/audio/sfx-manifest.json`.

Automated fake-context tests cover live gain changes/mute, obsolete-decode
races, atomic/double unlock, keeping the old track while decoding, sample
loop boundaries, OGG-to-AAC fallback, retry after network failure, stingers,
background resume, stalled-context recovery, cache bounds and sword variants.
These tests do **not** constitute a physical iPhone SE/Safari/PWA audio test.
Device verification must still include initial activation, sliders/mute while
audio plays, at least two complete loops, scene switches, app backgrounding,
screen lock and return from an interruption.

Primary references: [Web Audio specification](https://webaudio.github.io/web-audio-api/),
[WebKit interrupted-context report](https://bugs.webkit.org/show_bug.cgi?id=273511),
and [WebKit PWA background-resume report](https://bugs.webkit.org/show_bug.cgi?id=291892).

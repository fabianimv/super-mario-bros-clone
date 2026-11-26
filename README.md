# Super Plomero Bros — Edición 16-Bit para Expo Go (iPhone 12)

Plataformero 2D a **60 FPS determinísticos** construido desde cero para **Expo Go (SDK 57)** con **React Native Skia**, **Reanimated 4**, **Taptic Engine (`expo-haptics`)** y un **sintetizador chiptune PCM de 16 bits (`expo-audio`)** diseñado y calibrado para jugar en horizontal en **iPhone 12**.

> **Referencia histórica:** El prototipo web original se conserva íntegro en [`super_plomero_bros_2d.html`](./super_plomero_bros_2d.html) en la raíz del repositorio.

---

## Cómo jugarlo en tu iPhone 12 (Expo Go)

1. Instala **Expo Go** desde el App Store en tu iPhone 12 y asegúrate de estar en la misma red Wi-Fi que tu Mac (o usa `--tunnel`).
2. En tu Mac, abre la terminal en este repositorio e inicia el servidor de desarrollo:

```bash
cd ~/Documents/fmrepos/super-mario-bros-clone
npx expo start
```

> Si tu Wi-Fi bloquea conexiones locales entre dispositivos, ejecuta `npx expo start --tunnel`.

3. Abre la app **Cámara** de tu iPhone 12, apunta al **código QR** de la terminal y toca **Abrir en Expo Go**.
4. El juego bloqueará automáticamente la pantalla en **modo horizontal (Landscape)** con márgenes seguros para el notch y la barra inferior del iPhone 12.

---

## Controles Táctiles (iPhone 12)

El mando multitáctil lee todos los toques activos en paralelo (`onTouchStart` / `onTouchMove` / `onTouchEnd`) para permitir deslizamiento continuo y acordes de botones como en una consola portátil real:

- **Cruceta D-Pad (pulgar izquierdo):** Desliza el pulgar entre **Izquierda (`◀`)**, **Derecha (`▶`)** y **Abajo (`▼`, agacharse)** sin despegar el dedo de la pantalla.
- **Botón `B` (Correr / Fuego):** Mantén presionado para esprintar a máxima velocidad (lo que incrementa la altura máxima de salto por inercia) y lanzar bolas de fuego.
- **Botón `A` (Saltar):** Salto sensible al tiempo de pulsación, con *Coyote Time* (6 frames), *Jump Buffer* (7 frames) y corrección de esquinas en bloques superiores.
- **Acorde `B + A` (Sprint + Salto con un solo pulgar):** La zona diagonal entre `B` y `A` activa **ambos botones simultáneamente** para correr a tope y saltar con la articulación del pulgar derecho sin soltar el sprint.
- **Botón `X` (Fuego / Turbo):** Disparo directo de bolas de fuego cuando tienes la Flor de Fuego.

### Modo 3: Plomero Expedición (nuevo, original)

Tercer modo con 5 mundos propios y 20 niveles, cada uno con su mecánica:

| Mundo | Mecánica |
|---|---|
| **A • Arrecife Coral** | Gravedad baja sobre los fosos (saltos flotantes) |
| **S • Selva Neón** | Plataformas de luciérnagas que se apagan |
| **E • Ciudad Engranaje** | Puentes frágiles que se desmoronan |
| **N • Reino de Algodón** | Ráfagas de viento |
| **C • Volcán Cristal** | Carámbanos de cristal que caen |

Usa champiñón y flor de fuego (como el clásico), enemigos de ambos modos, dos pistas de música originales y todas las fases: objetivos, bóvedas, portales secretos, chimeneas y habilidades.

### Modo 4: Plomero Dimensión 3D (nuevo, original)

Cuarto modo con **arte 3D low-poly** (three.js sobre `expo-gl`): bloques con volumen, luces, colinas en profundidad y cámara en perspectiva, con el mismo movimiento lateral y la misma física que el resto del juego. 8 mundos y 32 niveles:

| Mundo | Mecánica |
|---|---|
| **J • Jardín Estelar** | Gravedad baja |
| **T • Taller de Juguetes** | Hongos trampolín |
| **P • Polo Aurora** | Viento sobre hielo resbaladizo |
| **F • Fragua Lunar** | Puentes frágiles |
| **G • Galería Prisma** | Luces que se apagan |
| **H • Hongar Nevado** | Carámbanos sobre hielo |
| **R • Relojería Flotante** | Mixto: luces, puentes frágiles y gravedad baja |
| **N • Núcleo Cósmico** | Mixto final: carámbanos, viento y hongos trampolín |

Si el 3D no puede iniciar en un equipo, el modo se juega automáticamente con el renderer 2D; los otros modos no dependen del 3D.

### 🌍 Modo Reinos Abiertos (nuevo, motor propio)

Es el modo destacado del título. Tiene su propio motor (`src/realms/`) con **3 mundos abiertos enormes** (240–260 columnas × 70–90 filas) que se recorren libremente en las cuatro direcciones, con cámara libre, mapa con niebla de guerra, santuarios con viaje rápido y mejoras que abren zonas nuevas.

| Reino | Herramienta (X) | Acción (Y) | Mecánicas nuevas |
|---|---|---|---|
| **R-1 • Raíces Hondas** | Taladro: excava tierra, mineral y cristal (con el *Taladro de Diamante* también la piedra) | Plantar semilla: crece una enredadera trepable; desde su punta puedes plantar otra | Terreno 100 % destructible, ciclo día/noche (de noche aparecen plataformas de luciérnagas y sombras cazadoras; de día los girasoles te impulsan), oscuridad con linterna bajo tierra |
| **R-2 • Archipiélago Tinta** | Pintar: lanzas tinta que cubre las superficies | Cambiar color | **Azul** rebota, **naranja** te hace correr al doble, **verde** te pega a paredes y techos. Planeo manteniendo A, corrientes ascendentes, mar de tinta y borradores que limpian tu pintura. Los 6 objetivos son faros que se encienden con su color |
| **R-3 • Fosa Magnética** | Pulso magnético (daño en área) | Invertir polaridad (rojo/azul) | Los polos opuestos te atraen y te cuelgan de techos y paredes imantadas; los iguales te lanzan por los aires. Nado libre con oxígeno, columnas de burbujas, fosa abisal y tanque de O₂ |

**Comunes a los tres:** 6 fragmentos por reino abren el portal del santuario inicial; ▲ sobre un santuario viaja al siguiente; mantener **Y** te devuelve al último santuario; al morir reapareces en el santuario (sin *game over*) perdiendo parte de los orbes. Al restaurar un reino se abre el siguiente automáticamente. En el título, un piloto automático recorre Raíces Hondas de fondo.

### Habilidades del plomero

- **Llave inglesa (`X` sin flor ni capa; en el modo clásico también `Y`):** se lanza como bumerán y vuelve a tu mano. Derriba enemigos, golpea bloques, junta monedas y trae de vuelta gemas, relojes o llaves que estén lejos. Al jefe le quita 1 de vida por lanzamiento.
- **Salto en pared:** en el aire, empuja contra una pared para deslizarte lento por ella y pulsa `A` para rebotar hacia el lado contrario. Las **chimeneas** (dos paredes flotantes con monedas) esconden un cofre arriba que solo se alcanza así.
- **Deslizarse:** corriendo, pulsa `▼` para barrerte por el suelo. Pasas por huecos bajos y derribas a los enemigos comunes (goombas, koopas, rex). Los Spinies y las plantas siguen haciendo daño.

---

## Características Principales

- **Motor Gráfico GPU (`@shopify/react-native-skia`):** 171 sprites pixel-art hechos a mano compilados en un único `SkImage` atlas (`256×512`) con filtrado *Nearest-Neighbor* y extrusión de bordes de 1 px (cero costuras entre bloques) renderizado mediante `SkPictureRecorder` en un `SharedValue` sin re-renders de React.
- **24 Niveles en 6 Mundos (`1-1` a `6-4`):**
  1. **Mundo 1 — Pradera Sol** (Overworld clásico)
  2. **Mundo 2 — Caverna Cristal** (Subterráneo azul y tuberías con Plantas Piraña)
  3. **Mundo 3 — Dunas Doradas** (Desierto con plataformas móviles y Koopas Rojos)
  4. **Mundo 4 — Bosque Estelar** (Noche estrellada con Paratroopas alados y trampolines)
  5. **Mundo 5 — Cumbre Glaciar** (Picos nevados y Spinies acorazados)
  6. **Mundo 6 — Fortaleza Magma** (Castillos volcánicos con fosos de lava)
- **Batallas contra Jefes (`X-4`):** Cada cuarto nivel culmina frente al **Rey Koopa** escupiendo fuego sobre un puente colgante. Esquiva o derrótalo con bolas de fuego y toca el **Hacha Dorada** para colapsar el puente hacia la lava.
- **Mecánicas Auténticas:** Caparazones de Koopa pateables con combos en cadena (`200 → 400 → 800 → 1000 → 2000 → 5000 → 1-UP`), bloques ocultos de `1-UP`, banderines de *Checkpoint* a mitad de fase, Super Champiñón, Flor de Fuego, Super Estrella arcoíris, y selector de niveles con opción **Modo Libre** para probar cualquier mundo al instante.
- **Audio Chiptune & Háptica Nativa:** Sintetizador PCM de 16 bits (`22.05 kHz`) en memoria que genera 21 efectos NES (pulsos, triángulo y ruido LFSR) y 5 temas musicales en bucle, configurado con `playsInSilentMode: true` para sonar incluso con el interruptor lateral de silencio activo en iOS, acompañado de vibración háptica calibrada con `expo-haptics`.

---

## Scripts de Verificación

```bash
# Chequeo estricto de tipos TypeScript
npm run typecheck

# Suite automatizada: sprites, niveles, física 60 Hz, audio WAV y rutas de los 3 Reinos Abiertos
npm run verify
```

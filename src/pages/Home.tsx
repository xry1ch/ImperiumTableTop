import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { User, Users, Minus, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import imperiumLogo from "../assets/imperiumLogo.png";
import v1 from "../assets/video/bg1.mp4";
import v2 from "../assets/video/bg2.mp4";
import v3 from "../assets/video/bg3.mp4";
import v4 from "../assets/video/bg4.mp4";
import v5 from "../assets/video/bg5.mp4";
import v6 from "../assets/video/bg6.mp4";

type Screen = "intro" | "mode" | "groupSize" | "groupPlayers";

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makePlaylist(items: string[], avoidFirst?: string) {
  if (items.length <= 1) return [...items];
  const p = shuffle(items);
  if (avoidFirst && p[0] === avoidFirst) {
    const k = 1 + Math.floor(Math.random() * (p.length - 1));
    [p[0], p[k]] = [p[k], p[0]];
  }
  return p;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("intro");
  const navigate = useNavigate();

  // Grupo: tamaño 2..10
  const [groupCount, setGroupCount] = useState(5);
  const MIN_GROUP = 2;
  const MAX_GROUP = 10;

  // Nombres de jugadores
  const [players, setPlayers] = useState<string[]>([]);

  const videos = useMemo(() => [v1, v2, v3, v4, v5, v6], []);
  const [playlist, setPlaylist] = useState<string[]>(() =>
    makePlaylist(videos)
  );
  const [pos, setPos] = useState(0);

  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const [active, setActive] = useState<"A" | "B">("A");

  const currentSrc = playlist[pos];
  const nextSrc = pos + 1 < playlist.length ? playlist[pos + 1] : undefined;

  const getEls = () => {
    const activeEl = active === "A" ? videoARef.current : videoBRef.current;
    const hiddenEl = active === "A" ? videoBRef.current : videoARef.current;
    return { activeEl, hiddenEl };
  };

  useEffect(() => {
    const { activeEl, hiddenEl } = getEls();
    if (!activeEl || !hiddenEl) return;

    if (activeEl.dataset.src !== currentSrc) {
      activeEl.src = currentSrc;
      activeEl.dataset.src = currentSrc;
      activeEl.currentTime = 0;
      activeEl.load();
    }

    const p = activeEl.play();
    if (p && typeof (p as any).catch === "function") (p as any).catch(() => {});

    if (nextSrc && hiddenEl.dataset.src !== nextSrc) {
      hiddenEl.src = nextSrc;
      hiddenEl.dataset.src = nextSrc;
      hiddenEl.currentTime = 0;
      hiddenEl.load();
    }
  }, [active, currentSrc, nextSrc]);

  function handleEnded() {
    if (nextSrc) {
      setActive((a) => (a === "A" ? "B" : "A"));
      setPos((p) => p + 1);
      return;
    }

    const newPlaylist = makePlaylist(videos, currentSrc);
    setPlaylist(newPlaylist);
    setPos(0);
    setActive((a) => (a === "A" ? "B" : "A"));
  }

  function goToGroupPlayers() {
    // Crea o ajusta array de jugadores a groupCount, manteniendo lo ya escrito
    setPlayers((prev) => {
      const next = [...prev];
      if (next.length < groupCount) {
        for (let i = next.length; i < groupCount; i++) next.push("");
      } else if (next.length > groupCount) {
        next.length = groupCount;
      }
      return next;
    });
    setScreen("groupPlayers");
  }

  const canContinueNames =
    players.length === groupCount && players.every((n) => n.trim().length > 0);

  return (
    <div className="relative min-h-[100dvh] w-full inset-0 overflow-hidden bg-black">
      {/* Video background */}
      <div className="absolute inset-0">
        <video
          ref={videoARef}
          className={[
            "absolute inset-0 h-full w-full object-cover blur-sm scale-110 brightness-75",
            active === "A" ? "z-10" : "z-0",
            active === "A" ? "pointer-events-auto" : "pointer-events-none",
          ].join(" ")}
          muted
          playsInline
          preload="auto"
          onEnded={active === "A" ? handleEnded : undefined}
        />

        <video
          ref={videoBRef}
          className={[
            "absolute inset-0 h-full w-full object-cover blur-sm scale-110 brightness-75",
            active === "B" ? "z-10" : "z-0",
            active === "B" ? "pointer-events-auto" : "pointer-events-none",
          ].join(" ")}
          muted
          playsInline
          preload="auto"
          onEnded={active === "B" ? handleEnded : undefined}
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none z-20" />
      </div>

      {/* Contenido */}
      <div className="relative z-20 flex min-h-[100dvh] items-center justify-center ">
        <div className="w-full max-w-lg px-8">
          {/* Logo */}
          <motion.div
            className="flex justify-center"
            initial={{ y: 60, opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src={imperiumLogo}
              alt="Imperium"
              className="h-24 sm:h-28 w-280 select-none"
              draggable={false}
            />
          </motion.div>

          <div className="mt-8 flex justify-center">
            <AnimatePresence mode="wait" initial={true}>
              {screen === "intro" ? (
                <motion.div
                  key="play"
                  initial={{ opacity: 0, y: 46, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 1, ease: [0.2, 1, 0.9, 1] }}
                >
                  <Button
                    variant="outline"
                    size="lg"
                    className="
                      px-12 py-6 text-lg
                      !border-2 !border-amber-400/80
                      !text-amber-100
                      hover:!bg-amber-500/10
                    "
                    onClick={() => setScreen("mode")}
                  >
                    Jugar
                  </Button>
                </motion.div>
              ) : screen === "mode" ? (
                <motion.div
                  key="mode"
                  className="w-full max-w-md"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 1, ease: [0.4, 1, 0.36, 1] }}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      className="
                        h-16 flex-col gap-2
                        !border-2 !border-amber-400/80
                        !text-amber-100
                        hover:!bg-amber-500/10
                      "
                      onClick={() => navigate("/individual")}
                    >
                      <User className="h-6 w-6" />
                      <span className="text-base">Individual</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      className="
                        h-16 flex-col gap-2
                        !border-2 !border-amber-400/80
                        !text-amber-100
                        hover:!bg-amber-500/10
                      "
                      onClick={() => setScreen("groupSize")}
                    >
                      <Users className="h-6 w-6" />
                      <span className="text-base">Grupo</span>
                    </Button>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="ghost"
                      className="text-amber-100/80 hover:text-amber-100"
                      onClick={() => setScreen("intro")}
                    >
                      Volver
                    </Button>
                  </div>
                </motion.div>
              ) : screen === "groupSize" ? (
                <motion.div
                  key="groupSize"
                  className="w-full max-w-md"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 1, ease: [0.4, 1, 0.36, 1] }}
                >
                  <div className="text-center text-amber-100 mb-4">
                    <div className="text-sm uppercase tracking-widest opacity-80">
                      Número de jugadores
                    </div>
                    <div className="text-5xl font-semibold mt-2">
                      {groupCount}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      className="
                        h-14 w-14 p-0
                        !border-2 !border-amber-400/80
                        !text-amber-100
                        hover:!bg-amber-500/10
                      "
                      disabled={groupCount <= MIN_GROUP}
                      onClick={() =>
                        setGroupCount((n) => Math.max(MIN_GROUP, n - 1))
                      }
                      aria-label="Disminuir"
                    >
                      <Minus className="h-6 w-6" />
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      className="
                        h-14 w-14 p-0
                        !border-2 !border-amber-400/80
                        !text-amber-100
                        hover:!bg-amber-500/10
                      "
                      disabled={groupCount >= MAX_GROUP}
                      onClick={() =>
                        setGroupCount((n) => Math.min(MAX_GROUP, n + 1))
                      }
                      aria-label="Aumentar"
                    >
                      <Plus className="h-6 w-6" />
                    </Button>
                  </div>

                  <div className="mt-6 flex justify-center gap-3">
                    <Button
                      variant="ghost"
                      className="text-amber-100/80 hover:text-amber-100"
                      onClick={() => setScreen("mode")}
                    >
                      Volver
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      className="
                        px-10
                        !border-2 !border-amber-400/80
                        !text-amber-100
                        hover:!bg-amber-500/10
                      "
                      onClick={goToGroupPlayers}
                    >
                      Continuar
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="groupPlayers"
                  className="w-full max-w-lg"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 1, ease: [0.4, 1, 0.36, 1] }}
                >
                  <div className="mb-4 text-center text-amber-100">
                    <div className="text-sm uppercase tracking-widest opacity-80">
                      Nombres de jugadores
                    </div>
                  </div>

                  {/* Grid responsive */}
                  {/* Grid: 2 filas por columna */}
                  <div className="grid grid-flow-col grid-rows-2 auto-cols-fr gap-3">
                    {players.map((name, i) => (
                      <div key={i} className="space-y-2">
                        <div className="text-xs text-amber-100/70">
                          Jugador {i + 1}
                        </div>

                        <Input
                          value={name}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPlayers((prev) => {
                              const next = [...prev];
                              next[i] = v;
                              return next;
                            });
                          }}
                          placeholder="Nombre"
                          className="
          h-12
          bg-black/20
          text-amber-50
          placeholder:text-amber-100/40
          border-amber-400/40
          focus-visible:ring-amber-400/30
        "
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    <Button
                      variant="ghost"
                      className="text-amber-100/80 hover:text-amber-100"
                      onClick={() => setScreen("groupSize")}
                    >
                      Volver
                    </Button>

                    <Button
                      variant="outline"
                      className="
        !border-2 !border-amber-400/80
        !text-amber-100
        hover:!bg-amber-500/10
      "
                      onClick={() =>
                        setPlayers(
                          Array.from(
                            { length: groupCount },
                            (_, i) => `Jugador ${i + 1}`
                          )
                        )
                      }
                    >
                      Autorrellenar
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      disabled={!canContinueNames}
                      className="
        px-8
        !border-2 !border-amber-400/80
        !text-amber-100
        hover:!bg-amber-500/10
        disabled:opacity-50
      "
                      onClick={() => {
                        console.log("Jugadores:", players);
                        // TODO: ir a la pantalla de la partida
                      }}
                    >
                      Empezar
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

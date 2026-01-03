import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { createRoom } from "@/lib/rooms";
import { supabase } from "@/lib/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import imperiumLogo from "../assets/imperiumLogo.png";
import v1 from "../assets/video/bg1.mp4";
import v2 from "../assets/video/bg2.mp4";
import v3 from "../assets/video/bg3.mp4";
import v4 from "../assets/video/bg4.mp4";
import v5 from "../assets/video/bg5.mp4";
import v6 from "../assets/video/bg6.mp4";

type Screen = "intro" | "individualMenu";

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

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const [joinErrorOpen, setJoinErrorOpen] = useState(false);

  // Join UI
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

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

  async function handleCreateIndividualRoom() {
    if (loading) return;

    setLoadingText("Forjando sala...");
    setLoading(true);

    try {
      const room = await createRoom();
      navigate(
        `/individual?room=${encodeURIComponent(
          room.id
        )}&code=${encodeURIComponent(room.code)}&host=1`
      );
    } catch (e) {
      console.error(e);
      setLoading(false);
      setLoadingText("");
    }
  }

  async function submitJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code || loading) return;

    setLoadingText("Buscando sala...");
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("join_room_existing", {
        p_code: code,
      });
      if (error) throw error;

      if (!data) {
        setLoading(false);
        setLoadingText("");
        setJoinErrorOpen(true);
        return;
      }

      const roomId = data as string;
      navigate(
        `/individual?room=${encodeURIComponent(
          roomId
        )}&code=${encodeURIComponent(code)}`
      );
    } catch (e) {
      console.error(e);
      setLoading(false);
      setLoadingText("");
    }
  }

  function openJoin() {
    if (loading) return;
    setJoinOpen(true);
  }

  function backFromJoin() {
    if (loading) return;
    setJoinOpen(false);
    setJoinCode("");
    setLoading(false);
    setLoadingText("");
  }

  function backToIntro() {
    if (loading) return;
    setJoinOpen(false);
    setJoinCode("");
    setLoading(false);
    setLoadingText("");
    setScreen("intro");
  }

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
      <div className="relative z-20 flex min-h-[100dvh] items-center justify-center">
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
                    onClick={() => {
                      setJoinOpen(false);
                      setJoinCode("");
                      setLoading(false);
                      setLoadingText("");
                      setScreen("individualMenu");
                    }}
                  >
                    Jugar
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="individualMenu"
                  className="w-full max-w-md"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 1, ease: [0.4, 1, 0.36, 1] }}
                >
                  {loading ? (
                    <div className="flex flex-col items-center gap-4 text-amber-100">
                      <Spinner className="h-8 w-8 text-amber-400" />
                      <span className="text-sm tracking-wide opacity-90">
                        {loadingText}
                      </span>
                    </div>
                  ) : (
                    <AnimatePresence mode="wait">
                      {!joinOpen ? (
                        <motion.div
                          key="menuButtons"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{
                            duration: 0.35,
                            ease: [0.22, 1, 0.36, 1],
                          }}
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
                              onClick={handleCreateIndividualRoom}
                            >
                              <span className="text-base">Crear sala</span>
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
                              onClick={openJoin}
                            >
                              <span className="text-base">Unirse</span>
                            </Button>
                          </div>

                          <div className="mt-4 flex justify-center">
                            <Button
                              variant="ghost"
                              className="text-amber-100/80 hover:text-amber-100"
                              onClick={backToIntro}
                            >
                              Volver
                            </Button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="joinForm"
                          className="w-full"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{
                            duration: 0.35,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <div className="mt-4 space-y-3">
                            <Input
                              value={joinCode}
                              onChange={(e) =>
                                setJoinCode(e.target.value.toUpperCase())
                              }
                              placeholder="Código de sala (ej: A1B2C3)"
                              className="
                                h-12
                                bg-black/20
                                text-amber-50
                                placeholder:text-amber-100/40
                                border-amber-400/40
                                focus-visible:ring-amber-400/30
                              "
                              inputMode="text"
                              autoCapitalize="characters"
                            />

                            <div className="flex items-center justify-between">
                              <Button
                                variant="ghost"
                                className="text-amber-100/80 hover:text-amber-100"
                                onClick={backFromJoin}
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
                                disabled={!joinCode.trim()}
                                onClick={submitJoin}
                              >
                                Entrar
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <AlertDialog open={joinErrorOpen} onOpenChange={setJoinErrorOpen}>
        <AlertDialogContent className="bg-black/90 border-amber-400/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-100">
              Sala no encontrada
            </AlertDialogTitle>
            <AlertDialogDescription className="text-amber-100/70">
              No existe ninguna sala con ese código.
              <br />
              Revisa el código o crea una sala nueva.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogAction
              className="
          !border-2 !border-amber-400/80
          !text-amber-100
          hover:!bg-amber-500/10
        "
            >
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  Crown,
  LogOut,
  Users,
  BookOpen,
  ShoppingCart,
  Swords,
  Wheat,
  TreePine,
  Mountain,
  Anvil,
  Coins,
  Wallet,
  PawPrint,
  ArrowDownRight,
  ArrowUpRight,
  Shield,
  Sparkles,
  Wand2,
  Castle,
  Sword,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";

function getAmountSize(value: number) {
  const digits = Math.abs(value).toString().length;

  if (digits <= 3) return "text-3xl"; // 0 – 999
  if (digits <= 5) return "text-2xl"; // 1k – 99k
  if (digits <= 7) return "text-xl"; // 100k – 9M
  return "text-lg"; // 10M+
}

type SharedState = {
  turn: number;
  players: { id: string }[];
  hostId?: string;
};

function StatCard(props: {
  title: string;
  amount: number;
  icon: LucideIcon;

  // Opcionales (para recursos)
  prod?: number;
  spend?: number;

  // Control explícito (por si un día quieres ocultar aunque haya 0)
  showFlow?: boolean;
}) {
  const Icon = props.icon;

  const hasProd = typeof props.prod === "number";
  const hasSpend = typeof props.spend === "number";

  // Si showFlow no viene, se muestra solo si hay prod o spend definidos
  const showFlow = props.showFlow ?? (hasProd || hasSpend);

  const prod = props.prod ?? 0;
  const spend = props.spend ?? 0;

  return (
    <Card className="bg-black/30 backdrop-blur-md border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
      <CardContent className="p-3">
        {/* Top row: izquierda (icono+título) / derecha (valor) */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-amber-200/90" />
              <div className="truncate text-xs font-medium text-amber-100/80">
                {props.title}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div
              className={`
              ${getAmountSize(props.amount)}
              font-semibold
              leading-none
              text-amber-100
              tabular-nums
            `}
            >
              {props.amount}
            </div>
          </div>
        </div>

        {/* Bottom row: prod/spend opcional */}
        {showFlow ? (
          <div className="mt-3 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-300 font-medium">+{prod}</span>
            </div>

            <div className="flex items-center gap-1">
              <ArrowDownRight className="h-4 w-4 text-rose-400" />
              <span className="text-rose-300 font-medium">-{spend}</span>
            </div>
          </div>
        ) : (
          // pequeño “aire” para que no cambie mucho el alto entre cards
          <div className="mt-3 h-4" />
        )}
      </CardContent>
    </Card>
  );
}

export default function Individual() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const roomId = params.get("room");
  const roomCode = params.get("code");
  const isHost = params.get("host") === "1";

  const [shared, setShared] = useState<SharedState | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(!!roomId);

  // AlertDialog abandonar
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // ✅ Local-only stats
  const [hp, setHp] = useState(20);
  const [gold, setGold] = useState(0);
  const [threat, setThreat] = useState(0);

  // Long-press para pasar turno (solo host)
  const HOLD_MS = 900; // 0.9s (ajústalo a 800/1000 si quieres)
  const [holdProgress, setHoldProgress] = useState(0); // 0..1

  const holdRaf = useRef<number | null>(null);
  const holdStart = useRef<number>(0);
  const holdTriggered = useRef(false);

  const [turnAnim, setTurnAnim] = useState<{ from: number; to: number } | null>(
    null
  );
  const prevTurnRef = useRef<number | null>(null);

  useEffect(() => {
    const current = typeof shared?.turn === "number" ? shared.turn : null;
    if (current == null) return;

    // Primera carga: no animar
    if (prevTurnRef.current == null) {
      prevTurnRef.current = current;
      return;
    }

    const prev = prevTurnRef.current;

    // Solo animar si cambia (normalmente sube, pero sirve igual si baja)
    if (current !== prev) {
      setTurnAnim({ from: prev, to: current });
      window.setTimeout(() => setTurnAnim(null), 1400);
      prevTurnRef.current = current;
    }
  }, [shared?.turn]);

  function stopHold(reset = true) {
    if (holdRaf.current) {
      cancelAnimationFrame(holdRaf.current);
      holdRaf.current = null;
    }
    holdTriggered.current = false;
    if (reset) setHoldProgress(0);
  }

  async function advanceTurn() {
    if (!roomId || !shared) return;

    const next: SharedState = {
      ...shared,
      turn: (typeof shared.turn === "number" ? shared.turn : 1) + 1,
    };

    setShared(next);

    const { error } = await supabase
      .from("room_state")
      .update({ state: next })
      .eq("room_id", roomId);

    if (error) {
      console.error(error);
      // si falla, podrías revertir, pero de momento solo log
    }
  }

  function startHold() {
    if (!isHost) return;
    if (!roomId || !shared) return;

    stopHold(true);
    holdStart.current = performance.now();
    holdTriggered.current = false;

    const tick = (now: number) => {
      const t = (now - holdStart.current) / HOLD_MS;
      const p = Math.min(1, Math.max(0, t));
      setHoldProgress(p);

      if (p >= 1 && !holdTriggered.current) {
        holdTriggered.current = true;
        stopHold(false);
        setHoldProgress(0);
        advanceTurn();
        return;
      }

      holdRaf.current = requestAnimationFrame(tick);
    };

    holdRaf.current = requestAnimationFrame(tick);
  }

  const players = Array.isArray(shared?.players) ? shared!.players : [];
  const playerCount = players.length;
  const ready = playerCount >= 2;
  const turn = String(shared?.turn ?? 1);
  // Slides del carousel: cada slide contiene un "grid" de cards (como tu sketch)
  const slides = [
    {
      title: "Resumen",
      cards: [
        { title: "Población", icon: Users, amount: 0, showFlow: false },
        { title: "Comida", icon: Wheat, amount: 0, prod: 0, spend: 0 },
        { title: "Madera", icon: TreePine, amount: 0, prod: 0, spend: 0 },
        { title: "Piedra", icon: Mountain, amount: 0, prod: 0, spend: 0 },
        { title: "Hierro", icon: Anvil, amount: 0, prod: 0, spend: 0 },
        { title: "Oro", icon: Coins, amount: 0, prod: 0, spend: 0 },
        { title: "Caballos", icon: PawPrint, amount: 0, prod: 0, spend: 0 },
        { title: "Dinero", icon: Wallet, amount: 0, prod: 0, spend: 0 },
      ],
    },
    {
      title: "Combate",
      cards: [
        // lo dejamos como estaba o lo adaptamos luego a otro tipo de card
        { title: "Daño", icon: Swords, amount: 0, prod: 0, spend: 0 },
        { title: "Defensa", icon: Shield, amount: 0, prod: 0, spend: 0 },
        { title: "Crítico", icon: Sparkles, amount: 0, prod: 0, spend: 0 },
        { title: "Buffs", icon: Wand2, amount: 0, prod: 0, spend: 0 },
      ],
    },
  ];

  const [api, setApi] = useState<CarouselApi | null>(null);
  const [active, setActive] = useState(0);
  const [count, setCount] = useState(slides.length);

  useEffect(() => {
    if (!api) return;
    const snaps = api.scrollSnapList();
    setCount(snaps.length);
    setActive(api.selectedScrollSnap());

    api.on("select", () => {
      setActive(api.selectedScrollSnap());
    });
  }, [api]);

  // PlayerId persistente
  const playerId = useMemo(() => {
    const key = "imperium_player_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;

    const id =
      (crypto as any)?.randomUUID?.() ??
      `p_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    localStorage.setItem(key, id);
    return id;
  }, []);

  // Persistencia local por sala+jugador
  useEffect(() => {
    if (!roomId) return;
    const key = `imperium:local:${roomId}:${playerId}`;

    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.hp === "number") setHp(parsed.hp);
        if (typeof parsed.gold === "number") setGold(parsed.gold);
        if (typeof parsed.threat === "number") setThreat(parsed.threat);
      } catch {}
    }
  }, [roomId, playerId]);

  useEffect(() => {
    if (!roomId) return;
    const key = `imperium:local:${roomId}:${playerId}`;
    localStorage.setItem(key, JSON.stringify({ hp, gold, threat }));
  }, [roomId, playerId, hp, gold, threat]);

  // Abandonar sala (RPC)
  async function leaveRoom() {
    if (!roomId || leaving) {
      navigate("/");
      return;
    }

    setLeaving(true);
    try {
      const { error } = await supabase.rpc("leave_room", {
        p_room_id: roomId,
        p_player_id: playerId,
      });
      if (error) throw error;
    } catch (e) {
      console.error(e);
    } finally {
      setLeaving(false);
      navigate("/");
    }
  }

  // Asegura que este player está en la sala
  async function ensurePlayerInRoom(current: SharedState | null) {
    if (!roomId) return;

    const players = Array.isArray(current?.players) ? current!.players : [];
    const already = players.some((p) => p?.id === playerId);
    if (already) return;

    const next = {
      turn: typeof current?.turn === "number" ? current!.turn : 1,
      players: [...players, { id: playerId }],
      hostId: (current as any)?.hostId ?? (isHost ? playerId : undefined),
    };

    await supabase
      .from("room_state")
      .update({ state: next })
      .eq("room_id", roomId);
    setShared(next);
  }

  useEffect(() => {
    if (!roomId) {
      setLoadingRoom(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("room_state")
          .select("state")
          .eq("room_id", roomId)
          .single();

        if (error) throw error;
        if (!mounted) return;

        const s = data.state as SharedState;
        setShared(s);

        await ensurePlayerInRoom(s);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoadingRoom(false);
      }
    })();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_state",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if ((payload as any).eventType === "DELETE") {
            navigate("/");
            return;
          }
          const next = (payload.new as any)?.state as SharedState;
          if (next) setShared(next);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId, playerId, navigate]);

  return (
    <div className="relative min-h-[100dvh] w-full text-amber-100 overflow-hidden">
      {/* Fondo */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
      radial-gradient(
        140% 120% at 50% -10%,
        oklch(82.8% 0.189 84.429 / 0.35),
        transparent 70%
      ),
      linear-gradient(
        180deg,
        oklch(82.8% 0.189 84.429 / 0.20),
        oklch(0.87 0.06 73.05 / 0.18) 40%,
        oklch(0.87 0.06 73.05 / 0.22)
      )
    `,
          }}
        />
        <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute inset-0 bg-black/45" />
      </div>

      {/* Abandonar */}
      <div className="absolute right-2 top-2 z-20">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setLeaveOpen(true)}
          aria-label="Abandonar sala"
          className="
            h-10 w-10
            bg-black/30 backdrop-blur-md
            !border-2 !border-amber-400/60
            !text-amber-100
            hover:!bg-amber-500/10
          "
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent className="bg-black/90 border-amber-400/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-100">
              ¿Abandonar la sala?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-amber-100/70">
              Saldrás de la partida. Si eres el último jugador, la sala se
              eliminará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-transparent text-amber-100/80 hover:text-amber-100"
              disabled={leaving}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                leaveRoom();
              }}
              className="
                !border-2 !border-amber-400/80
                !text-amber-100
                hover:!bg-amber-500/10
              "
            >
              {leaving ? "Abandonando…" : "Abandonar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contenido */}
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-3 py-3 pb-24">
        {/* Header compacto (se queda igual) */}
        <div className="mb-2 pr-12">
          <div className="flex items-center gap-2 flex-wrap">
            {roomCode && (
              <span className="text-[11px] text-amber-100/60">
                Sala{" "}
                <span className="font-mono text-amber-100/80">{roomCode}</span>
              </span>
            )}

            {isHost && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-100/60">
                <Crown className="h-3.5 w-3.5" />
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-[11px] text-amber-100/60">
              <Users className="h-3.5 w-3.5" />
              <span className="font-mono text-amber-100/80">{playerCount}</span>
            </span>
          </div>
        </div>

        {loadingRoom || !ready ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
              <div className="text-sm text-amber-100/70">
                {loadingRoom
                  ? "Conectando sala…"
                  : `Esperando jugadores… (${playerCount}/2)`}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            {/* Carousel + Header reactivo */}
            <div className="mt-10 flex-1 flex flex-col">
              {/* Header único (reactivo) */}
              <div className="mb-3 flex items-center justify-between">
                <div className="ml-2 text-bg font-semibold text-amber-100/90">
                  {slides[active]?.title ?? "—"}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-amber-100/60">
                  {/* Dots (no interactivos) con transición suave */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: count }).map((_, i) => (
                      <span
                        key={i}
                        className={[
                          "rounded-full transition-all duration-200",
                          i === active
                            ? "h-1.5 w-5 bg-amber-300/80"
                            : "h-1.5 w-1.5 bg-white/15",
                        ].join(" ")}
                      />
                    ))}
                  </div>

                  <span className="font-mono">
                    {Math.min(active + 1, count)}/{count}
                  </span>
                </div>
              </div>

              {/* Carousel ocupa el resto */}
              <Carousel
                setApi={setApi}
                opts={{ align: "start" }}
                className="h-full w-full"
              >
                <CarouselContent className="-ml-2 h-full">
                  {slides.map((slide, idx) => (
                    <CarouselItem key={idx} className="pl-2 h-full">
                      {/* “Zona grande” para swipe */}
                      <div className="h-full rounded-xl border border-white/10 bg-black/20 p-2">
                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
                          {slide.cards.map((c) => (
                            <StatCard
                              key={`${slide.title}-${c.title}`}
                              title={c.title}
                              icon={c.icon}
                              amount={c.amount}
                              prod={c.prod}
                              spend={c.spend}
                            />
                          ))}
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {/* Sin flechas */}
              </Carousel>
            </div>
          </div>
        )}
      </div>

      {/* Bottom menu bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto w-full max-w-6xl px-3 py-2">
          <div className="grid grid-cols-3 items-center">
            {/* Izquierda: placeholder */}
            <div className="flex justify-start">
              <Button
                variant="outline"
                size="icon"
                aria-label="Placeholder"
                className="
                  h-11 w-11 rounded-2xl
                  bg-black/30 backdrop-blur-md
                  !border-2 !border-amber-400/40
                  !text-amber-100
                  hover:!bg-amber-500/10
                "
              >
                <BookOpen className="h-5 w-5" />
              </Button>
            </div>

            {/* Centro: turno (host = mantener para pasar) */}
            <div className="flex justify-center">
              {(() => {
                const baseBorder = isHost
                  ? "rgba(251, 191, 36, 0.6)" // amber-400/60
                  : "rgba(255, 255, 255, 0.2)"; // white/20

                const ringColor = "rgba(34, 197, 94, 0.85)"; // green-500-ish

                // conic-gradient: verde hasta el progreso, el resto baseBorder
                const bg = `conic-gradient(${ringColor} ${
                  holdProgress * 360
                }deg, ${baseBorder} 0deg)`;

                return (
                  <div
                    className={[
                      "relative h-14 w-14 rounded-full",
                      "select-none touch-none",
                      isHost ? "cursor-pointer" : "cursor-default",
                    ].join(" ")}
                    style={{ background: bg }}
                    aria-label={
                      isHost
                        ? `Mantén para pasar turno ${turn}`
                        : `Turno ${turn}`
                    }
                    onPointerDown={(e) => {
                      if (!isHost) return;
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                      startHold();
                    }}
                    onPointerUp={() => stopHold(true)}
                    onPointerCancel={() => stopHold(true)}
                    onPointerLeave={() => stopHold(true)}
                    onContextMenu={(e) => {
                      if (isHost) e.preventDefault();
                    }}
                  >
                    {/* Interior (mantiene tu diseño original) */}
                    <div
                      className="
            absolute inset-[1px] rounded-full
            bg-black/25
            text-amber-100
            inline-flex items-center justify-center gap-1.5
            leading-none
          "
                    >
                      <Swords className="h-4 w-4" />
                      <span className="text-[16px] font-semibold tabular-nums">
                        {turn}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Derecha: compras */}
            <div className="flex justify-end">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Compras"
                    className="
          h-11 w-11 rounded-2xl
          bg-black/30 backdrop-blur-md
          !border-2 !border-amber-400/60
          !text-amber-100
          hover:!bg-amber-500/10
        "
                  >
                    <ShoppingCart className="h-5 w-5" />
                  </Button>
                </DrawerTrigger>

                <DrawerContent
                  className="
    bg-black
    text-amber-100
    border-t-2 border-amber-400/60
    rounded-t-2xl
  "
                >
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        className="
        flex flex-col items-center justify-center gap-1
        rounded-xl border-2 border-amber-400/60
        bg-black/60 p-3
        text-amber-100
        hover:bg-amber-400/10
        transition
      "
                      >
                        <BookOpen className="h-5 w-5" />
                        <span className="text-xs font-medium">Carta</span>
                      </button>

                      <button
                        className="
        flex flex-col items-center justify-center gap-1
        rounded-xl border-2 border-amber-400/60
        bg-black/60 p-3
        text-amber-100
        hover:bg-amber-400/10
        transition
      "
                      >
                        <Castle className="h-5 w-5" />
                        <span className="text-xs font-medium">Estructura</span>
                      </button>

                      <button
                        className="
        flex flex-col items-center justify-center gap-1
        rounded-xl border-2 border-amber-400/60
        bg-black/60 p-3
        text-amber-100
        hover:bg-amber-400/10
        transition
      "
                      >
                        <Sword className="h-5 w-5" />
                        <span className="text-xs font-medium">Unidad</span>
                      </button>
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>
      </nav>
      <AnimatePresence>
        {turnAnim && (
          <motion.div
            key="turn-overlay"
            className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/60 backdrop-blur-sm
        pointer-events-none
      "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {/* Card central */}
            <motion.div
              className="
          relative rounded-2xl
          border border-white/10
          bg-black/35
          px-8 py-6
          text-center text-amber-100
          shadow-[0_0_0_1px_rgba(255,255,255,0.06)]
        "
              initial={{ scale: 0.92, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 6 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            >
              {/* Destello de fondo animado */}
              <>
                {/* Halo radial */}
                <motion.div
                  className="pointer-events-none absolute inset-0 rounded-2xl"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{
                    background:
                      "radial-gradient(60% 60% at 50% 50%, rgba(34,197,94,0.18), transparent 70%)",
                  }}
                />

                {/* Sweep horizontal (acompaña el cambio de turno) */}
                <motion.div
                  className="pointer-events-none absolute inset-y-0 left-[-30%] w-[60%]"
                  initial={{ x: 0, opacity: 0 }}
                  animate={{ x: "160%", opacity: 0.35 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(34,197,94,0.25), transparent)",
                  }}
                />
              </>

              <div className="mb-2 text-[11px] tracking-[0.25em] text-amber-200/70">
                TURNO
              </div>

              {/* Swap de números (lento: sale a la izq, entra por la der) */}
              <div className="relative h-[72px] w-[220px] mx-auto overflow-hidden">
                {/* Turno actual (sale) */}
                <motion.div
                  key={`from-${turnAnim.from}`}
                  className="absolute inset-0 flex items-center justify-center text-6xl font-semibold tabular-nums"
                  initial={{ x: 0, opacity: 1 }}
                  animate={{ x: -60, opacity: 0 }}
                  transition={{ duration: 0.7, ease: "easeInOut" }}
                >
                  {turnAnim.from}
                </motion.div>

                {/* Turno siguiente (entra) */}
                <motion.div
                  key={`to-${turnAnim.to}`}
                  className="absolute inset-0 flex items-center justify-center text-6xl font-semibold tabular-nums text-emerald-300"
                  initial={{ x: 60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{
                    duration: 0.85,
                    ease: "easeInOut",
                    delay: 0.15,
                  }}
                >
                  {turnAnim.to}
                </motion.div>
              </div>

              {/* Aro sutil “pro” */}
              <motion.div
                className="pointer-events-none absolute -inset-2 rounded-[22px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  boxShadow:
                    "0 0 0 1px rgba(34,197,94,0.25), 0 0 40px rgba(34,197,94,0.12)",
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

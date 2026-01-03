import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Crown,
  LogOut,
  TrendingUp,
  Users,
  ShoppingCart,
  Menu,
  Swords,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type SharedState = {
  turn: number;
  players: { id: string }[];
  hostId?: string;
};

function StatCard(props: {
  title: string;
  value: string;
  hint: string;
  badge: string;
}) {
  return (
    <Card
      className="
        bg-black/30 backdrop-blur-md
        border-white/10
        shadow-[0_0_0_1px_rgba(255,255,255,0.06)]
      "
    >
      <CardHeader className="p-3 pb-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs text-amber-100/75">
            {props.title}
          </CardTitle>
          <Badge
            variant="outline"
            className="h-6 px-2 text-[11px] border-amber-400/40 text-amber-100/70"
          >
            {props.badge}
          </Badge>
        </div>
        <div className="text-2xl font-semibold leading-none text-amber-100">
          {props.value}
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0">
        <div className="flex items-center gap-2 text-[11px] text-amber-100/65">
          <TrendingUp className="h-3.5 w-3.5" />
          <span className="line-clamp-1">{props.hint}</span>
        </div>
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

  const players = Array.isArray(shared?.players) ? shared!.players : [];
  const playerCount = players.length;
  const ready = playerCount >= 2;
  const turn = String(shared?.turn ?? 1);
  // Slides del carousel: cada slide contiene un "grid" de cards (como tu sketch)
  const slides = [
    {
      title: "Resumen",
      cards: [
        { title: "Vida", value: String(hp), badge: "Local", hint: "Solo tú" },
        { title: "Oro", value: String(gold), badge: "Local", hint: "Solo tú" },
        { title: "Turno", value: turn, badge: "Sala", hint: "Compartido" },
        {
          title: "Amenaza",
          value: String(threat),
          badge: "Local",
          hint: "Solo tú",
        },
      ],
    },
    {
      title: "Combate",
      cards: [
        { title: "Daño", value: "—", badge: "Local", hint: "Placeholder" },
        { title: "Defensa", value: "—", badge: "Local", hint: "Placeholder" },
        { title: "Crítico", value: "—", badge: "Local", hint: "Placeholder" },
        { title: "Buffs", value: "—", badge: "Local", hint: "Placeholder" },
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
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-black to-stone-950" />
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
                <div className="text-sm font-semibold text-amber-100/90">
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
                      <div className="h-full rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
                          {slide.cards.map((c) => (
                            <StatCard
                              key={`${slide.title}-${c.title}`}
                              title={c.title}
                              value={c.value}
                              badge={c.badge}
                              hint={c.hint}
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
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            {/* Centro: turno actual + icono */}
            <div className="flex justify-center">
              <div
                className="
                  inline-flex items-center gap-2
                  rounded-2xl
                  border border-white/10
                  bg-black/25
                  px-4 py-2
                  text-amber-100
                "
              >
                <Swords className="h-4 w-4" />
                <span className="text-sm font-semibold">Turno {turn}</span>
              </div>
            </div>

            {/* Derecha: compras */}
            <div className="flex justify-end">
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
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Crown, LogOut, TrendingUp, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type SharedState = {
  turn: number;
  players: { id: string }[];
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
      // Aunque falle, nos vamos igual para UX; si quieres lo hacemos más estricto
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

    const next: SharedState = {
      turn: typeof current?.turn === "number" ? current!.turn : 1,
      players: [...players, { id: playerId }],
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
          // Si la sala se borra, puede llegarte DELETE
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

  const players = Array.isArray(shared?.players) ? shared!.players : [];
  const playerCount = players.length;
  const ready = playerCount >= 2;
  const turn = String(shared?.turn ?? 1);

  return (
    <div className="relative min-h-[100dvh] w-full bg-black text-amber-100 overflow-hidden">
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

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-3 py-3">
        {/* Header compacto (sin “Modo Individual” / “Panel de partida”) */}
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
          <>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
              <StatCard
                title="Vida"
                value={String(hp)}
                badge="Local"
                hint="Solo tú"
              />
              <StatCard
                title="Oro"
                value={String(gold)}
                badge="Local"
                hint="Solo tú"
              />
              <StatCard
                title="Turno"
                value={turn}
                badge="Sala"
                hint="Compartido"
              />
              <StatCard
                title="Amenaza"
                value={String(threat)}
                badge="Local"
                hint="Solo tú"
              />
            </div>

            <Card
              className="
                mt-2 flex-1
                bg-black/30 backdrop-blur-md
                border-white/10
                shadow-[0_0_0_1px_rgba(255,255,255,0.06)]
              "
            >
              <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm">Resumen</CardTitle>

                <Tabs defaultValue="3m">
                  <TabsList className="bg-black/20 h-8">
                    <TabsTrigger className="h-7 text-xs" value="3m">
                      3m
                    </TabsTrigger>
                    <TabsTrigger className="h-7 text-xs" value="30d">
                      30d
                    </TabsTrigger>
                    <TabsTrigger className="h-7 text-xs" value="7d">
                      7d
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              <CardContent className="p-3 pt-0 h-full">
                <div className="h-36 sm:h-44 w-full rounded-xl border border-white/10 bg-black/20" />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

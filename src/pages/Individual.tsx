import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  function handleReset() {
    navigate("/");
  }

  return (
    <div className="relative min-h-[100dvh] w-full bg-black text-amber-100 overflow-hidden">
      {/* Fondo elegante */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-black to-stone-950" />
        <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute inset-0 bg-black/45" />
      </div>

      {/* Reset */}
      <div className="absolute right-2 top-2 z-20">
        <Button
          variant="outline"
          size="icon"
          onClick={handleReset}
          aria-label="Reset y volver al inicio"
          className="
            h-10 w-10
            bg-black/30 backdrop-blur-md
            !border-2 !border-amber-400/60
            !text-amber-100
            hover:!bg-amber-500/10
          "
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-3 py-3">
        {/* Header compacto */}
        <div className="mb-2 pr-12">
          <h1 className="font-serif text-lg tracking-wide">Modo Individual</h1>
          <p className="text-xs text-amber-100/60 line-clamp-1">
            Panel de partida
          </p>
        </div>

        {/* Stats: 2 columnas en móvil, 4 en desktop */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
          <StatCard title="Vida" value="20" badge="+2" hint="Estable" />
          <StatCard title="Oro" value="5" badge="+1" hint="Este turno" />
          <StatCard title="Turno" value="3" badge="Ronda" hint="En curso" />
          <StatCard title="Amenaza" value="1" badge="—" hint="Sin eventos" />
        </div>

        {/* Panel inferior: ocupa lo que queda */}
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
            {/* Placeholder chart: pequeño en móvil */}
            <div className="h-36 sm:h-44 w-full rounded-xl border border-white/10 bg-black/20" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

export default function Individual() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[100dvh] bg-black text-white flex items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-serif">Modo Individual</h1>
        <Button variant="outline" onClick={() => navigate("/")}>
          Volver
        </Button>
      </div>
    </div>
  )
}

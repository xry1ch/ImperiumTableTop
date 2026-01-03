import { supabase } from "./supabase"

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789" // sin 0/O/1/I

export function makeCode(len = 6) {
  let out = ""
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return out
}

export async function createRoom() {
  // intenta varias veces por si colisiona el code
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode(6)

    const { data: room, error: roomErr } = await supabase
      .from("rooms")
      .insert({ code })
      .select("id, code")
      .single()

    if (!roomErr && room) {
      const initialState = { turn: 1 } // MVP: solo turno
      const { error: stateErr } = await supabase
        .from("room_state")
        .insert({ room_id: room.id, state: initialState })

      if (stateErr) throw stateErr
      return room
    }
  }
  throw new Error("No se pudo crear una sala (colisión de código).")
}

export async function joinRoom(codeRaw: string) {
  const code = codeRaw.trim().toUpperCase()

  const { data: room, error } = await supabase
    .from("rooms")
    .select("id, code")
    .eq("code", code)
    .single()

  if (error || !room) throw new Error("Código de sala no válido.")
  return room
}

export async function getRoomState(roomId: string) {
  const { data, error } = await supabase
    .from("room_state")
    .select("state")
    .eq("room_id", roomId)
    .single()

  if (error) throw error
  return data.state as any
}

export async function updateRoomState(roomId: string, nextState: any) {
  const { error } = await supabase
    .from("room_state")
    .update({ state: nextState })
    .eq("room_id", roomId)

  if (error) throw error
}

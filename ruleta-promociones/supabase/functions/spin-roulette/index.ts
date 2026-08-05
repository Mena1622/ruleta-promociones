import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

// Definimos los premios localmente para la Edge Function de Deno.
// Esto mantiene la función autónoma, simple y sin problemas de resolución de workspaces.
const PRIZES = [
  { id: '1', name: 'Limpieza facial', price: 25000 },
  { id: '2', name: 'Hollywood peel', price: 25000 },
  { id: '3', name: 'Hydrafacial', price: 25000 },
  { id: '4', name: 'Myolift', price: 25000 },
  { id: '5', name: 'Facial iluminador', price: 25000 },
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // 1. Manejo de peticiones CORS preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Extraer datos del cuerpo de la petición
    const { cedula, nombre, correo } = await req.json()

    if (!cedula || !nombre || !correo) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos obligatorios (cédula, nombre, correo).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Inicializar el cliente de Supabase
    // En las Edge Functions, estas variables se inyectan automáticamente.
    // Usamos el SERVICE_ROLE_KEY para ignorar el RLS (Row Level Security) y poder insertar libremente.
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 4. Validar si la cédula ya participó
    const { data: existingUser, error: searchError } = await supabase
      .from('participaciones')
      .select('id')
      .eq('cedula', cedula)
      .maybeSingle()

    if (searchError) throw searchError

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'Esta cédula ya ha participado en la promoción.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Elegir premio aleatorio
    const randomIndex = Math.floor(Math.random() * PRIZES.length)
    const selectedPrize = PRIZES[randomIndex]

    // 6. Guardar participación en la base de datos
    const { error: insertError } = await supabase
      .from('participaciones')
      .insert({
        cedula,
        nombre,
        correo,
        premio_id: selectedPrize.id
      })

    if (insertError) {
      // Si por concurrencia u otro factor el UNIQUE de cédula falla aquí, lanzará error 500
      throw insertError
    }

    // 7. Retornar el premio
    return new Response(
      JSON.stringify({ prize: selectedPrize }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

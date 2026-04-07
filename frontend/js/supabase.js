// Importa o SDK do Supabase direto da web (CDN)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://ncdviiijzbbqugyiusyq.supabase.co'
const supabaseKey = 'sb_publishable_Lwh8-C2Ah3PLP-riPKtq8w_R4oxJgxC'

// Exporta a conexão para usar em outros arquivos
export const supabase = createClient(supabaseUrl, supabaseKey)
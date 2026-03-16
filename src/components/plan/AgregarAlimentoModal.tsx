import { useState, useRef, useEffect } from 'react'
import {
  X, CheckCircle2, XCircle, Camera, Trash2, Plus,
  ChefHat, Utensils, ChevronDown, ChevronUp, ScanLine,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { buscarAlimentosComunes, type AlimentoComun } from '../../lib/alimentosComunes'
import { supabase } from '../../lib/supabase'
import { cn } from '../../utils/cn'
import type { Alimento, IngredienteReceta, TipoComida } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Unidad = 'g' | 'ml' | 'cantidad'

interface Props {
  comidaId: string
  tipoComida: TipoComida
  alimentoEditar?: Alimento
  onGuardar: (data: Omit<Alimento, 'id' | 'comida_id'>) => Promise<void>
  onClose: () => void
}

const COMIDA_CONFIG: Record<TipoComida, { label: string; color: string; bg: string }> = {
  desayuno: { label: 'Desayuno',  color: 'text-amber-600',  bg: 'bg-amber-50' },
  comida:   { label: 'Comida',    color: 'text-orange-600', bg: 'bg-orange-50' },
  cena:     { label: 'Cena',      color: 'text-indigo-600', bg: 'bg-indigo-50' },
  snack:    { label: 'Snack',     color: 'text-green-600',  bg: 'bg-green-50' },
}

const EMPTY_NUTRIENTS = {
  porcion_g: 100, calorias: 0, proteina_g: 0, carbohidratos_g: 0,
  grasas_g: 0, grasas_saturadas_g: 0, fibra_g: 0, sodio_mg: 0,
  azucar_g: 0, colesterol_mg: 0, calcio_mg: 0, hierro_mg: 0,
  vitamina_c_mg: 0, vitamina_d_ug: 0,
}

const EMPTY: Omit<Alimento, 'id' | 'comida_id'> = {
  nombre: '', ...EMPTY_NUTRIENTS, fuente: 'claude_estimado',
  porcion_unidad: 'g', porcion_cantidad: null, porcion_gramos_por_unidad: null, ingredientes: null,
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

const r = (v: number) => Math.round(v * 10) / 10

interface Base100g {
  calorias: number; proteina_g: number; carbohidratos_g: number; grasas_g: number
  grasas_saturadas_g: number; fibra_g: number; sodio_mg: number; azucar_g: number
  colesterol_mg: number; calcio_mg: number; hierro_mg: number
  vitamina_c_mg: number; vitamina_d_ug: number
}

function calcNutrientes(base: Base100g, porcion_g: number) {
  const f = porcion_g / 100
  return {
    calorias:           r(base.calorias * f),
    proteina_g:         r(base.proteina_g * f),
    carbohidratos_g:    r(base.carbohidratos_g * f),
    grasas_g:           r(base.grasas_g * f),
    grasas_saturadas_g: r(base.grasas_saturadas_g * f),
    fibra_g:            r(base.fibra_g * f),
    sodio_mg:           r(base.sodio_mg * f),
    azucar_g:           r(base.azucar_g * f),
    colesterol_mg:      r(base.colesterol_mg * f),
    calcio_mg:          r(base.calcio_mg * f),
    hierro_mg:          r(base.hierro_mg * f),
    vitamina_c_mg:      r(base.vitamina_c_mg * f),
    vitamina_d_ug:      r(base.vitamina_d_ug * f),
  }
}

function base100gDesdeDB(alimento: AlimentoComun): Base100g {
  return {
    calorias: alimento.calorias, proteina_g: alimento.proteina_g,
    carbohidratos_g: alimento.carbohidratos_g, grasas_g: alimento.grasas_g,
    grasas_saturadas_g: alimento.grasas_saturadas_g, fibra_g: alimento.fibra_g,
    sodio_mg: alimento.sodio_mg, azucar_g: alimento.azucar_g,
    colesterol_mg: alimento.colesterol_mg ?? 0, calcio_mg: alimento.calcio_mg,
    hierro_mg: alimento.hierro_mg, vitamina_c_mg: alimento.vitamina_c_mg,
    vitamina_d_ug: alimento.vitamina_d_ug,
  }
}

/** Infiere per-100g desde los valores actuales del ingrediente si no tiene _per100g */
function getPer100g(ing: IngredienteReceta): Base100g | null {
  if (ing._per100g) return ing._per100g
  if (!ing.porcion_g || ing.porcion_g <= 0) return null
  const f = 100 / ing.porcion_g
  return {
    calorias: r(ing.calorias * f), proteina_g: r(ing.proteina_g * f),
    carbohidratos_g: r(ing.carbohidratos_g * f), grasas_g: r(ing.grasas_g * f),
    grasas_saturadas_g: r(ing.grasas_saturadas_g * f), fibra_g: r(ing.fibra_g * f),
    sodio_mg: r(ing.sodio_mg * f), azucar_g: r(ing.azucar_g * f),
    colesterol_mg: r(ing.colesterol_mg * f), calcio_mg: r(ing.calcio_mg * f),
    hierro_mg: r(ing.hierro_mg * f), vitamina_c_mg: r(ing.vitamina_c_mg * f),
    vitamina_d_ug: r(ing.vitamina_d_ug * f),
  }
}


function sumIngredientes(ings: IngredienteReceta[]): typeof EMPTY_NUTRIENTS {
  const s = (key: keyof typeof EMPTY_NUTRIENTS) =>
    r(ings.reduce((acc, i) => acc + (i[key] as number), 0))
  return {
    porcion_g: s('porcion_g'), calorias: s('calorias'), proteina_g: s('proteina_g'),
    carbohidratos_g: s('carbohidratos_g'), grasas_g: s('grasas_g'),
    grasas_saturadas_g: s('grasas_saturadas_g'), fibra_g: s('fibra_g'),
    sodio_mg: s('sodio_mg'), azucar_g: s('azucar_g'), colesterol_mg: s('colesterol_mg'),
    calcio_mg: s('calcio_mg'), hierro_mg: s('hierro_mg'),
    vitamina_c_mg: s('vitamina_c_mg'), vitamina_d_ug: s('vitamina_d_ug'),
  }
}

function ingDesdeDB(alimento: AlimentoComun, porcion: number): IngredienteReceta {
  const base = base100gDesdeDB(alimento)
  return {
    nombre: alimento.nombre, porcion_g: porcion,
    ...calcNutrientes(base, porcion),
    _per100g: base,
  }
}

// ─── Toggle de unidad ─────────────────────────────────────────────────────────

function UnidadToggle({ value, onChange }: { value: Unidad; onChange: (u: Unidad) => void }) {
  const opts: Array<{ val: Unidad; label: string }> = [
    { val: 'g',        label: 'g'  },
    { val: 'ml',       label: 'ml' },
    { val: 'cantidad', label: '#'  },
  ]
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs shrink-0" title="Unidad de medida">
      {opts.map(({ val, label }, i) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className={cn(
            'px-2 py-1.5 font-semibold transition-colors',
            i > 0 && 'border-l border-gray-200',
            value === val
              ? 'bg-primary-500 text-white'
              : 'text-gray-500 hover:bg-gray-100',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Input de porción con selector de unidad embebido ─────────────────────────

function PorcionInput({
  value, onChange, unidad, onUnidadChange, placeholder,
}: {
  value: number | string
  onChange: (v: string) => void
  unidad: Unidad
  onUnidadChange: (u: Unidad) => void
  placeholder?: string
}) {
  return (
    <div className="flex items-center rounded-xl bg-white pl-3 outline-1 -outline-offset-1 outline-gray-200 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-primary-500">
      <input
        type="number" min="0.1" step="0.1"
        placeholder={placeholder ?? '100'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="block min-w-0 grow bg-transparent py-1.5 pr-3 pl-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
      />
      <div className="grid shrink-0 grid-cols-1 focus-within:relative">
        <div className="col-start-1 row-start-1 flex rounded-md mr-1.5 overflow-hidden border border-gray-200 text-xs font-semibold">
          {([
            { val: 'g' as Unidad,        label: 'g'  },
            { val: 'ml' as Unidad,       label: 'ml' },
            { val: 'cantidad' as Unidad, label: '#'  },
          ]).map((opt, i) => (
            <button key={opt.val} type="button"
              onClick={() => onUnidadChange(opt.val)}
              className={cn(
                'px-2.5 py-1.5 transition-colors',
                i > 0 && 'border-l border-gray-200',
                unidad === opt.val
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50',
              )}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Fila de ingrediente ──────────────────────────────────────────────────────

interface IngRowProps {
  ing: IngredienteReceta
  idx: number
  expandido: boolean
  onToggle: () => void
  onChangePorcion: (v: number) => void
  onChangeCantidad: (v: number) => void
  onChangeGramosPorUnidad: (v: number) => void
  onChangeUnidad: (u: Unidad) => void
  onChangeField: (field: keyof IngredienteReceta, v: number) => void
  onChangeName: (v: string) => void
  onEliminar: () => void
}

function IngredienteRow({
  ing, expandido, onToggle, onChangePorcion, onChangeCantidad,
  onChangeGramosPorUnidad, onChangeUnidad, onChangeField, onChangeName, onEliminar,
}: IngRowProps) {
  const [expandirMicros, setExpandirMicros] = useState(false)
  const unidad = ing.unidad ?? 'g'

  // Texto del subtítulo según unidad
  const subtitulo = () => {
    if (unidad === 'cantidad') {
      const cant = ing.cantidad ?? 1
      const gpu = ing.gramos_por_unidad ?? ing.porcion_g
      return `${cant} unid. × ${gpu}g/u = ${ing.porcion_g}g`
    }
    return `${ing.porcion_g}${unidad}`
  }

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200',
      expandido ? 'border-primary-200 bg-primary-50/30' : 'border-gray-200 bg-white',
    )}>
      {/* Fila principal */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{ing.nombre}</p>
          <p className="text-xs text-gray-400 mt-0.5">{subtitulo()} · {Math.round(ing.calorias)} kcal</p>
        </div>

        {/* Input cantidad / porción */}
        <div className="flex items-center gap-1 shrink-0">
          {unidad === 'cantidad' ? (
            <input
              type="number" min="0.1" step="0.1"
              value={ing.cantidad ?? 1}
              onChange={(e) => onChangeCantidad(parseFloat(e.target.value) || 1)}
              className="w-14 text-right text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
              title="Cantidad de unidades"
            />
          ) : (
            <input
              type="number" min="0.1" step="0.1"
              value={ing.porcion_g || ''}
              onChange={(e) => onChangePorcion(parseFloat(e.target.value) || 0)}
              className="w-14 text-right text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            />
          )}
          <UnidadToggle value={unidad} onChange={onChangeUnidad} />
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={onToggle}
            className={cn('p-1.5 rounded-lg transition-colors',
              expandido ? 'text-primary-500 bg-primary-100' : 'text-gray-400 hover:text-primary-500 hover:bg-gray-100'
            )}>
            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button type="button" onClick={onEliminar}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Panel expandido */}
      {expandido && (
        <div className="px-3 pb-3 space-y-3 border-t border-primary-100">

          {/* Cuando es 'cantidad': mostrar campo gramos/unidad */}
          {unidad === 'cantidad' && (
            <div className="pt-2.5">
              <label className="text-xs font-medium text-primary-600 block mb-1.5">
                ¿Cuántos gramos pesa 1 unidad?
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0.1" step="0.1"
                  value={ing.gramos_por_unidad ?? ''}
                  onChange={(e) => onChangeGramosPorUnidad(parseFloat(e.target.value) || 1)}
                  placeholder="ej: 33"
                  className="w-24 text-right text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
                <span className="text-xs text-gray-500">g/unidad</span>
                <span className="text-xs text-gray-400 ml-1">
                  = {ing.porcion_g}g total
                </span>
              </div>
            </div>
          )}

          {/* Nombre editable */}
          <div className="pt-2.5">
            <label className="text-xs font-medium text-gray-500 block mb-1">Nombre</label>
            <input
              type="text"
              value={ing.nombre}
              onChange={(e) => onChangeName(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          {/* Nutrientes editables */}
          {unidad !== 'cantidad' && (
            <p className="text-xs text-primary-600 font-medium">
              Edita los valores para {ing.porcion_g}{unidad}
            </p>
          )}

          <div className="grid grid-cols-4 gap-2">
            {([
              ['calorias',        'Kcal',     'bg-orange-50 border-orange-200'],
              ['proteina_g',      'Proteína', 'bg-blue-50 border-blue-200'],
              ['carbohidratos_g', 'Carbs',    'bg-amber-50 border-amber-200'],
              ['grasas_g',        'Grasas',   'bg-emerald-50 border-emerald-200'],
            ] as const).map(([key, label, colors]) => (
              <div key={key}>
                <label className="text-[10px] font-medium text-gray-500 block mb-1">{label}</label>
                <input type="number" min="0" step="0.1"
                  value={(ing[key] as number) || ''}
                  onChange={(e) => onChangeField(key, parseFloat(e.target.value) || 0)}
                  className={cn('w-full text-right text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300', colors)}
                />
              </div>
            ))}
          </div>

          <button type="button" onClick={() => setExpandirMicros(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            {expandirMicros ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {expandirMicros ? 'Ocultar' : 'Ver'} micronutrientes
          </button>

          {expandirMicros && (
            <div className="grid grid-cols-3 gap-2">
              {([
                ['fibra_g',            'Fibra (g)'],   ['azucar_g',       'Azúcar (g)'],
                ['grasas_saturadas_g', 'G.Sat. (g)'],  ['sodio_mg',       'Sodio (mg)'],
                ['colesterol_mg',      'Colesterol'],   ['calcio_mg',      'Calcio (mg)'],
                ['hierro_mg',          'Hierro (mg)'],  ['vitamina_c_mg',  'Vit. C (mg)'],
                ['vitamina_d_ug',      'Vit. D (µg)'],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="text-[10px] font-medium text-gray-500 block mb-1">{label}</label>
                  <input type="number" min="0" step="0.1"
                    value={(ing[key] as number) || ''}
                    onChange={(e) => onChangeField(key, parseFloat(e.target.value) || 0)}
                    className="w-full text-right text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AgregarAlimentoModal({ tipoComida, alimentoEditar, onGuardar, onClose }: Props) {
  const esEdicion = !!alimentoEditar
  const tieneIngredientes = (alimentoEditar?.ingredientes?.length ?? 0) > 0
  const config = COMIDA_CONFIG[tipoComida]

  const [form, setForm] = useState<Omit<Alimento, 'id' | 'comida_id'>>(
    alimentoEditar ? { ...alimentoEditar } : { ...EMPTY }
  )
  const [guardando, setGuardando] = useState(false)
  const [expandidoMicros, setExpandidoMicros] = useState(false)

  // Unidad del alimento (modo simple) o de la receta (informativa)
  const [unidad, setUnidad] = useState<Unidad>(alimentoEditar?.porcion_unidad ?? 'g')
  // Campos extra para modo 'cantidad' en alimento simple
  const [cantidad, setCantidad] = useState(alimentoEditar?.porcion_cantidad ?? 1)
  const [gramosPorUnidad, setGramosPorUnidad] = useState(alimentoEditar?.porcion_gramos_por_unidad ?? 100)

  // ─── Modo receta ─────────────────────────────────────────────────────────────
  const [modoReceta, setModoReceta] = useState(tieneIngredientes)
  const [ingredientes, setIngredientes] = useState<IngredienteReceta[]>(
    () => alimentoEditar?.ingredientes ?? []
  )
  const [expandidoIngIdx, setExpandidoIngIdx] = useState<number | null>(null)
  const [busquedaIng, setBusquedaIng] = useState('')
  const [resultadosIng, setResultadosIng] = useState<AlimentoComun[]>([])
  const ingSearchRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [mostrarBuscadorIng, setMostrarBuscadorIng] = useState(false)

  // ─── Búsqueda nombre (modo simple) ───────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('')
  const [resultadosLocales, setResultadosLocales] = useState<AlimentoComun[]>([])
  const [productoSeleccionado, setProductoSeleccionado] = useState<string | null>(null)
  const [refPorcion, setRefPorcion] = useState<{ label: string; g: number } | null>(null)
  const base100gRef = useRef<Base100g | null>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // ─── Escaneo ──────────────────────────────────────────────────────────────────
  const [procesandoImagen, setProcesandoImagen] = useState(false)
  const [errorEscaneo, setErrorEscaneo] = useState<string | null>(null)
  const [mostrarOpcionesEscaneo, setMostrarOpcionesEscaneo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const pointerDownOnBackdrop = useRef(false)

  // ─── Efectos ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!busqueda.trim() || busqueda.length < 2) { setResultadosLocales([]); return }
    clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => setResultadosLocales(buscarAlimentosComunes(busqueda)), 200)
    return () => clearTimeout(searchRef.current)
  }, [busqueda])

  useEffect(() => {
    if (!busquedaIng.trim() || busquedaIng.length < 2) { setResultadosIng([]); return }
    clearTimeout(ingSearchRef.current)
    ingSearchRef.current = setTimeout(() => setResultadosIng(buscarAlimentosComunes(busquedaIng)), 200)
    return () => clearTimeout(ingSearchRef.current)
  }, [busquedaIng])

  useEffect(() => {
    if (!mostrarOpcionesEscaneo) return
    const h = () => setMostrarOpcionesEscaneo(false)
    document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [mostrarOpcionesEscaneo])

  // Recalcular totales de receta al cambiar ingredientes
  useEffect(() => {
    if (!modoReceta) return
    setForm(prev => ({ ...prev, ...sumIngredientes(ingredientes), fuente: 'claude_estimado' }))
  }, [ingredientes, modoReceta])

  // ─── Lógica modo 'cantidad' (simple) ─────────────────────────────────────────

  const aplicarCantidad = (cant: number, gpu: number) => {
    const porcion_g = r(cant * gpu)
    setForm(prev => ({
      ...prev, porcion_g,
      ...(base100gRef.current ? calcNutrientes(base100gRef.current, porcion_g) : {}),
    }))
  }

  // ─── Lógica modo simple ───────────────────────────────────────────────────────

  const seleccionarLocal = (alimento: AlimentoComun) => {
    const base = base100gDesdeDB(alimento)
    base100gRef.current = base
    if (unidad === 'cantidad' && (alimento.gramos_por_unidad ?? alimento.porcion_tipica_g)) {
      const gpu = alimento.gramos_por_unidad ?? alimento.porcion_tipica_g!
      setGramosPorUnidad(gpu)
      setCantidad(1)
      setForm(prev => ({
        ...prev, nombre: alimento.nombre, porcion_g: gpu,
        ...calcNutrientes(base, gpu), fuente: 'claude_estimado',
      }))
    } else {
      const porcion = alimento.porcion_tipica_g ?? form.porcion_g
      setForm(prev => ({
        ...prev, nombre: alimento.nombre, porcion_g: porcion,
        ...calcNutrientes(base, porcion), fuente: 'claude_estimado',
      }))
    }

    setProductoSeleccionado(alimento.nombre)
    setRefPorcion(alimento.porcion_tipica_g && alimento.porcion_label
      ? { label: alimento.porcion_label, g: alimento.porcion_tipica_g } : null)
    setBusqueda('')
    setResultadosLocales([])
    setExpandidoMicros(true)
  }

  const limpiarProducto = () => {
    base100gRef.current = null
    setProductoSeleccionado(null)
    setRefPorcion(null)
    setCantidad(1)
    setGramosPorUnidad(100)
    setForm({ ...EMPTY })
  }

  const setField = (key: keyof typeof form, value: string) => {
    setForm(prev => {
      if (key === 'nombre' || key === 'fuente') return { ...prev, [key]: value }
      const num = parseFloat(value) || 0
      if (key === 'porcion_g') {
        const updated = { ...prev, porcion_g: num }
        if (base100gRef.current && num > 0 && unidad !== 'cantidad') {
          return { ...updated, ...calcNutrientes(base100gRef.current, num) }
        }
        return updated
      }
      // Edición manual de nutriente: actualizar base100gRef para que futuros cambios de porción escalen desde aquí
      if (base100gRef.current && prev.porcion_g > 0) {
        base100gRef.current = { ...base100gRef.current, [key]: r(num / prev.porcion_g * 100) }
      }
      return { ...prev, [key]: num }
    })
  }

  // ─── Lógica modo receta ───────────────────────────────────────────────────────

  const agregarIngDesdeDB = (alimento: AlimentoComun) => {
    setIngredientes(prev => [...prev, ingDesdeDB(alimento, alimento.gramos_por_unidad ?? alimento.porcion_tipica_g ?? 100)])
    setBusquedaIng('')
    setResultadosIng([])
    setMostrarBuscadorIng(false)
  }

  const agregarIngManual = (nombre: string) => {
    const nuevo: IngredienteReceta = {
      nombre: nombre.trim(), porcion_g: 100,
      calorias: 0, proteina_g: 0, carbohidratos_g: 0, grasas_g: 0,
      grasas_saturadas_g: 0, fibra_g: 0, sodio_mg: 0, azucar_g: 0,
      colesterol_mg: 0, calcio_mg: 0, hierro_mg: 0, vitamina_c_mg: 0, vitamina_d_ug: 0,
    }
    setIngredientes(prev => [...prev, nuevo])
    setBusquedaIng('')
    setResultadosIng([])
    setMostrarBuscadorIng(false)
    setExpandidoIngIdx(ingredientes.length)
  }

  const cambiarPorcionIng = (idx: number, nuevaPorcion: number) => {
    setIngredientes(prev => prev.map((ing, i) => {
      if (i !== idx) return ing
      const per100 = getPer100g(ing)
      if (!per100 || nuevaPorcion <= 0) return { ...ing, porcion_g: nuevaPorcion }
      return { ...ing, porcion_g: nuevaPorcion, ...calcNutrientes(per100, nuevaPorcion) }
    }))
  }

  const cambiarCantidadIng = (idx: number, cant: number) => {
    setIngredientes(prev => prev.map((ing, i) => {
      if (i !== idx) return ing
      const porcion_g = r(cant * (ing.gramos_por_unidad ?? ing.porcion_g))
      const per100 = getPer100g(ing)
      if (!per100) return { ...ing, cantidad: cant, porcion_g }
      return { ...ing, cantidad: cant, porcion_g, ...calcNutrientes(per100, porcion_g) }
    }))
  }

  const cambiarGramosPorUnidadIng = (idx: number, gpu: number) => {
    setIngredientes(prev => prev.map((ing, i) => {
      if (i !== idx) return ing
      const porcion_g = r((ing.cantidad ?? 1) * gpu)
      const per100 = getPer100g(ing)
      if (!per100) return { ...ing, gramos_por_unidad: gpu, porcion_g }
      return { ...ing, gramos_por_unidad: gpu, porcion_g, ...calcNutrientes(per100, porcion_g) }
    }))
  }

  const cambiarUnidadIng = (idx: number, u: Unidad) => {
    setIngredientes(prev => prev.map((ing, i) => {
      if (i !== idx) return ing
      if (u === 'cantidad') {
        // Al pasar a 'cantidad': el gramos/unidad = porcion actual, cantidad = 1
        return { ...ing, unidad: u, cantidad: 1, gramos_por_unidad: ing.porcion_g }
      }
      return { ...ing, unidad: u }
    }))
  }

  const cambiarCampoIng = (idx: number, field: keyof IngredienteReceta, value: number) => {
    setIngredientes(prev => prev.map((ing, i) => {
      if (i !== idx) return ing
      const existing = getPer100g(ing)
      const updatedPer100g = existing && ing.porcion_g > 0
        ? { ...existing, [field]: r(value / ing.porcion_g * 100) }
        : existing
      return { ...ing, [field]: value, _per100g: updatedPer100g ?? undefined }
    }))
  }

  const cambiarNombreIng = (idx: number, nombre: string) => {
    setIngredientes(prev => prev.map((ing, i) => i === idx ? { ...ing, nombre } : ing))
  }

  // ─── Escaneo ──────────────────────────────────────────────────────────────────

  const comprimirImagen = (file: File): Promise<{ base64: string; media_type: 'image/jpeg' }> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const scale = img.width > 1024 ? 1024 / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas no disponible'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve({ base64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], media_type: 'image/jpeg' })
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Error al cargar imagen')) }
      img.src = url
    })

  const handleEscanear = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setErrorEscaneo(null)
    setProcesandoImagen(true)

    try {
      const { base64, media_type } = await comprimirImagen(file)
      const res = await supabase.functions.invoke('scan-label', {
        body: { image_base64: base64, media_type },
      })
      if (res.error) throw new Error(res.error.message)
      const data = res.data as {
        ok: boolean; error?: string
        alimento?: { nombre: string; porcion_g: number; porcion_unidad: 'g' | 'ml' | 'cantidad'; porcion_cantidad?: number | null; per_porcion: Record<string, number>; per_100g: Record<string, number> }
      }
      if (!data.ok || !data.alimento) throw new Error(data.error ?? 'No se pudo leer la etiqueta')

      const { nombre, porcion_g, porcion_unidad: scannedUnidad = 'g', porcion_cantidad: scannedCantidad, per_porcion, per_100g } = data.alimento

      // Cuando la etiqueta dice "X unidades": calcular gramos por unidad
      const scannedGpu = scannedUnidad === 'cantidad' && scannedCantidad && scannedCantidad > 0
        ? Math.round(porcion_g / scannedCantidad)
        : null

      if (modoReceta) {
        const nuevo: IngredienteReceta = {
          nombre, porcion_g, unidad: scannedUnidad,
          ...(scannedUnidad === 'cantidad' && scannedCantidad ? { cantidad: scannedCantidad, gramos_por_unidad: scannedGpu ?? undefined } : {}),
          calorias:           per_porcion.calorias,
          proteina_g:         per_porcion.proteina_g,
          carbohidratos_g:    per_porcion.carbohidratos_g,
          grasas_g:           per_porcion.grasas_g,
          grasas_saturadas_g: per_porcion.grasas_saturadas_g,
          fibra_g:            per_porcion.fibra_g,
          sodio_mg:           per_porcion.sodio_mg,
          azucar_g:           per_porcion.azucar_g,
          colesterol_mg:      per_porcion.colesterol_mg,
          calcio_mg:          per_porcion.calcio_mg,
          hierro_mg:          per_porcion.hierro_mg,
          vitamina_c_mg:      per_porcion.vitamina_c_mg,
          vitamina_d_ug:      per_porcion.vitamina_d_ug,
          _per100g: {
            calorias: per_100g.calorias, proteina_g: per_100g.proteina_g,
            carbohidratos_g: per_100g.carbohidratos_g, grasas_g: per_100g.grasas_g,
            grasas_saturadas_g: per_100g.grasas_saturadas_g, fibra_g: per_100g.fibra_g,
            sodio_mg: per_100g.sodio_mg, azucar_g: per_100g.azucar_g,
            colesterol_mg: per_100g.colesterol_mg ?? 0, calcio_mg: per_100g.calcio_mg,
            hierro_mg: per_100g.hierro_mg, vitamina_c_mg: per_100g.vitamina_c_mg,
            vitamina_d_ug: per_100g.vitamina_d_ug,
          },
        }
        setIngredientes(prev => [...prev, nuevo])
        setMostrarBuscadorIng(false)
      } else {
        base100gRef.current = {
          calorias: per_100g.calorias, proteina_g: per_100g.proteina_g,
          carbohidratos_g: per_100g.carbohidratos_g, grasas_g: per_100g.grasas_g,
          grasas_saturadas_g: per_100g.grasas_saturadas_g, fibra_g: per_100g.fibra_g,
          sodio_mg: per_100g.sodio_mg, azucar_g: per_100g.azucar_g,
          colesterol_mg: per_100g.colesterol_mg ?? 0, calcio_mg: per_100g.calcio_mg,
          hierro_mg: per_100g.hierro_mg, vitamina_c_mg: per_100g.vitamina_c_mg,
          vitamina_d_ug: per_100g.vitamina_d_ug,
        }
        setForm(prev => ({
          ...prev, nombre, porcion_g,
          calorias: per_porcion.calorias, proteina_g: per_porcion.proteina_g,
          carbohidratos_g: per_porcion.carbohidratos_g, grasas_g: per_porcion.grasas_g,
          grasas_saturadas_g: per_porcion.grasas_saturadas_g, fibra_g: per_porcion.fibra_g,
          sodio_mg: per_porcion.sodio_mg, azucar_g: per_porcion.azucar_g,
          colesterol_mg: per_porcion.colesterol_mg, calcio_mg: per_porcion.calcio_mg,
          hierro_mg: per_porcion.hierro_mg, vitamina_c_mg: per_porcion.vitamina_c_mg,
          vitamina_d_ug: per_porcion.vitamina_d_ug, fuente: 'escaner_etiqueta',
        }))
        setUnidad(scannedUnidad)
        if (scannedUnidad === 'cantidad' && scannedCantidad) {
          setCantidad(scannedCantidad)
          setGramosPorUnidad(scannedGpu ?? 0)
        }
        setProductoSeleccionado(nombre)
        setRefPorcion(null)
        setBusqueda('')
        setResultadosLocales([])
        setExpandidoMicros(true)
      }
    } catch (err) {
      setErrorEscaneo(err instanceof Error ? err.message : 'Error al escanear la etiqueta')
    } finally {
      setProcesandoImagen(false)
    }
  }

  // ─── Guardar ─────────────────────────────────────────────────────────────────

  const handleGuardar = async () => {
    if (!form.nombre.trim()) return
    if (!modoReceta && form.porcion_g <= 0) return
    if (modoReceta && ingredientes.length === 0) return
    setGuardando(true)
    try {
      await onGuardar({
        ...form,
        porcion_unidad: unidad,
        porcion_cantidad: unidad === 'cantidad' ? cantidad : null,
        porcion_gramos_por_unidad: unidad === 'cantidad' ? gramosPorUnidad : null,
        ingredientes: modoReceta ? ingredientes : null,
      })
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  // ─── Totales receta ───────────────────────────────────────────────────────────

  const totalesReceta = modoReceta ? sumIngredientes(ingredientes) : null

  // ─── Botón de escaneo (compartido) ───────────────────────────────────────────

  const ScanButton = () => (
    <div className="relative">
      <button
        type="button"
        disabled={procesandoImagen}
        onClick={() => setMostrarOpcionesEscaneo(v => !v)}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors disabled:opacity-50',
          modoReceta
            ? 'border-dashed border-violet-300 text-violet-500 hover:border-violet-400 hover:bg-violet-50'
            : 'border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50',
        )}
      >
        {procesandoImagen ? (
          <>
            <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Leyendo etiqueta...
          </>
        ) : (
          <>
            <ScanLine size={15} className="shrink-0" />
            {modoReceta ? 'Escanear etiqueta de ingrediente' : 'Escanear etiqueta nutricional'}
          </>
        )}
      </button>
      {mostrarOpcionesEscaneo && !procesandoImagen && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          onPointerDown={e => e.stopPropagation()}>
          <button type="button"
            onClick={() => { setMostrarOpcionesEscaneo(false); cameraInputRef.current?.click() }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100">
            <Camera size={15} className="text-gray-400 shrink-0" />
            Tomar foto
          </button>
          <button type="button"
            onClick={() => { setMostrarOpcionesEscaneo(false); fileInputRef.current?.click() }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            Elegir de la galería
          </button>
        </div>
      )}
    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleEscanear} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleEscanear} />

      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onPointerDown={() => { pointerDownOnBackdrop.current = true }}
        onPointerUp={() => { if (pointerDownOnBackdrop.current) onClose(); pointerDownOnBackdrop.current = false }}
      />

      <div
        className="relative w-full sm:max-w-2xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl animate-slide-up max-h-[88vh] flex flex-col"
        onPointerDown={e => { pointerDownOnBackdrop.current = false; e.stopPropagation() }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', config.bg)}>
            {modoReceta ? <ChefHat size={17} className={config.color} /> : <Utensils size={17} className={config.color} />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 leading-tight">
              {esEdicion ? 'Editar alimento' : (modoReceta ? 'Nueva receta' : 'Agregar alimento')}
            </h2>
            <p className={cn('text-xs font-medium', config.color)}>{config.label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* ── Scroll body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* Toggle Simple / Receta */}
            {(!esEdicion || tieneIngredientes) && (
              <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
                <button type="button" onClick={() => setModoReceta(false)}
                  className={cn('flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all',
                    !modoReceta ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700')}>
                  <Utensils size={13} /> Alimento simple
                </button>
                <button type="button" onClick={() => setModoReceta(true)}
                  className={cn('flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all',
                    modoReceta ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700')}>
                  <ChefHat size={13} /> Receta
                </button>
              </div>
            )}

            {/* Nombre */}
            <Input
              label={modoReceta ? 'Nombre de la receta' : 'Nombre del alimento'}
              placeholder={modoReceta ? 'Ej: Licuado de proteína' : 'Ej: Pechuga de pollo'}
              value={form.nombre}
              onChange={e => {
                setField('nombre', e.target.value)
                if (!esEdicion && !modoReceta) setBusqueda(e.target.value)
                if (errorEscaneo) setErrorEscaneo(null)
              }}
              autoFocus
            />

            {/* Dropdown sugerencias (modo simple) */}
            {!modoReceta && resultadosLocales.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm -mt-3">
                {resultadosLocales.map((a, i) => (
                  <button key={i} type="button" onClick={() => seleccionarLocal(a)}
                    className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border-b border-gray-100 last:border-0">
                    <p className="text-sm text-gray-800 font-medium truncate">{a.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {a.categoria} · {a.calorias} kcal/100g
                      {a.porcion_label && <> · <span className="text-gray-500">{a.porcion_label} = {a.porcion_tipica_g}g</span></>}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Badge producto seleccionado */}
            {!modoReceta && productoSeleccionado && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 -mt-3">
                <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                <p className="text-sm text-green-700 flex-1 truncate font-medium">{productoSeleccionado}</p>
                <button onClick={limpiarProducto} className="text-green-400 hover:text-green-600">
                  <XCircle size={15} />
                </button>
              </div>
            )}

            {/* Error escaneo */}
            {errorEscaneo && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 -mt-3">
                <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 flex-1">{errorEscaneo}</p>
                <button type="button" onClick={() => setErrorEscaneo(null)} className="text-red-300 hover:text-red-500">
                  <X size={13} />
                </button>
              </div>
            )}

            {/* ══════════ MODO RECETA ══════════ */}
            {modoReceta ? (
              <div className="space-y-3">
                {ingredientes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Ingredientes ({ingredientes.length})
                    </p>
                    {ingredientes.map((ing, idx) => (
                      <IngredienteRow
                        key={idx}
                        ing={ing}
                        idx={idx}
                        expandido={expandidoIngIdx === idx}
                        onToggle={() => setExpandidoIngIdx(expandidoIngIdx === idx ? null : idx)}
                        onChangePorcion={v => cambiarPorcionIng(idx, v)}
                        onChangeCantidad={v => cambiarCantidadIng(idx, v)}
                        onChangeGramosPorUnidad={v => cambiarGramosPorUnidadIng(idx, v)}
                        onChangeUnidad={u => cambiarUnidadIng(idx, u)}
                        onChangeField={(f, v) => cambiarCampoIng(idx, f, v)}
                        onChangeName={(n) => cambiarNombreIng(idx, n)}
                        onEliminar={() => { setIngredientes(prev => prev.filter((_, i) => i !== idx)); if (expandidoIngIdx === idx) setExpandidoIngIdx(null) }}
                      />
                    ))}
                  </div>
                )}

                {/* Buscador */}
                {mostrarBuscadorIng ? (
                  <div className="space-y-2">
                    <input type="text" autoFocus placeholder="Buscar ingrediente..."
                      value={busquedaIng} onChange={e => setBusquedaIng(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                    {(resultadosIng.length > 0 || busquedaIng.length >= 2) && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        {resultadosIng.map((a, i) => (
                          <button key={i} type="button" onClick={() => agregarIngDesdeDB(a)}
                            className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border-b border-gray-100 last:border-0">
                            <p className="text-sm text-gray-800 font-medium truncate">{a.nombre}</p>
                            <p className="text-xs text-gray-400">
                              {a.calorias} kcal/100g
                              {a.porcion_label && <> · {a.porcion_label} = {a.porcion_tipica_g}g</>}
                            </p>
                          </button>
                        ))}
                        {busquedaIng.length >= 2 && (
                          <button type="button" onClick={() => agregarIngManual(busquedaIng)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-500 flex items-center gap-2 border-t border-gray-100">
                            <Plus size={13} className="text-gray-400 shrink-0" />
                            Agregar "{busquedaIng}" manualmente
                          </button>
                        )}
                      </div>
                    )}
                    <button type="button"
                      onClick={() => { setMostrarBuscadorIng(false); setBusquedaIng(''); setResultadosIng([]) }}
                      className="text-xs text-gray-400 hover:text-gray-600">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setMostrarBuscadorIng(true)}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                      <Plus size={15} className="shrink-0" /> Agregar ingrediente
                    </button>
                    <ScanButton />
                  </div>
                )}

                {/* Totales */}
                {ingredientes.length > 0 && totalesReceta && (
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total de la receta</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Etiqueta:</span>
                        <UnidadToggle value={unidad} onChange={setUnidad} />
                      </div>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">{Math.round(totalesReceta.calorias)}</span>
                        <span className="text-sm text-gray-400 font-medium">
                          kcal · {(() => {
                            if (unidad === 'cantidad') {
                              const t = ingredientes.filter(i => (i.unidad ?? 'g') === 'cantidad').reduce((s, i) => s + (i.cantidad ?? 1), 0)
                              return t > 0 ? `${t} unid. total` : '—'
                            }
                            const t = ingredientes.filter(i => (i.unidad ?? 'g') === unidad).reduce((s, i) => s + i.porcion_g, 0)
                            return t > 0 ? `${Math.round(t)}${unidad} total` : '—'
                          })()}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className="inline-flex text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2.5 py-1">P {totalesReceta.proteina_g}g</span>
                        <span className="inline-flex text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-2.5 py-1">C {totalesReceta.carbohidratos_g}g</span>
                        <span className="inline-flex text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1">G {totalesReceta.grasas_g}g</span>
                        {totalesReceta.fibra_g > 0 && (
                          <span className="inline-flex text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-lg px-2.5 py-1">Fibra {totalesReceta.fibra_g}g</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {ingredientes.length === 0 && !mostrarBuscadorIng && (
                  <div className="text-center py-6 text-gray-400">
                    <ChefHat size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Agrega los ingredientes de tu receta</p>
                    <p className="text-xs mt-1">Busca en la base de datos o escanea la etiqueta</p>
                  </div>
                )}
              </div>

            ) : (
              /* ══════════ MODO SIMPLE ══════════ */
              <div className="space-y-5">
                <ScanButton />

                {/* Porción + selector embebido */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 block">
                        {unidad === 'cantidad' ? 'Cantidad' : `Porción (${unidad})`}
                      </label>
                      <PorcionInput
                        value={unidad === 'cantidad' ? (cantidad || '') : (form.porcion_g || '')}
                        onChange={v => {
                          if (unidad === 'cantidad') {
                            const num = parseFloat(v) || 1
                            setCantidad(num)
                            aplicarCantidad(num, gramosPorUnidad)
                          } else {
                            setField('porcion_g', v)
                          }
                        }}
                        unidad={unidad}
                        onUnidadChange={u => {
                          if (u !== 'cantidad' && unidad === 'cantidad')
                            setForm(prev => ({ ...prev, porcion_g: r(cantidad * gramosPorUnidad) }))
                          setUnidad(u)
                        }}
                        placeholder={unidad === 'cantidad' ? '1' : '100'}
                      />
                      {refPorcion && unidad !== 'cantidad' && (
                        <button type="button"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev, porcion_g: refPorcion.g,
                              ...(base100gRef.current ? calcNutrientes(base100gRef.current, refPorcion.g) : {}),
                            }))
                          }}
                          className="text-xs bg-gray-100 hover:bg-primary-100 hover:text-primary-700 text-gray-600 px-2.5 py-1 rounded-lg transition-colors font-medium">
                          {refPorcion.label} = {refPorcion.g}g
                        </button>
                      )}
                    </div>
                    <Input label="Calorías (kcal)" type="number" min="0" placeholder="0"
                      value={form.calorias || ''} onChange={e => setField('calorias', e.target.value)} />
                  </div>

                  {/* Campos extra para modo # */}
                  {unidad === 'cantidad' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 block">Gramos por unidad</label>
                        <input type="number" min="0.1" step="0.1" placeholder="ej: 55"
                          value={gramosPorUnidad || ''}
                          onChange={e => {
                            const v = parseFloat(e.target.value) || 1
                            setGramosPorUnidad(v)
                            aplicarCantidad(cantidad, v)
                          }}
                          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-300 text-right"
                        />
                      </div>
                      {form.porcion_g > 0 && (
                        <p className="text-xs text-gray-400">
                          {cantidad} × {gramosPorUnidad}g/u = <span className="font-semibold text-gray-600">{form.porcion_g}g total</span>
                        </p>
                      )}
                      {refPorcion && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Ref:</span>
                          <button type="button"
                            onClick={() => { setGramosPorUnidad(refPorcion.g); aplicarCantidad(cantidad, refPorcion.g) }}
                            className="text-xs bg-gray-100 hover:bg-primary-100 hover:text-primary-700 text-gray-600 px-2.5 py-1 rounded-lg transition-colors font-medium">
                            1 {refPorcion.label} = {refPorcion.g}g
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Macros */}
                <div className="grid grid-cols-3 gap-3">
                  {([
                    ['proteina_g',      'Proteína (g)',  'blue'],
                    ['carbohidratos_g', 'Carbs (g)',     'amber'],
                    ['grasas_g',        'Grasas (g)',    'emerald'],
                  ] as const).map(([key, label, color]) => (
                    <div key={key} className="space-y-1">
                      <label className={`text-xs font-medium text-${color}-600 block`}>{label}</label>
                      <input type="number" min="0" step="0.1" placeholder="0"
                        value={form[key] || ''}
                        onChange={e => setField(key, e.target.value)}
                        className={`w-full text-sm border border-${color}-200 bg-${color}-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-${color}-300 text-right`}
                      />
                    </div>
                  ))}
                </div>

                {/* Micronutrientes */}
                <button type="button" onClick={() => setExpandidoMicros(!expandidoMicros)}
                  className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
                  {expandidoMicros ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {expandidoMicros ? 'Ocultar' : 'Ver'} micronutrientes (opcional)
                </button>

                {expandidoMicros && (
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    {([
                      ['fibra_g','Fibra (g)'], ['azucar_g','Azúcar (g)'],
                      ['grasas_saturadas_g','G.Sat. (g)'], ['sodio_mg','Sodio (mg)'],
                      ['colesterol_mg','Colesterol (mg)'], ['calcio_mg','Calcio (mg)'],
                      ['hierro_mg','Hierro (mg)'], ['vitamina_c_mg','Vit. C (mg)'],
                      ['vitamina_d_ug','Vit. D (µg)'],
                    ] as const).map(([key, label]) => (
                      <Input key={key} label={label} type="number" min="0" step="0.1" placeholder="0"
                        value={form[key] || ''} onChange={e => setField(key, e.target.value)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 flex gap-3 shrink-0 border-t border-gray-100 bg-white">
          <Button variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button variant="primary" fullWidth loading={guardando}
            disabled={
              !form.nombre.trim() ||
              (!modoReceta && form.porcion_g <= 0) ||
              (modoReceta && ingredientes.length === 0)
            }
            onClick={handleGuardar}>
            {esEdicion ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

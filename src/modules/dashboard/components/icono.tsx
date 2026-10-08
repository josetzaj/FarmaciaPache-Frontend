type NombreIcono =
  | 'inicio'
  | 'ventas'
  | 'inventario'
  | 'compras'
  | 'organizacion'
  | 'seguridad'
  | 'reportes'
  | 'menu'
  | 'cerrar'
  | 'campana'
  | 'sucursal'
  | 'chevron'
  | 'escudo'
  | 'llave'
  | 'reloj'
  | 'usuarios'
  | 'departamento'
  | 'puesto'
  | 'estado'
  | 'flecha'
  | 'check'

type IconoProps = {
  nombre: NombreIcono
  className?: string
}

const trazos: Record<NombreIcono, React.ReactNode> = {
  inicio: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9 20v-6h6v6" /></>,
  ventas: <><path d="M4 5h2l1.8 9.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 8H7" /><circle cx="10" cy="19" r="1" /><circle cx="18" cy="19" r="1" /></>,
  inventario: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 7v10l8 4 8-4V7M12 11v10" /></>,
  compras: <><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
  organizacion: <><circle cx="12" cy="7" r="3" /><path d="M6 20v-1a6 6 0 0 1 12 0v1M4 11a2.5 2.5 0 0 0 0 5M20 11a2.5 2.5 0 0 1 0 5" /></>,
  seguridad: <><path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  reportes: <><path d="M5 20V10M12 20V4M19 20v-7" /><path d="M3 20h18" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  cerrar: <path d="m6 6 12 12M18 6 6 18" />,
  campana: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
  sucursal: <><path d="M4 10h16M6 10v10M18 10v10M3 20h18M5 10l1-6h12l1 6" /><path d="M9 14h6v6" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  escudo: <><path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6l-7-3Z" /><path d="M9.5 12h5" /></>,
  llave: <><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M16 7l2 2M14 9l2 2" /></>,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  usuarios: <><path d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20" /><circle cx="10" cy="7" r="3" /><path d="M17 11a3 3 0 1 0 0-6M18 14a4 4 0 0 1 3 3.9V20" /></>,
  departamento: <><path d="M4 20V8h16v12M8 8V4h8v4M3 20h18" /><path d="M8 12h2M14 12h2M8 16h2M14 16h2" /></>,
  puesto: <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M9 7V5h6v2M3 12h18M10 12v2h4v-2" /></>,
  estado: <><path d="M5 4h14v16H5z" /><path d="m8 9 1.5 1.5L12 8M14 9h2M8 15h8" /></>,
  flecha: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
}

export function Icono({ nombre, className }: IconoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {trazos[nombre]}
    </svg>
  )
}

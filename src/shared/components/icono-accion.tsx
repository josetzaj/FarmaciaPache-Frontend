type IconoAccionProps = {
  nombre: 'guardar' | 'cancelar' | 'editar' | 'desactivar' | 'enviar' | 'estado' | 'agregar'
  className?: string
}

const trazos = {
  agregar: <path d="M12 5v14M5 12h14" />,
  guardar: (
    <>
      <path d="M5 3h11l3 3v15H5V3Z" />
      <path d="M8 3v6h8V3M8 21v-7h8v7" />
    </>
  ),
  cancelar: <path d="m6 6 12 12M18 6 6 18" />,
  editar: (
    <>
      <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  desactivar: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v8" />
    </>
  ),
  enviar: (
    <>
      <path d="M3 11.5 21 3l-7 18-3.5-7L3 11.5Z" />
      <path d="m10.5 14 4-4" />
    </>
  ),
  estado: (
    <>
      <path d="M4 7h10M14 7l-2.5-2.5M14 7l-2.5 2.5" />
      <path d="M20 17H10M10 17l2.5-2.5M10 17l2.5 2.5" />
    </>
  ),
}

export function IconoAccion({ nombre, className }: IconoAccionProps) {
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

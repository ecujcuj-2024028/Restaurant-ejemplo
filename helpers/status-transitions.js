// Transiciones válidas de estado
const STATUS_TRANSITIONS = {
    pendiente       : ['confirmado', 'cancelado'],
    confirmado      : ['en_preparacion', 'cancelado'],
    en_preparacion  : ['listo_para_envio', 'cancelado'],
    listo_para_envio: ['en_camino'],
    en_camino       : ['entregado'],
    entregado       : [],
    cancelado       : [],
};
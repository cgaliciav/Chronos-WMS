/**
 * TypeORM 1.x solo acepta `relations` y `select` como objetos (`{ sesion: { usuario: true } }`). Los helpers genéricos
 * (CommonController) reciben listas de rutas con puntos (`["sesion", "sesion.usuario"]`): esta función las convierte.
 */
export type ArbolRutas = { [clave: string]: true | ArbolRutas };

export const rutasAObjeto = (rutas: readonly string[]): ArbolRutas => {
  const arbol: ArbolRutas = {};
  for (const ruta of rutas) {
    const partes = ruta.split(".");
    let nodo = arbol;
    partes.forEach((parte, i) => {
      if (i === partes.length - 1) {
        if (nodo[parte] === undefined) nodo[parte] = true;
      } else {
        const hijo = nodo[parte];
        nodo = nodo[parte] = typeof hijo === "object" ? hijo : {};
      }
    });
  }
  return arbol;
};

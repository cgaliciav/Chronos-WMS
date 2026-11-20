# Ejercicios para el instructor

**Solo para quien da la capacitación.** Ejemplos preparados con los datos que tiene **staging de AMZ**
(`https://amz-stage.exogrid.xyz`) al 19 de noviembre de 2026. Los resultados esperados salen de las reglas del
sistema; los ejercicios **no se han ejecutado** en staging para no alterar su estado antes de la sesión.

> ⚠️ Los ejercicios cambian los datos de staging y están **en orden**: cada uno usa lo que dejó el anterior.
> Si repites la sesión, los nombres de listado propuestos terminarán en `2`, `3`… y las cantidades serán otras.

## Datos de staging que conviene tener a la mano

**Usuarios** (las contraseñas las tiene el instructor):

| Usuario | Perfil | Visibilidad | Proyectos |
|---|---|---|---|
| Cesar Galicia | Superadministrador | General | Los tres |
| Cesar EL NEGRO | Encargado de Producción | Producción exclusiva | EL NEGRO |
| Cesar Usuario | Visita | Usuario exclusivo | Los tres |
| Cesar Sin Correo | Sin correo (no entra) | — | — |

**Catálogos:** proyectos POR CATÁLOGO S1, LA VENTA y EL NEGRO · áreas PRODUCCIÓN, MAQUILLAJE Y PEINADO, UTILERÍA y
DECORACIÓN · almacén BODEGA CEDRO · 21 proveedores (AMAZON, HOME DEPOT MEXICO, OFFICE DEPOT MEXICO…) · 768 artículos
(540 disponibles, 4 prestados, 224 dados de baja).

**Artículos buenos para ejemplos** (todos disponibles en el almacén):

| Clave | Artículo | Área | En almacén |
|---|---|---|:-:|
| `0000005286` | CHALECO AMARILLO | Producción | 25 |
| `0000005262` | CARTULINAS NEGRAS | Producción | 20 |
| `0000005747` | ANTEOJOS | Utilería | 51 |
| `0000005662` | VASOS CHICOS Y LARGOS | Utilería | 30 |
| `0000005536` | VELAS LED | Decoración | 14 |
| `0000005652` | SILLAS PLEGABLES | Decoración | 10 |
| `0000005357` | PELUCA AFRO DE COLORES | Maquillaje y Peinado | 8 |

**Ya prestados a EL NEGRO** (1 pieza cada uno, sirven para mostrar Préstamos Activos y un rechazo):

| Clave | Artículo | Listado |
|---|---|---|
| `0000005001` | FUNDA DE IPHONE 17 | EN-UTILERÍA-P1 |
| `0000005002` | CÁMARA Y MICRO SD PARA CÁMARA | EN-UTILERÍA-P1 |
| `0000005003` | CAJA PARA CAMIÓN DE PRODUCCIÓN | EN-DECORACIÓN-P1 |
| `0000005004` | TAPONES PARA OIDOS | EN-DECORACIÓN-P1 |

**Correos:** staging no envía correos reales. Los reportes y avisos se ven en el buzón de pruebas (mailpit):
`ssh -N -L 8025:127.0.0.1:8025 cesargv@192.168.122.64` y abrir `http://localhost:8025`.

---

## Bloque 1 · Todos (con Cesar Galicia en pantalla)

### Ejercicio 1 · Encontrar un artículo

1. Catálogos → **Búsqueda General**. Buscar `ANTEOJOS`.
2. Hacer clic en **ANTEOJOS**: se abre la ventana de detalle.
3. Mostrar: clave `0000005747`, existencia 51, y su historia (una compra y una devolución de EL NEGRO).

**Qué enseña:** la clave, las existencias y que cada artículo guarda su historia.
**Pregunta para el grupo:** «¿Por qué tiene una devolución si nadie lo ha prestado?» → Porque lo compró la producción
y lo entregó al almacén.

### Ejercicio 2 · Ver lo que está fuera

1. Operaciones → Préstamos → **Préstamos Activos**.
2. Aparecen los 4 artículos prestados a EL NEGRO, con **Pendiente** 1.

**Qué enseña:** «con la producción» y «pendiente».

---

## Bloque 2 · Operadores

### Ejercicio 3 · Préstamo

Historia: *«Producción de EL NEGRO pide 5 chalecos y todas las cartulinas negras.»*

1. Préstamos → **Salida**.
2. Area: `PRODUCCIÓN` · Proyecto Interno: `EL NEGRO` · pulsar **Crear Nombre** → propone `EN-PRODUCCIÓN-P1`.
3. Usuarios Responsables: `Cesar Sin Correo`. Pulsar **Crear préstamo**.
4. Clave `0000005286`, Cantidad `5`, **Buscar**.
5. Clave `0000005262`, Cantidad `20`, **Buscar**.

| Artículo | Antes (almacén / producción) | Después |
|---|:-:|:-:|
| CHALECO AMARILLO | 25 / 0 | 20 / 5 |
| CARTULINAS NEGRAS | 20 / 0 | 0 / 20 (queda «no disponible») |

**Provocar un error a propósito:** escanear `0000005001` (FUNDA DE IPHONE 17) → *NO HAY EXISTENCIA DISPONIBLE DEL
ARTÍCULO*, porque ya está prestada. Después, clave `0000005286` con cantidad `30` → *NO HAY EXISTENCIA SUFICIENTE…
EXISTENCIA:20 SOLICITADO:30*.

**Qué enseña:** los 3 pasos, la cantidad, que un «sin correo» puede ser responsable, y que el sistema no deja prestar
lo que no hay.

### Ejercicio 4 · Devolución parcial

Historia: *«Regresan 3 chalecos; se quedan con 2.»*

1. Devoluciones → **Devolución**.
2. Area `PRODUCCIÓN` · Proyecto `EL NEGRO` · **Crear Nombre** → `EN-PRODUCCIÓN-D1` · responsables · **Crear devolución**.
3. Clave `0000005286`, Cantidad `3`, **Buscar**.

Resultado: CHALECO AMARILLO queda 23 en almacén y 2 con la producción. Comprobar en **Préstamos Activos**: Pendiente 2.

**Provocar un error:** en un listado de devolución del proyecto `LA VENTA`, escanear `0000005286`. El sistema lo
rechaza: LA VENTA no tiene chalecos prestados.

### Ejercicio 5 · Baja con proyecto

Historia: *«Los 2 chalecos que faltaban se perdieron en locación.»*

1. Bajas → con Proyecto → **Baja**.
2. Proyecto `EL NEGRO` · **Crear Nombre** → `EN-PRODUCCIÓN-B1` · Tipo de baja **Injustificada** · **Crear baja**.
3. Clave `0000005286`, Cantidad `2`, **Buscar**.

Resultado: 23 en almacén, 0 con la producción, **total 23** (antes 25). Es el dibujo «¿Dónde están mis 25 chalecos?».

### Ejercicio 6 · Compra y recepción

Historia: *«LA VENTA compró en Amazon 2 lámparas y 10 rollos de cinta.»*

1. Compras / Facturas → **Nueva Factura**.
2. Proyecto `LA VENTA` · Proveedor: escribir `AMAZON` · Tipo Factura `Ticket` · Fecha factura: hoy ·
   Número Factura `CAP-001` · responsables · **Crear factura**.
3. Artículo 1: título `LÁMPARA DE PIE CAPACITACIÓN`, área `DECORACIÓN`, cantidad `2`, precio `850`, tipo **Regular** →
   **Guardar y siguiente**. Anotar la clave nueva (debería ser `0000005768`).
4. Artículo 2: título `CINTA GAFFER CAPACITACIÓN`, área `PRODUCCIÓN`, cantidad `10`, precio `120`, tipo
   **Expendable**. Anotar su clave.
5. Buscar la lámpara en Búsqueda por Códigos: aparece **no disponible** (la tiene LA VENTA).
6. Devoluciones → Devolución, proyecto `LA VENTA`: escanear la lámpara (cantidad 2) y la cinta (cantidad 10).

Resultado: la lámpara queda 2 disponibles; la cinta, 10 disponibles.

**Qué enseña:** lo comprado nace con la producción y entra al almacén con una devolución.

### Ejercicio 7 · Expendable

Historia: *«EL NEGRO pide 4 rollos de la cinta que se acaba de recibir.»*

1. Préstamos → Salida, proyecto `EL NEGRO`. Escanear la cinta, cantidad `4`.
2. Abrir **Préstamos Activos**: la cinta **no aparece**. Quedan 6 en el almacén y el total también es 6.

**Qué enseña:** el expendable se da por consumido; nadie queda debiendo.

### Ejercicio 8 · Transformación

Historia: *«Con 5 de las cartulinas negras, arte de EL NEGRO hizo un letrero.»*

1. Transformaciones → **Nueva Transformación**. Proyecto `EL NEGRO` · **Crear listado**.
2. Clave `0000005262` (CARTULINAS NEGRAS), **Unidades usadas** `5`.
3. Producto nuevo: título `LETRERO DE CARTULINA CAPACITACIÓN`, cantidad `1`. Guardar.

Resultado: a las cartulinas les quedan 15 (todas con EL NEGRO) y nace el letrero con clave propia, a cargo de EL NEGRO.
En el detalle del letrero se ve de qué artículo salió.

> Recordar al grupo: esto no se puede deshacer.

---

## Bloque 3 · Encargado de producción

### Ejercicio 9 · Entrar como encargado

1. Cerrar sesión y entrar como **Cesar EL NEGRO**.
2. Comparar el menú: solo Catálogos → Búsqueda por Proyecto, Préstamos, Devoluciones, Bajas y Compras, sin las
   pantallas para registrar préstamos, devoluciones ni bajas.
3. Búsqueda por Proyecto: proyecto `EL NEGRO`, operación **Préstamo**. Aparecen los chalecos, las cartulinas y los
   cuatro artículos que ya estaban prestados.
4. Buscar algo de otro proyecto (por ejemplo la lámpara de LA VENTA): **no aparece**. Solo ve lo de EL NEGRO.
5. Compras / Facturas → Nueva Factura con proyecto `EL NEGRO`, proveedor `HOME DEPOT MEXICO`, un artículo cualquiera.

**Qué enseña:** cada perfil ve sus menús y, con «Producción exclusiva», solo sus artículos.

### Ejercicio 10 · Entrar como visita

Entrar como **Cesar Usuario**: solo existe **Préstamos Activos**. Como además tiene visibilidad «Usuario exclusivo»,
solo ve los préstamos donde él es responsable (los del listado `EN-UTILERÍA-P1`).

---

## Bloque 4 · Administradores (volver a Cesar Galicia)

### Ejercicio 11 · Usuarios

1. Usuarios → **Nuevo**: nombre `Laura Capacitación`, perfil **Encargado de Producción**, visibilidad
   **Producción exclusiva**, proyecto `LA VENTA`.
2. Usuarios → **Nuevo**: nombre `Pedro Chofer`, marcar **Sin correo**. Mostrar que el correo se genera solo
   (`pedro.chofer@fake.exogrid.io`) y que no puede entrar.
3. Crear un préstamo y elegir a `Pedro Chofer` como responsable.

### Ejercicio 12 · Renombrar y mover

1. Abrir el listado `EN-PRODUCCIÓN-P1` → lápiz → renombrar a `EN-PRODUCCIÓN-P1 LOCACIÓN`.
2. En el renglón de CARTULINAS NEGRAS → **Mover a otro listado** → elegir `EN-UTILERÍA-P1`.
3. Abrir `EN-UTILERÍA-P1`: ahí está el renglón, con los responsables de ese listado.
4. Hacer notar que en la ventana solo se ofrecen listados del mismo tipo: un préstamo no se puede mover a una
   devolución.

### Ejercicio 13 · Productos por proveedor y reporte

1. Proveedores → **Productos por proveedor**. Proveedor `AMAZON`, sin proyecto.
2. Filtrar ahora con proyecto `LA VENTA`: aparecen la lámpara y la cinta del ejercicio 6.
3. **Reportes** → Excel sin foto. Mostrar el aviso, la campana 🔔 y el correo en mailpit.
4. Pedir dos reportes seguidos (uno con foto de `POR CATÁLOGO S1`, que tiene 361 compras, y otro sin foto) para
   mostrar el aviso **«Reporte en cola»**.

### Ejercicio 14 · Cierre

Reportes → **Cierre de Proyecto**, proyecto `EL NEGRO`. Antes, revisar en Préstamos Activos qué sigue pendiente y
preguntar al grupo cómo se resuelve cada renglón (devolución o baja).

---

## Preguntas de repaso

1. ¿En qué dos lugares puede estar un artículo? → En el almacén o con una producción.
2. Compré 3 sillas. ¿Ya se pueden prestar? → No, hasta que la producción las entregue con una devolución.
3. Presté 10, me regresaron 7. ¿Qué hago con los 3 que faltan? → Baja con proyecto (justificada o injustificada).
4. ¿Qué movimiento es el único que reduce el total? → La baja (y la transformación, que consume el original).
5. ¿Por qué la cinta no aparece en Préstamos Activos? → Es expendable: se da por consumida.
6. Puse un artículo en el listado equivocado. ¿Lo borro? → No: el administrador lo mueve a otro listado del mismo tipo.

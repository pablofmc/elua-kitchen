# Elúa Kitchen

La cocina de Elúa, una micro-panadería de masa madre: sus recetas, cómo se escalan a la producción del día y el registro de lo que se horneó.

## Lenguaje

### Recetas

**Receta**:
Un producto que Elúa sabe hacer (p. ej. "Rollos de canela"), con todos sus ingredientes y pasos.
_Evitar_: Fórmula

**Versión**:
Una forma fija de hacer una receta: sus ingredientes, cantidades, rendimiento base y pasos. Cambiar cualquiera de esos crea una versión nueva; cambiar el nombre, la foto o la categoría no.
_Evitar_: Revisión, edición

**Categoría**:
Cómo se agrupan las recetas: **Dulce** o **Salado**. Nada más, por ahora.
_Evitar_: Tipo, familia

**Rendimiento base**:
Cuántas piezas salen de una versión de la receta tal como está escrita (p. ej. 10 rollos).
_Evitar_: Porciones, yield

**Componente**:
Una parte de una receta con sus propios ingredientes (Masa, Relleno, Frosting). Los componentes se escalan junto con el resto de la receta, nunca por separado.
_Evitar_: Sub-receta, preparación

### Ingredientes

**Masa madre**:
El fermento vivo de harina y agua que se usa como ingrediente en las recetas. Nunca es una categoría.
_Evitar_: Starter, levain, fermento, MM

### Producción

**Lote**:
Una receta escalada a un número de piezas para un día de producción, junto con lo que pasó al hornearla. Siempre es una sola receta.
_Evitar_: Producción, batch, tanda

**Planeado**:
Estado de un lote ya calculado que todavía no se hornea.

**Horneado**:
Estado de un lote que ya se hizo; sus notas cuentan lo que pasó de verdad.

**Piezas planeadas**:
Las piezas para las que se calculó un lote.
_Evitar_: Piezas pedidas, objetivo

**Piezas reales**:
Las piezas que de verdad salieron al hornear un lote. Pueden ser menos que las planeadas.
_Evitar_: Rendimiento real, piezas obtenidas

### Cálculo

**Escalar**:
Multiplicar todos los ingredientes de una receta por el mismo factor para obtener otro número de piezas (p. ej. de 10 a 30 rollos: factor 3).
_Evitar_: Convertir, ajustar

### Proceso

**Paso**:
Una etapa del proceso de una versión (autólisis, pliegues, fermentación, formado). Tiene un tiempo, o es manual y termina cuando se toca «Listo».
_Evitar_: Etapa, fase

**Paso repetido**:
Un paso que se hace varias veces con un intervalo, como «4 pliegues cada 30 min». Cada vez se toca «Listo» al hacerla y entonces corre el intervalo hasta la siguiente; después de la última sigue el siguiente paso.

**Proceso**:
Una receta en marcha: se inicia, avanza paso por paso con sus tiempos y avisa cuando termina cada uno. Puede haber varios procesos a la vez.
_Evitar_: Timer, ejecución, corrida

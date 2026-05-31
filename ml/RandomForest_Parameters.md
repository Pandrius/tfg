# Parámetros de Random Forest (Scikit-Learn)

Random Forest es un modelo de aprendizaje conjunto (ensemble) basado en múltiples árboles de decisión. Los parámetros clave para ajustar son:

### 1. `n_estimators` (int, por defecto 100)
Número de árboles en el bosque.
- **Efecto**: Más árboles suelen mejorar la estabilidad y precisión del modelo, pero aumentan el tiempo de entrenamiento y memoria. A partir de cierto punto (ej. 200-500), la mejora es marginal.

### 2. `max_depth` (int, opcional)
Profundidad máxima de cada árbol.
- **Efecto**: Controla el sobreajuste (overfitting). Árboles muy profundos pueden memorizar el ruido del entrenamiento. Limitar la profundidad (ej. 10, 20) ayuda a generalizar mejor, especialmente con muchos features como los embeddings.

### 3. `min_samples_split` (int, por defecto 2)
Número mínimo de muestras requeridas para dividir un nodo interno.
- **Efecto**: Aumentar este valor hace que los árboles sean más conservadores y menos propensos a crear reglas para casos aislados.

### 4. `class_weight` (string or dict, opcional)
Peso de las clases (ej. 'balanced').
- **Efecto**: Crucial para datasets desbalanceados. 'balanced' ajusta los pesos inversamente a la frecuencia de las clases, ayudando a que el modelo no ignore la clase minoritaria.

### 5. `max_features` (string or int, por defecto 'sqrt')
Número de características a considerar al buscar la mejor división.
- **Efecto**: Con 768 dimensiones, usar 'sqrt' (~27 features por división) es estándar para mantener la diversidad entre los árboles y la eficiencia.

---

## Conclusiones de los Experimentos (Random Forest)

Se han ejecutado tres variantes de Random Forest utilizando el conjunto completo de embeddings (768 dimensiones) y el dataset total, obteniendo resultados significativamente superiores a RIPPER:

| Configuración | Accuracy | ROC-AUC | Avg Precision | F1 (Priv) |
| :--- | :--- | :--- | :--- | :--- |
| **Base** | 94.77% | 0.9888 | 0.9922 | 0.9554 |
| **Profundidad Controlada** | **94.94%** | **0.9896** | **0.9931** | **0.9570** |
| **Balanceado** | 94.76% | 0.9887 | 0.9922 | 0.9555 |

### Análisis de resultados:
1. **Rendimiento Excepcional**: Random Forest logra casi un **95% de precisión**, con un ROC-AUC y Average Precision cercanos a 1.0. Esto indica que el modelo separa casi perfectamente las clases pública y privada utilizando los embeddings.
2. **Profundidad Controlada (max_depth=20)**: Fue la mejor variante. Al limitar la profundidad y duplicar el número de árboles (`n_estimators=200`), el modelo generaliza mejor y evita el sobreajuste a patrones muy específicos de los embeddings.
3. **Balanceo**: Aunque el dataset es ligeramente desbalanceado, el parámetro `class_weight='balanced'` no supuso una mejora crítica, ya que el modelo base ya es capaz de identificar muy bien la clase privada (recall > 96%).

### Comparativa RF vs RIPPER:
- **RF** es órdenes de magnitud más rápido y preciso con datos de alta dimensionalidad como los embeddings.
- Mientras que **RIPPER** (basado en reglas legibles) sufre para encontrar umbrales claros en 768 dimensiones, **Random Forest** aprovecha la correlación entre múltiples dimensiones para tomar decisiones robustas.

**Recomendación final**: Para este proyecto, Random Forest con `n_estimators=200` y `max_depth=20` es el modelo más sólido hasta la fecha.
---

## Greedy Search encontrado en el proyecto

Se ha comprobado que Random Forest ya se habia probado con busqueda greedy en `train_modelo.py`, dentro de la funcion `ejecutar_experimento_rf_greedy`. Tambien aparece ejecutado en `resultado_train.txt` con el mismo formato de salida usado por el resto de modelos.

La busqueda greedy no prueba todas las combinaciones posibles como un grid completo. Ajusta un parametro cada vez, conserva la configuracion con mayor F1 de la clase privada y usa esa configuracion como base para el siguiente paso. En este caso se uso F1 de la clase privada como criterio porque el objetivo principal es clasificar bien la clase `Priv`.

### Parametros probados en la greedy search

| Paso | Valores probados | Mejor valor | Efecto esperado |
| :--- | :--- | :--- | :--- |
| `n_estimators` | 100, 200, 300 | 200 | Aumenta el numero de arboles. Mas arboles estabilizan las predicciones y reducen varianza, pero hacen el entrenamiento mas lento. En los resultados, pasar de 100 a 200 mejora F1 privada; 300 ya no aporta mejora suficiente. |
| `max_depth` | 10, 20, 30 | 30 | Limita la profundidad de cada arbol. Profundidades bajas reducen sobreajuste pero pueden quedarse cortas con embeddings complejos. En este experimento, 30 capta mejor las relaciones de los embeddings que 10 o 20. |
| `random_state` | 42 | 42 | Fija la semilla para que los resultados sean reproducibles. No mejora el modelo por si mismo, pero permite comparar experimentos de forma justa. |
| `n_jobs` | -1 | -1 | Usa todos los nucleos disponibles para acelerar el entrenamiento. No cambia las metricas, solo el tiempo de ejecucion. |

### Resultados greedy search

| Configuracion | Accuracy | ROC-AUC | Avg Precision | F1 (Priv) |
| :--- | :--- | :--- | :--- | :--- |
| `n_estimators=100` | 94.77% | 0.9888 | 0.9922 | 0.9554 |
| `n_estimators=200` | 95.10% | 0.9896 | 0.9929 | 0.9583 |
| `n_estimators=300` | 95.09% | 0.9898 | 0.9931 | 0.9581 |
| `n_estimators=200, max_depth=10` | 93.96% | 0.9868 | 0.9912 | 0.9491 |
| `n_estimators=200, max_depth=20` | 94.94% | 0.9896 | 0.9931 | 0.9570 |
| `n_estimators=200, max_depth=30` | **95.18%** | **0.9898** | **0.9932** | **0.9590** |

**Mejor configuracion greedy**: `RandomForestClassifier(random_state=42, n_jobs=-1, n_estimators=200, max_depth=30)`.

Esta configuracion mejora ligeramente la variante anterior recomendada (`n_estimators=200`, `max_depth=20`), especialmente en F1 de la clase privada: pasa de 0.9570 a 0.9590. La mejora es pequena, pero consistente con la idea de que los embeddings necesitan arboles algo mas profundos para capturar relaciones no lineales.

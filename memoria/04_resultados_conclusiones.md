# 4. Resultados y conclusiones

## 4.1. Introducción

En este capítulo se presentan los resultados obtenidos durante el desarrollo y validación de la plataforma. El análisis se divide en dos bloques principales. En primer lugar, se estudia el rendimiento de los modelos de clasificación entrenados sobre embeddings de texto. En segundo lugar, se revisa la validación funcional del sistema completo, incluyendo extracción de documentos, clasificación, almacenamiento y aplicación de políticas de acceso.

La fase experimental ha incluido una comparación amplia de modelos sobre el conjunto de validación y una evaluación final sobre el conjunto de test congelado. Aunque durante el desarrollo pueden incorporarse nuevas pruebas, las métricas incluidas en este capítulo permiten extraer conclusiones sólidas sobre el comportamiento relativo de las familias de modelos evaluadas.

## 4.2. Metodología de evaluación

La clasificación de documentos se plantea como un problema binario con dos clases: público y confidencial. Para evaluar los modelos se utilizan métricas habituales en aprendizaje supervisado: accuracy, precision, recall, F1-score y matriz de confusión. Cuando el modelo proporciona puntuaciones o probabilidades, también se analizan métricas de ranking como ROC-AUC y Average Precision.

En este dominio, la métrica más crítica es el recall de la clase confidencial. Un falso negativo implica clasificar como público un documento que realmente contiene información sensible, lo que puede producir una exposición no deseada. Por el contrario, un falso positivo clasifica como confidencial un documento público, lo que puede generar fricción o requerir revisión manual, pero no expone información privada. Esta asimetría justifica que la evaluación no se limite a maximizar la exactitud global.

Los experimentos se realizan sobre embeddings de alta dimensionalidad generados a partir del texto de los documentos [4], [6]. Estos embeddings se utilizan como entrada para distintos clasificadores supervisados. La comparación entre modelos busca equilibrar cuatro aspectos: rendimiento, sensibilidad hacia la clase confidencial, coste computacional e integración con el servicio de inferencia.

## 4.3. Resultados de modelos base

En una primera fase se evaluaron modelos supervisados clásicos: Regresión Logística, SVM lineal y Gaussian Naive Bayes [9]. Estos modelos permiten establecer una línea base y comprobar si los embeddings generados contienen información suficiente para separar documentos públicos y confidenciales.

| Modelo | Accuracy | F1-score confidencial | Recall confidencial |
| :--- | :---: | :---: | :---: |
| Regresión Logística | 97,27% | 0,9767 | 97,83% |
| SVM lineal | 97,18% | 0,9759 | 97,63% |
| Gaussian Naive Bayes | 83,18% | 0,8588 | 87,43% |

Los resultados muestran que Regresión Logística y SVM lineal obtienen un rendimiento muy similar, con valores de accuracy superiores al 97% y recall elevado para la clase confidencial. Gaussian Naive Bayes queda claramente por debajo, lo que resulta coherente con las características del problema: los embeddings son vectores densos de alta dimensionalidad y sus componentes no cumplen el supuesto de independencia propio de Naive Bayes.

La Regresión Logística destaca por su equilibrio entre rendimiento, eficiencia e integración práctica. Además de ofrecer métricas competitivas, proporciona probabilidades de pertenencia a la clase confidencial, lo que permite ajustar el umbral de decisión según las necesidades de seguridad del sistema.

## 4.4. Ajuste del umbral de decisión

El umbral estándar de clasificación binaria suele situarse en 0,5: si la probabilidad estimada para la clase confidencial es igual o superior a ese valor, el documento se clasifica como confidencial. Sin embargo, en este proyecto el coste de los errores no es simétrico. Reducir falsos negativos es más importante que maximizar únicamente la precisión.

Por este motivo, se analizó el comportamiento de la Regresión Logística con distintos umbrales de decisión:

| Umbral | Recall confidencial | Falsos negativos | Precisión confidencial |
| :---: | :---: | :---: | :---: |
| 0,50 | 97,83% | 99 | 97,51% |
| 0,30 | 98,66% | 61 | 95,93% |
| 0,20 | 99,01% | 45 | 94,72% |
| 0,10 | 99,45% | 25 | 92,71% |

El umbral de 0,20 ofrece un compromiso adecuado para el dominio del problema. Frente al umbral estándar, reduce los falsos negativos de 99 a 45 en el conjunto de validación de 7.802 documentos. Esta mejora incrementa la seguridad del sistema al disminuir los casos en los que un documento confidencial podría ser tratado como público.

La reducción del umbral implica un aumento de falsos positivos. No obstante, este efecto se considera aceptable porque un falso positivo restringe temporalmente un documento público, mientras que un falso negativo puede exponer información sensible. En consecuencia, la elección del umbral se justifica por el criterio de protección por defecto adoptado en toda la plataforma.

## 4.5. Evaluación final en test de los modelos probados

Una vez finalizada una tanda amplia de experimentación, se evaluaron en el conjunto de test congelado los principales modelos probados durante el desarrollo. Esta evaluación es especialmente relevante porque permite comprobar si las conclusiones observadas en validación se mantienen sobre datos no utilizados durante el ajuste de hiperparámetros. El conjunto de entrenamiento contiene 35.062 muestras, con 14.546 públicas y 20.516 confidenciales. El conjunto de test contiene 9.093 documentos, de los cuales 3.772 pertenecen a la clase pública y 5.321 a la clase confidencial.

En la interpretación de los resultados se han priorizado las siguientes métricas:

1. **Recall de la clase confidencial.** Es la métrica más importante desde el punto de vista de seguridad, porque mide qué proporción de documentos confidenciales se detectan correctamente.
2. **Falsos negativos (`Priv→Pub`).** Representan documentos confidenciales clasificados como públicos. Son el error más crítico del sistema.
3. **F1-score de la clase confidencial.** Resume el equilibrio entre precisión y recall para la clase que se desea proteger.
4. **F1 ponderado.** Permite comparar el rendimiento global teniendo en cuenta el soporte de cada clase.
5. **ROC-AUC y Average Precision.** Evalúan la calidad del ranking probabilístico del modelo, especialmente relevante cuando se ajustan umbrales.

Las matrices de confusión se presentan en formato compacto. Las columnas `Pub→Pub` y `Priv→Priv` representan aciertos, mientras que `Pub→Priv` son falsos positivos y `Priv→Pub` son falsos negativos.

| Modelo | Umbral | Acc. | ROC-AUC | Avg. Prec. | Recall priv. | F1 priv. | F1 pond. | Pub→Pub | Pub→Priv | Priv→Pub | Priv→Priv |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | ---: | ---: | ---: | ---: |
| RIPPER subset 300x50 | 0,50 | 0,6341 | 0,6648 | 0,7120 | 0,5879 | 0,6528 | 0,6364 | 2638 | 1134 | 2193 | 3128 |
| Voting LR+RF+XGB | 0,50 | 0,9603 | 0,9955 | 0,9969 | 0,9759 | 0,9664 | 0,9602 | 3539 | 233 | 128 | 5193 |
| Random Forest base | 0,50 | 0,9488 | 0,9886 | 0,9920 | 0,9624 | 0,9565 | 0,9487 | 3506 | 266 | 200 | 5121 |
| Random Forest profundidad 20 | 0,50 | 0,9497 | 0,9889 | 0,9924 | 0,9635 | 0,9573 | 0,9497 | 3509 | 263 | 194 | 5127 |
| Random Forest balanceado | 0,50 | 0,9468 | 0,9885 | 0,9921 | 0,9645 | 0,9550 | 0,9467 | 3477 | 295 | 189 | 5132 |
| XGBoost base | 0,50 | 0,9696 | 0,9960 | 0,9973 | 0,9769 | 0,9741 | 0,9696 | 3619 | 153 | 123 | 5198 |
| XGBoost robusto | 0,50 | 0,9726 | 0,9966 | 0,9976 | 0,9790 | 0,9767 | 0,9726 | 3635 | 137 | 112 | 5209 |
| XGBoost regularizado | 0,50 | 0,9690 | 0,9961 | 0,9973 | 0,9758 | 0,9736 | 0,9690 | 3619 | 153 | 129 | 5192 |
| KNN k=5 | 0,50 | 0,9382 | 0,9781 | 0,9741 | 0,9778 | 0,9488 | 0,9377 | 3328 | 444 | 118 | 5203 |
| KNN k=10 | 0,50 | 0,9283 | 0,9848 | 0,9844 | 0,9855 | 0,9415 | 0,9274 | 3197 | 575 | 77 | 5244 |
| KNN k=20 | 0,50 | 0,9243 | 0,9861 | 0,9879 | 0,9852 | 0,9384 | 0,9233 | 3163 | 609 | 79 | 5242 |
| AdaBoost base | 0,50 | 0,9200 | 0,9761 | 0,9831 | 0,9453 | 0,9326 | 0,9198 | 3336 | 436 | 291 | 5030 |
| AdaBoost learning rate 0,1 | 0,50 | 0,9001 | 0,9668 | 0,9771 | 0,9346 | 0,9163 | 0,8997 | 3212 | 560 | 348 | 4973 |
| AdaBoost árbol profundidad 2 | 0,50 | 0,9329 | 0,9826 | 0,9879 | 0,9436 | 0,9427 | 0,9329 | 3462 | 310 | 300 | 5021 |
| SVC RBF benchmark | 0,50 | 0,5876 | 0,9772 | 0,9869 | **0,9934** | 0,7382 | 0,4442 | 57 | 3715 | 35 | 5286 |
| Regresión Logística base | 0,20 | 0,9645 | **0,9970** | **0,9980** | 0,9915 | 0,9703 | 0,9643 | 3494 | 278 | 45 | 5276 |
| Regresión Logística base | 0,50 | **0,9747** | **0,9970** | **0,9980** | 0,9773 | **0,9784** | **0,9747** | 3663 | 109 | 121 | 5200 |
| Bagging de Regresión Logística | 0,20 | 0,9611 | 0,9968 | 0,9978 | 0,9919 | 0,9676 | 0,9608 | 3461 | 311 | 43 | 5278 |
| Stacking LR+RF+XGB | 0,20 | 0,9415 | 0,9895 | 0,9929 | 0,9771 | 0,9513 | 0,9411 | 3362 | 410 | 122 | 5199 |
| LogReg C=0,3 balanced scaled | 0,20 | 0,9710 | 0,9967 | 0,9977 | 0,9855 | 0,9754 | 0,9709 | 3585 | 187 | 77 | 5244 |
| LogReg C=0,3 balanced scaled | 0,30 | 0,9738 | 0,9967 | 0,9977 | 0,9820 | 0,9777 | 0,9738 | 3630 | 142 | 96 | 5225 |
| LogReg C=0,3 balanced scaled | 0,50 | 0,9736 | 0,9967 | 0,9977 | 0,9716 | 0,9773 | 0,9736 | 3683 | 89 | 151 | 5170 |
| LogReg C=1 base scaled | 0,20 | 0,9681 | 0,9964 | 0,9975 | 0,9868 | 0,9731 | 0,9680 | 3552 | 220 | 70 | 5251 |
| LogReg C=1 base scaled | 0,30 | 0,9707 | 0,9964 | 0,9975 | 0,9829 | 0,9752 | 0,9707 | 3597 | 175 | 91 | 5230 |
| LogReg C=1 base scaled | 0,50 | 0,9738 | 0,9964 | 0,9975 | 0,9758 | 0,9776 | 0,9738 | 3663 | 109 | 129 | 5192 |
| LinearSVC C=0,5 balanced calibrated | 0,20 | 0,9593 | 0,9963 | 0,9974 | 0,9906 | 0,9661 | 0,9591 | 3452 | 320 | 50 | 5271 |
| LinearSVC C=0,5 balanced calibrated | 0,30 | 0,9683 | 0,9963 | 0,9974 | 0,9867 | 0,9733 | 0,9682 | 3555 | 217 | 71 | 5250 |
| LinearSVC C=0,5 balanced calibrated | 0,50 | 0,9739 | 0,9963 | 0,9974 | 0,9763 | 0,9777 | 0,9739 | 3661 | 111 | 126 | 5195 |
| LinearSVC C=1 calibrated | 0,20 | 0,9595 | 0,9962 | 0,9974 | 0,9908 | 0,9663 | 0,9593 | 3453 | 319 | 49 | 5272 |
| LinearSVC C=1 calibrated | 0,30 | 0,9669 | 0,9962 | 0,9974 | 0,9863 | 0,9721 | 0,9668 | 3544 | 228 | 73 | 5248 |
| LinearSVC C=1 calibrated | 0,50 | 0,9735 | 0,9962 | 0,9974 | 0,9759 | 0,9773 | 0,9735 | 3659 | 113 | 128 | 5193 |
| SGD log-loss elastic-net | 0,20 | 0,9714 | 0,9964 | 0,9975 | 0,9829 | 0,9757 | 0,9714 | 3603 | 169 | 91 | 5230 |
| SGD log-loss elastic-net | 0,30 | 0,9726 | 0,9964 | 0,9975 | 0,9784 | 0,9766 | 0,9726 | 3638 | 134 | 115 | 5206 |
| SGD log-loss elastic-net | 0,50 | 0,9722 | 0,9964 | 0,9975 | 0,9690 | 0,9761 | 0,9722 | 3684 | 88 | 165 | 5156 |

### 4.5.1. Interpretación global

El mejor resultado global por F1 ponderado corresponde a la Regresión Logística base con umbral 0,50. Este modelo alcanza un accuracy de 97,47%, un ROC-AUC de 0,9970, un Average Precision de 0,9980 y un F1 ponderado de 0,9747. La matriz de confusión muestra 109 falsos positivos y 121 falsos negativos. Aunque no es la configuración que minimiza más los falsos negativos, sí es la que ofrece el mejor equilibrio global entre documentos públicos y confidenciales.

Este resultado es relevante porque confirma que los embeddings utilizados generan un espacio vectorial altamente separable. Un modelo lineal simple es capaz de obtener resultados iguales o superiores a modelos más complejos. Esto sugiere que gran parte de la complejidad semántica ya está capturada en la representación BERT, y que el clasificador posterior no necesita una frontera excesivamente compleja para separar las clases.

### 4.5.2. Efecto del umbral en Regresión Logística

La Regresión Logística base se evaluó con umbral 0,50 y 0,20. Con umbral 0,50 obtiene el mejor F1 ponderado, pero deja 121 falsos negativos. Con umbral 0,20, los falsos negativos bajan a 45 y el recall de confidencial sube hasta 0,9915. La contrapartida es que los falsos positivos aumentan de 109 a 278, y el accuracy baja de 0,9747 a 0,9645.

Este comportamiento es coherente con la interpretación probabilística del modelo. Al reducir el umbral, se exige menos probabilidad para clasificar un documento como confidencial. Por tanto, se capturan más documentos sensibles dudosos, pero también se arrastran más documentos públicos hacia la clase confidencial. En un sistema de seguridad documental, esta pérdida puede ser aceptable si el objetivo principal es minimizar documentos confidenciales expuestos.

La comparación ilustra la tensión central del proyecto: el mejor modelo estadístico no tiene por qué ser el más conservador desde el punto de vista de seguridad. Si el sistema se usa en un entorno donde la revisión manual de falsos positivos es asumible, el umbral 0,20 resulta más prudente. Si se busca equilibrio operativo y menor fricción para documentos públicos, el umbral 0,50 es más adecuado.

### 4.5.3. Ajuste de hiperparámetros en Regresión Logística

Se probaron variantes de Regresión Logística con escalado, regularización (`C`) y `class_weight='balanced'`. El parámetro `C` controla la intensidad de la regularización: valores bajos implican mayor regularización y valores altos permiten coeficientes más libres. En los resultados, las variantes con escalado y balanceo obtienen métricas muy competitivas, pero no superan claramente a la Regresión Logística base.

La variante `C=0,3`, balanceada y escalada muestra un comportamiento estable en todos los umbrales. Con umbral 0,30 consigue un accuracy de 0,9738 y un F1 ponderado de 0,9738, con 96 falsos negativos. Con umbral 0,20 reduce los falsos negativos a 77, pero aumenta los falsos positivos a 187. Con umbral 0,50 mejora la clasificación de documentos públicos, con solo 89 falsos positivos, pero sube los falsos negativos a 151.

Las variantes con `C=1` muestran una tendencia similar. A medida que se incrementa el umbral, mejora el recall de la clase pública y disminuyen los falsos positivos, pero aumentan los falsos negativos. Esta evolución refuerza que el umbral tiene más impacto operativo que pequeños cambios en `C`. En este caso, el ajuste de regularización no transforma de forma radical el rendimiento, probablemente porque los embeddings ya ofrecen una separación lineal fuerte y el problema no requiere una frontera muy ajustada.

El uso de `class_weight='balanced'` tiende a modificar la frontera para compensar la distribución de clases. En algunos casos mejora ligeramente el recall de confidenciales con umbral bajo, pero no produce una mejora global suficiente para justificar sustituir al modelo base. Esto puede deberse a que el conjunto de entrenamiento, aunque no perfectamente equilibrado, ya contiene suficientes ejemplos de ambas clases y la representación de embeddings separa bien el problema.

Para estudiar con más detalle el efecto de la regularización, se ejecutó un grid adicional de Regresión Logística manteniendo fijo el umbral en 0,20. Los resultados principales fueron los siguientes:

| Modelo | Acc. | ROC-AUC | Recall priv. | F1 priv. | F1 pond. | Pub→Pub | Pub→Priv | Priv→Pub | Priv→Priv |
| :--- | :---: | :---: | :---: | :---: | :---: | ---: | ---: | ---: | ---: |
| LR C=0,1 base scaled | 0,9673 | 0,9969 | 0,9887 | 0,9725 | 0,9672 | 3535 | 237 | 60 | 5261 |
| LR C=0,1 balanced scaled | 0,9710 | 0,9969 | 0,9870 | 0,9755 | 0,9709 | 3577 | 195 | 69 | 5252 |
| LR C=0,3 base scaled | 0,9681 | 0,9967 | 0,9878 | 0,9732 | 0,9680 | 3547 | 225 | 65 | 5256 |
| LR C=0,3 balanced scaled | 0,9710 | 0,9967 | 0,9855 | 0,9754 | 0,9709 | 3585 | 187 | 77 | 5244 |
| LR C=1,0 base scaled | 0,9681 | 0,9964 | 0,9868 | 0,9731 | 0,9680 | 3552 | 220 | 70 | 5251 |
| LR C=1,0 balanced scaled | 0,9702 | 0,9964 | 0,9842 | 0,9748 | 0,9701 | 3585 | 187 | 84 | 5237 |
| LR C=3,0 base scaled | 0,9684 | 0,9963 | 0,9863 | 0,9734 | 0,9683 | 3558 | 214 | 73 | 5248 |
| LR C=3,0 balanced scaled | 0,9702 | 0,9963 | 0,9836 | 0,9748 | 0,9701 | 3588 | 184 | 87 | 5234 |
| LR C=10,0 base scaled | 0,9689 | 0,9963 | 0,9865 | 0,9738 | 0,9688 | 3561 | 211 | 72 | 5249 |
| LR C=10,0 balanced scaled | 0,9700 | 0,9962 | 0,9831 | 0,9746 | 0,9699 | 3589 | 183 | 90 | 5231 |

La tabla muestra que modificar `C` no cambia drásticamente el comportamiento del modelo. Las diferencias de F1 ponderado se mueven en un rango reducido, aproximadamente entre 0,9672 y 0,9709. Los valores más bajos de `C`, que implican mayor regularización, tienden a mantener un recall confidencial ligeramente mayor en las variantes base. En cambio, las configuraciones balanceadas mejoran el rendimiento global y reducen falsos positivos, pero a veces aumentan ligeramente los falsos negativos. Esto indica que el ajuste fino de `C` es secundario respecto a la elección del umbral de decisión.

### 4.5.4. LinearSVC calibrado y SGD

LinearSVC calibrado obtiene resultados muy cercanos a Regresión Logística. Con `C=0,5`, balanceado y umbral 0,50 alcanza un F1 ponderado de 0,9739, con 126 falsos negativos y 111 falsos positivos. Con umbral 0,20 reduce los falsos negativos a 50, pero aumenta los falsos positivos a 320. El patrón es prácticamente el mismo que en Regresión Logística: bajar el umbral mejora la sensibilidad hacia confidenciales, pero penaliza la clase pública.

La calibración es necesaria porque LinearSVC no produce probabilidades de forma nativa. Al calibrar sus salidas se puede aplicar un umbral probabilístico comparable al de Regresión Logística. Sin embargo, esa calibración añade complejidad al entrenamiento y al despliegue. Dado que el rendimiento final no supera claramente a Regresión Logística, no parece aportar una ventaja práctica suficiente.

SGDClassifier con pérdida logística y regularización elastic-net también muestra un comportamiento competitivo. Con umbral 0,30 obtiene un F1 ponderado de 0,9726 y 115 falsos negativos. Con umbral 0,20 baja a 91 falsos negativos, pero aumenta los falsos positivos a 169. Este modelo puede ser interesante en escenarios con datasets mucho mayores, porque el entrenamiento incremental de SGD escala bien, pero en este TFG no mejora al modelo base.

### 4.5.5. Modelos basados en árboles y boosting

XGBoost es el modelo no lineal con mejor comportamiento. La configuración robusta, con 500 estimadores, `learning_rate=0,05` y profundidad 6, alcanza un accuracy de 0,9726, un ROC-AUC de 0,9966 y un F1 ponderado de 0,9726. Su matriz de confusión muestra 137 falsos positivos y 112 falsos negativos. Es un resultado muy sólido y cercano al mejor modelo lineal.

La mejora de XGBoost robusto frente a XGBoost base puede explicarse por el aumento del número de estimadores combinado con una tasa de aprendizaje menor. Este patrón suele producir modelos más estables: cada árbol corrige una parte más pequeña del error y el ensamblado final generaliza mejor. La configuración regularizada, con `subsample` y `colsample_bytree`, no mejora al modelo robusto. Es posible que la regularización adicional reduzca ligeramente la capacidad de ajuste en un espacio de embeddings donde ya existe una señal discriminativa fuerte.

Random Forest obtiene resultados razonables, pero claramente inferiores. La configuración con profundidad máxima 20 mejora levemente al modelo base: pasa de 200 a 194 falsos negativos y sube el F1 ponderado de 0,9487 a 0,9497. La mejora es pequeña, lo que sugiere que los árboles individuales tienen dificultades para explotar de forma eficiente un espacio denso de 768 dimensiones. El ajuste `class_weight='balanced'` reduce los falsos negativos a 189, pero aumenta falsos positivos hasta 295 y baja el F1 ponderado.

AdaBoost queda por debajo de Random Forest y XGBoost. La configuración base alcanza un F1 ponderado de 0,9198, mientras que reducir el learning rate a 0,1 empeora el rendimiento hasta 0,8997. Esto puede deberse a que, con el número de estimadores usado, una tasa de aprendizaje menor no permite corregir suficientemente los errores. Al usar árboles de profundidad 2 como estimadores base, el rendimiento mejora hasta 0,9329, lo que indica que los decision stumps son demasiado simples para capturar relaciones útiles en embeddings densos. Aun así, sigue lejos de los modelos lineales y de XGBoost.

### 4.5.6. KNN y modelos basados en vecindad

KNN presenta un comportamiento interesante: mantiene recalls altos para la clase confidencial, pero clasifica peor los documentos públicos. Con `k=5` obtiene 118 falsos negativos y 444 falsos positivos. Con `k=10`, los falsos negativos bajan a 77, pero los falsos positivos suben a 575. Con `k=20`, se mantiene un número similar de falsos negativos, 79, pero los falsos positivos aumentan hasta 609.

Este comportamiento puede explicarse por la distribución de clases y la geometría del espacio de embeddings. Al aumentar `k`, la decisión depende de un vecindario mayor. Si la clase confidencial es más frecuente o forma regiones amplias en el espacio vectorial, el modelo tiende a clasificar más ejemplos como confidenciales. Esto reduce falsos negativos, pero aumenta falsos positivos. Además, KNN tiene un coste de inferencia mayor que los modelos lineales, porque requiere comparar cada documento nuevo con muestras almacenadas, lo que dificulta su despliegue eficiente.

### 4.5.7. Ensembles: Voting, Bagging y Stacking

Los modelos de ensamblado no aportan una mejora suficiente. El Voting Ensemble combina Regresión Logística, Random Forest y XGBoost, pero obtiene un F1 ponderado de 0,9602, inferior al de Regresión Logística base y al de XGBoost robusto. Su matriz muestra 128 falsos negativos y 233 falsos positivos. Aunque el resultado es correcto, no mejora a los modelos individuales más fuertes.

Bagging aplicado a Regresión Logística con umbral 0,20 reduce los falsos negativos a 43, el menor valor entre los modelos razonablemente utilizables, pero incrementa los falsos positivos a 311 y baja el F1 ponderado a 0,9608. Desde una perspectiva estrictamente orientada a seguridad, puede ser interesante, pero en equilibrio global queda por debajo de la Regresión Logística base con umbral ajustado.

Stacking obtiene un F1 ponderado de 0,9411, con 122 falsos negativos y 410 falsos positivos. En este experimento se entrenó con un subconjunto reducido de 1.000 muestras y validación cruzada limitada, por lo que su rendimiento puede estar condicionado por el tamaño de entrenamiento. Aun así, no justifica su complejidad frente a modelos más simples y estables.

La conclusión sobre ensembles es clara: combinar modelos aumenta la complejidad de entrenamiento, serialización, inferencia y mantenimiento, pero no mejora el resultado final. Esto refuerza la conveniencia de elegir un clasificador simple sobre embeddings ya informativos.

### 4.5.8. SVC RBF y RIPPER

SVC con kernel RBF obtiene el mayor recall de confidencial, 0,9934, con solo 35 falsos negativos. Sin embargo, este resultado es engañoso. El modelo clasifica casi todos los documentos como confidenciales: de 3.772 documentos públicos, solo 57 se clasifican correctamente como públicos y 3.715 se marcan erróneamente como confidenciales. Su F1 ponderado cae hasta 0,4442. Por tanto, aunque maximiza la sensibilidad hacia documentos privados, destruye la utilidad del clasificador para distinguir entre clases.

Este comportamiento puede estar relacionado con una combinación inadecuada de hiperparámetros, escalado y complejidad del kernel. En espacios de alta dimensionalidad, un kernel RBF mal ajustado puede generar fronteras de decisión poco calibradas o excesivamente sesgadas hacia una clase. Además, en el experimento aparece como benchmark con configuración limitada, por lo que no se considera una opción final.

RIPPER obtiene el peor resultado global, con accuracy de 0,6341 y F1 ponderado de 0,6364. Su matriz muestra 2.193 falsos negativos y 1.134 falsos positivos. Este rendimiento era esperable, ya que RIPPER intenta construir reglas discretas interpretables, mientras que los embeddings son vectores densos donde cada dimensión no tiene una interpretación semántica aislada sencilla. Aunque los modelos basados en reglas son atractivos por interpretabilidad, no encajan bien con la representación vectorial utilizada.

Esta limitación también aparece, aunque de forma menos extrema, en los modelos basados en árboles. Un árbol o un conjunto de reglas puede imprimirse y seguirse paso a paso, pero las condiciones resultantes operan sobre dimensiones latentes del embedding. Por ejemplo, una regla extraída de un modelo de este tipo tiene una forma similar a la siguiente:

```text
|--- emb_314 <= -0.0821
|   |--- emb_27 <= 0.4105
|   |   |--- class: 1
|   |--- emb_27 > 0.4105
|   |   |--- class: 0
```

La estructura de decisión es legible, pero no ofrece una explicación semántica directa. No puede interpretarse de la misma forma que una regla manual del tipo `contiene_DNI = True` y `contiene_nombre = True -> confidencial`. Por tanto, los embeddings permiten capturar información contextual compleja, pero reducen la interpretabilidad humana de modelos que tradicionalmente se consideran explicables.

### 4.5.9. Conclusión de la evaluación en test

La evaluación en test refuerza la elección de la Regresión Logística como modelo principal. Si se busca el mejor equilibrio general, la Regresión Logística base con umbral 0,50 es la opción más sólida: obtiene el mejor F1 ponderado, el mejor accuracy y mantiene un rendimiento muy alto en la clase confidencial. Si se prioriza la reducción de falsos negativos, la Regresión Logística con umbral 0,20 es una alternativa más conservadora, reduciendo los falsos negativos de 121 a 45 a cambio de aumentar los falsos positivos de 109 a 278.

Desde el punto de vista del TFG, la decisión más razonable no es elegir únicamente el modelo con mayor métrica agregada, sino justificar el umbral según el objetivo operativo. En una plataforma de gestión documental orientada a proteger información sensible, resulta defendible sacrificar parte de la precisión sobre documentos públicos para reducir la exposición de documentos confidenciales. Por ello, el modelo base con umbral 0,50 representa el mejor clasificador global, mientras que el umbral 0,20 representa la configuración más alineada con una política de seguridad conservadora.

## 4.6. Validación del servicio de IA

El servicio de IA se validó en dos dimensiones: extracción de texto y clasificación. En la parte de extracción, se comprobó que el servicio acepta los formatos soportados y rechaza los formatos no permitidos. También se verificó que los documentos sin texto procesable generan advertencias y se tratan de forma conservadora.

Durante el desarrollo se sustituyó una extracción basada en librerías independientes por una conversión estructurada a Markdown [11]. Este cambio mejoró la mantenibilidad del código y permitió conservar parte de la estructura del documento. La validación funcional confirmó que el servicio podía procesar documentos multiformato mediante una interfaz unificada.

En la parte de clasificación, se detectó durante las pruebas un problema de desalineación entre el entorno de entrenamiento y el entorno de inferencia. El entrenamiento original utilizaba una configuración concreta del modelo de embeddings y una longitud máxima de secuencia determinada, mientras que el servicio desplegado estaba usando una configuración distinta. Esta discrepancia provocaba predicciones incoherentes, ya que el clasificador recibía vectores que no correspondían al espacio aprendido durante el entrenamiento.

El problema se resolvió alineando la configuración del servicio con la utilizada durante el entrenamiento, incluyendo el modelo de extracción, la estrategia de pooling y la longitud máxima de tokens. Esta experiencia confirma la importancia de reproducir exactamente el pipeline de entrenamiento en producción, especialmente cuando se combinan embeddings preentrenados con clasificadores supervisados.

## 4.7. Validación funcional de la plataforma

La validación funcional de la plataforma se centra en comprobar que el flujo completo funciona de forma coherente desde la subida del documento hasta su consulta posterior. El proceso esperado es el siguiente: un usuario autenticado sube un archivo, el sistema valida el formato y tamaño, el servicio de IA extrae el texto y clasifica el documento, la aplicación guarda el archivo en Storage, registra los metadatos en PostgreSQL y aplica las reglas de acceso correspondientes.

El sistema incorpora un comportamiento conservador ante fallos. Si el servicio de IA no está configurado, no responde, devuelve error o no logra extraer texto, el documento se registra como confidencial. Esta decisión se ha validado como parte del flujo de subida y reduce el riesgo de que un fallo técnico derive automáticamente en una exposición pública.

También se validó la integración con el almacenamiento. Si la subida al bucket se completa pero falla la inserción en base de datos, el sistema elimina el objeto almacenado para evitar archivos huérfanos. Esta medida mejora la consistencia entre Storage y PostgreSQL.

En cuanto a la interfaz web, se ha implementado una experiencia de subida con estados visibles por archivo. El usuario puede observar fases como extracción, clasificación y guardado, lo que permite validar visualmente el avance del pipeline. También se validaron las acciones principales de gestión documental: renombrado, descarga, eliminación, cambio de visibilidad, movimiento entre carpetas y desplazamiento mediante arrastrar y soltar.

La gestión de carpetas se probó tanto en el espacio personal como en organizaciones. Las carpetas aparecen siempre por encima de los documentos sueltos, ambos grupos se ordenan alfabéticamente y el nombre de cada elemento funciona como acceso directo a su contenido o detalle. Además, el menú contextual permite renombrar y mover documentos o carpetas, filtrando destinos inválidos como la carpeta actual, el propio elemento o descendientes que provocarían ciclos.

En organizaciones se validó que los miembros puedan reorganizar documentos y carpetas mediante menú o arrastre, mientras que las acciones destructivas quedan restringidas a administradores. Esta decisión mantiene la colaboración flexible sin permitir que cualquier miembro elimine información compartida. En dispositivos móviles, el arrastre se activa mediante pulsación mantenida, evitando conflictos con el gesto normal de navegación táctil.

Como apoyo a la validación manual, la aplicación web se comprobó también mediante la verificación de tipos de TypeScript con `npx tsc --noEmit`, reduciendo errores de integración entre componentes, acciones de servidor, modelos de datos y llamadas a Supabase.

## 4.8. Limitaciones identificadas

El proyecto presenta varias limitaciones que deben tenerse en cuenta al interpretar los resultados.

En primer lugar, el modelo depende de la representatividad del corpus de entrenamiento. Aunque se han incorporado fuentes públicas, sintéticas y datos orientados a información personalmente identificable, los documentos reales de una organización pueden presentar formatos, vocabularios y estructuras diferentes.

En segundo lugar, la clasificación automática no es infalible. Incluso con un recall elevado, pueden existir falsos negativos. Por ello, el sistema debe entenderse como una capa adicional de protección, no como sustituto absoluto de la supervisión humana en contextos críticos.

En tercer lugar, la extracción de texto puede fallar en documentos escaneados, protegidos, corruptos o con contenido principalmente visual. El criterio adoptado en estos casos es clasificar el documento como confidencial, pero esto no resuelve la falta de comprensión real del contenido.

En cuarto lugar, el uso de embeddings densos introduce una limitación de interpretabilidad. Esta representación resulta adecuada para una tarea semántica como distinguir documentos públicos y confidenciales, ya que permite capturar contexto, vocabulario variado y expresiones indirectas que serían difíciles de cubrir mediante reglas manuales. Sin embargo, cada dimensión del vector no se corresponde con una característica humana concreta. Como consecuencia, incluso algoritmos tradicionalmente interpretables, como árboles de decisión o sistemas de reglas, pierden parte de su valor explicativo al trabajar sobre variables del tipo `emb_314` o `emb_27`.

Esta limitación no invalida el enfoque adoptado. Para el problema tratado no existe una representación manual sencilla que capture toda la información relevante de los documentos. No obstante, debe tenerse en cuenta si el sistema se utiliza en contextos donde sea necesario justificar cada predicción ante un usuario, auditor o responsable de seguridad.

En quinto lugar, algunas decisiones de implementación responden al contexto de prototipo académico. Por ejemplo, ciertos límites de tamaño, número de documentos o uso de recursos gratuitos son adecuados para la demostración del TFG, pero deberían revisarse en un despliegue productivo.

## 4.9. Conclusiones

Los resultados obtenidos hasta el momento indican que es viable construir una plataforma de gestión documental capaz de integrar clasificación automática de privacidad y control de acceso. Los modelos basados en embeddings de la familia BERT ofrecen una representación suficientemente rica para que clasificadores supervisados alcancen métricas elevadas en la detección de documentos confidenciales [4], [6], [9].

La Regresión Logística se presenta como una opción especialmente adecuada por su equilibrio entre rendimiento, simplicidad e integración. El ajuste del umbral de decisión al 20% permite aumentar la sensibilidad hacia la clase confidencial y reducir falsos negativos, alineándose con el objetivo principal del proyecto: evitar la exposición accidental de información sensible.

Desde el punto de vista de ingeniería, la separación entre aplicación web, infraestructura de datos y servicio de IA ha resultado útil para mantener la flexibilidad del sistema. La aplicación puede evolucionar en su interfaz y lógica documental mientras el servicio de IA continúa incorporando nuevos modelos o ajustes. A su vez, Supabase y PostgreSQL permiten conectar la clasificación obtenida con políticas de acceso efectivas.

Como conclusión general, el trabajo demuestra que una arquitectura ligera y basada en tecnologías accesibles puede integrar técnicas de procesamiento de lenguaje natural en un flujo real de gestión documental. La solución no elimina todos los riesgos asociados a la privacidad, pero proporciona una capa automatizada de protección que mejora el comportamiento de un gestor documental tradicional.

## 4.10. Trabajo futuro

Como líneas de trabajo futuro se identifican las siguientes:

1. Repetir la evaluación final si se incorporan nuevos modelos o nuevas versiones del corpus, manteniendo siempre un conjunto de test congelado para evitar sesgos de selección.
2. Ampliar el corpus con documentos más representativos de contextos reales de uso.
3. Incorporar OCR para tratar documentos escaneados o imágenes con texto.
4. Añadir mecanismos de revisión humana para clasificaciones dudosas o documentos de alto impacto.
5. Mejorar la auditoría de accesos y registrar eventos relevantes de seguridad.
6. Reforzar el despliegue productivo aplicando completamente las políticas RLS y reduciendo dependencias de comprobaciones manuales en rutas de servidor.
7. Evaluar el sistema con usuarios reales para medir usabilidad, confianza y tasa de correcciones manuales.

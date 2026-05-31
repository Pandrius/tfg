# Universidad Politécnica de Madrid

## Escuela Técnica Superior de Ingenieros Informáticos

## Grado en Ingeniería Informática

# Trabajo Fin de Grado

# Plataforma Inteligente de Gestión Documental para la Clasificación de Privacidad de Documentos y la Garantía de Acceso Seguro mediante Machine Learning

**Autor:** Andrés Pecker Matesanz  
**Tutora:** Adriana Toni Delgado  
**Madrid, 2026**

Este Trabajo Fin de Grado se ha depositado en la ETSI Informáticos de la Universidad Politécnica de Madrid para su defensa.

---

# Tabla de contenidos

- Resumen
- Abstract
- 1. Introducción
- 2. Estado del arte y trabajos previos
- 3. Desarrollo
- 4. Resultados y conclusiones
- 5. Análisis de impacto
- 6. Bibliografía
- 7. Anexos

---

---

# Resumen

El presente Trabajo Fin de Grado aborda el diseño, desarrollo y validación de una plataforma inteligente de gestión documental orientada a la clasificación automática del nivel de privacidad de documentos y a la aplicación de mecanismos de acceso seguro. El problema tratado se enmarca en un contexto de digitalización masiva, en el que las organizaciones almacenan y comparten volúmenes crecientes de información en múltiples formatos. Esta situación incrementa el riesgo de exposición accidental de documentación sensible, especialmente cuando la clasificación de privacidad depende exclusivamente del criterio manual del usuario o de un administrador. Además, el marco normativo europeo, en particular el Reglamento General de Protección de Datos, exige tratar con especial cuidado la información personal, financiera, sanitaria o identificativa.

El objetivo principal del trabajo es construir una solución capaz de analizar el contenido textual de un documento, determinar si debe considerarse público o confidencial, y utilizar dicha clasificación como criterio para restringir su acceso dentro del sistema. Para ello, se propone un enfoque de seguridad por diseño: los documentos no se tratan únicamente como archivos almacenados, sino como entidades cuyo nivel de exposición depende de su contenido. De este modo, la seguridad no queda limitada a reglas estáticas sobre carpetas o roles, sino que se vincula a la naturaleza semántica del documento y a políticas de acceso aplicadas en la capa de datos.

La solución desarrollada combina una aplicación web con un subsistema de Inteligencia Artificial desplegado como servicio independiente. La aplicación permite gestionar documentos, carpetas, usuarios, organizaciones, permisos y relaciones de acceso, mientras que la infraestructura de almacenamiento y autenticación se apoya en Supabase, PostgreSQL y políticas de Row Level Security. La lógica de inferencia se encapsula en un microservicio desarrollado con FastAPI y desplegado en Hugging Face Spaces. Esta separación permite mantener el componente de aprendizaje automático en un entorno nativo de Python, facilitando la experimentación, el mantenimiento y la evolución del modelo sin acoplar el desarrollo del sistema web a las dependencias propias del procesamiento de lenguaje natural.

Desde el punto de vista del procesamiento de datos, el trabajo incluye la construcción y depuración de un corpus documental en español a partir de fuentes públicas y sintéticas. Para la clase confidencial se emplean datos orientados a la detección de información personalmente identificable, mientras que para la clase pública se incorporan textos procedentes de redes sociales, mensajes abiertos y ejemplos sintéticos de comunicación no sensible. Sobre este corpus se aplican procesos de limpieza, normalización y auditoría mediante expresiones regulares, con el fin de detectar patrones como correos electrónicos, teléfonos, documentos identificativos o datos bancarios que puedan implicar una reclasificación hacia la clase confidencial. También se estudian estrategias de balanceo por cantidad y por distribución de longitud para reducir sesgos derivados del origen y la extensión de los textos.

El sistema incorpora una fase de extracción textual multiformato mediante conversión estructurada a Markdown. Esta decisión permite unificar el tratamiento de distintos tipos de archivo, como PDF, DOCX, TXT, hojas de cálculo, presentaciones, HTML, JSON, XML o archivos comprimidos, y conservar parte de la estructura semántica original antes de alimentar el pipeline de clasificación. A partir del texto extraído, se generan representaciones vectoriales densas mediante un modelo de la familia BERT y estas representaciones son procesadas por clasificadores supervisados. Durante la fase experimental se evaluaron distintas alternativas, entre ellas Regresión Logística, SVM y Naive Bayes, utilizando embeddings de alta dimensionalidad para representar el contenido de los documentos.

Los resultados obtenidos muestran que la Regresión Logística ofrece un equilibrio adecuado entre rendimiento, eficiencia e interpretabilidad para el dominio planteado. En las pruebas realizadas, este modelo alcanzó una exactitud cercana al 97% y un rendimiento especialmente sólido en la detección de documentos confidenciales. Dado que el coste de clasificar erróneamente un documento sensible como público es superior al de marcar como confidencial un documento que no lo es, se ajustó el umbral de decisión del clasificador para priorizar el recall de la clase confidencial. Con un umbral del 20%, el sistema consiguió una tasa de detección de documentos confidenciales superior al 99%, reduciendo de forma significativa los falsos negativos y manteniendo un nivel de precisión aceptable para el caso de uso.

Además del componente algorítmico, el trabajo incluye decisiones de ingeniería relativas al despliegue, la integración entre servicios y la robustez del sistema. Se analizaron distintas estrategias de arquitectura, como la ejecución de la inferencia en funciones serverless, el uso de APIs externas de inferencia y la separación en un microservicio propio. La opción seleccionada, basada en FastAPI y Hugging Face Spaces, permite superar las limitaciones de tamaño y dependencias del entorno web, conservar la flexibilidad experimental y facilitar futuras ampliaciones, como la incorporación de nuevos modelos o técnicas de ensamblado. Asimismo, el flujo de subida aplica un comportamiento conservador: ante errores de extracción, indisponibilidad del servicio de IA o ausencia de texto, el documento se clasifica como confidencial por defecto.

En conjunto, el trabajo demuestra la viabilidad de integrar técnicas de procesamiento de lenguaje natural y aprendizaje supervisado en una plataforma de gestión documental con criterios de seguridad activa. La solución propuesta no pretende sustituir completamente la supervisión humana en contextos críticos, pero sí proporcionar una capa automatizada de apoyo a la clasificación y protección de documentos, reduciendo el riesgo de exposición de información confidencial y mejorando la eficiencia en la gestión de accesos.

# Abstract

This Final Degree Project addresses the design, development and validation of an intelligent document management platform aimed at automatically classifying the privacy level of documents and enforcing secure access mechanisms. The problem is framed in a context of massive digitalization, where organizations store and share increasing volumes of information in multiple formats. This situation raises the risk of accidental exposure of sensitive documentation, especially when privacy classification depends exclusively on manual decisions made by users or administrators. In addition, the European regulatory framework, particularly the General Data Protection Regulation, requires special care when processing personal, financial, health-related or identifying information.

The main objective of this project is to build a solution capable of analysing the textual content of a document, determining whether it should be considered public or confidential, and using this classification as a criterion for restricting access within the system. To achieve this, the project follows a security-by-design approach: documents are not treated merely as stored files, but as entities whose exposure level depends on their content. Therefore, security is not limited to static rules over folders or user roles, but is linked to the semantic nature of the document and to access policies enforced at the data layer.

The developed solution combines a web application with an Artificial Intelligence subsystem deployed as an independent service. The application supports document, folder, user, organization, permission and access relationship management, while storage and authentication infrastructure rely on Supabase, PostgreSQL and Row Level Security policies. The inference logic is encapsulated in a FastAPI microservice deployed on Hugging Face Spaces. This separation keeps the machine learning component in a native Python environment, making experimentation, maintenance and model evolution easier without coupling the web system to the dependencies required by natural language processing workflows.

From the data processing perspective, the project includes the construction and refinement of a Spanish document corpus using public and synthetic sources. For the confidential class, data focused on personally identifiable information detection are used, while the public class incorporates texts from social media, open messages and synthetic examples of non-sensitive communication. Cleaning, normalization and regular-expression-based auditing processes are applied to this corpus in order to detect patterns such as email addresses, phone numbers, identity documents or banking data that may require reclassification into the confidential class. Quantity-based and length-distribution balancing strategies are also studied to reduce biases derived from the source and length of the texts.

The system includes a multi-format text extraction stage based on structured conversion to Markdown. This design decision unifies the treatment of different file types, such as PDF, DOCX, TXT, spreadsheets, presentations, HTML, JSON, XML and compressed files, and preserves part of the original semantic structure before feeding the classification pipeline. Once the text has been extracted, dense vector representations are generated using a BERT-family model and are then processed by supervised classifiers. During the experimental phase, several alternatives were evaluated, including Logistic Regression, SVM and Naive Bayes, using high-dimensional embeddings to represent document content.

The results show that Logistic Regression provides a suitable balance between performance, efficiency and interpretability for the proposed domain. In the conducted experiments, this model achieved an accuracy close to 97% and showed particularly strong performance in detecting confidential documents. Since the cost of incorrectly classifying a sensitive document as public is higher than the cost of marking a non-sensitive document as confidential, the classifier decision threshold was adjusted to prioritize recall for the confidential class. With a threshold of 20%, the system achieved a confidential document detection rate above 99%, significantly reducing false negatives while maintaining an acceptable precision level for the intended use case.

In addition to the algorithmic component, the project includes engineering decisions related to deployment, service integration and system robustness. Several architectural strategies were analysed, such as running inference through serverless functions, relying on external inference APIs and separating the AI logic into a dedicated microservice. The selected option, based on FastAPI and Hugging Face Spaces, overcomes size and dependency limitations of the web environment, preserves experimental flexibility and enables future extensions, such as the integration of new models or ensemble techniques. Furthermore, the upload flow follows a conservative behaviour: when text extraction fails, the AI service is unavailable or no text is obtained, the document is classified as confidential by default.

Overall, this project demonstrates the feasibility of integrating natural language processing and supervised learning techniques into a document management platform with active security criteria. The proposed solution is not intended to fully replace human supervision in critical contexts, but rather to provide an automated support layer for document classification and protection, reducing the risk of confidential information exposure and improving the efficiency of access management.

---

# 1. Introducción

## 1.1. Contexto y motivación

La digitalización de documentos se ha consolidado como una práctica habitual en organizaciones públicas y privadas. Contratos, informes, justificantes, hojas de cálculo, comunicaciones internas, documentación administrativa y archivos generados por usuarios se almacenan y comparten de forma continua a través de plataformas digitales. Esta evolución ha mejorado la disponibilidad de la información y la eficiencia de los procesos internos, pero también ha incrementado el riesgo de exposición accidental de datos sensibles [16].

En muchos sistemas de gestión documental, la protección de los archivos depende de decisiones manuales: el usuario decide si un documento debe compartirse, el administrador configura permisos sobre carpetas, o la aplicación aplica reglas estáticas en función del rol del usuario. Este enfoque resulta insuficiente cuando el contenido real del documento no coincide con la ubicación en la que se almacena o con la etiqueta asignada por la persona que lo sube. Un documento con datos personales, financieros, sanitarios o identificativos puede quedar expuesto si se clasifica incorrectamente como público.

La motivación de este Trabajo Fin de Grado surge de esa limitación. El objetivo no es únicamente almacenar documentos, sino dotar al gestor documental de una capa de inteligencia capaz de analizar el contenido textual y participar en la toma de decisiones de seguridad. Esta idea cobra especial relevancia en un contexto regulatorio exigente, en el que normativas como el Reglamento General de Protección de Datos obligan a aplicar medidas adecuadas para proteger la información personal y reducir el riesgo de accesos no autorizados [3].

Por tanto, el trabajo se sitúa en la intersección entre la gestión documental, la seguridad de la información y el procesamiento de lenguaje natural. La hipótesis de partida es que un sistema de clasificación automática puede servir como mecanismo de apoyo para decidir si un documento debe tratarse como público o confidencial, y que dicha decisión puede integrarse directamente con políticas de acceso en la infraestructura de datos.

## 1.2. Descripción del problema

El problema principal que aborda este proyecto es la falta de integración entre el análisis del contenido de un documento y la aplicación efectiva de políticas de seguridad. En un gestor documental convencional, la protección suele depender de metadatos introducidos manualmente, carpetas previamente configuradas o permisos definidos por usuarios. Estos mecanismos son útiles, pero no garantizan que el contenido real del archivo sea coherente con el nivel de exposición asignado.

Esta situación genera varios riesgos. En primer lugar, existe un riesgo de error humano en la clasificación de documentos, especialmente cuando el usuario debe decidir rápidamente si un archivo puede compartirse o no. En segundo lugar, el volumen de documentos puede hacer inviable una revisión manual exhaustiva. En tercer lugar, la seguridad puede aplicarse demasiado tarde: el documento puede quedar disponible antes de que una persona detecte que contiene información sensible.

También existe una dificultad técnica asociada al propio contenido de los documentos. La información sensible no siempre aparece de forma estructurada ni mediante patrones triviales. Puede encontrarse dentro de texto libre, tablas, formularios, correos exportados o documentos con formatos heterogéneos. Además, los documentos públicos y confidenciales pueden compartir vocabulario, lo que hace insuficiente una solución basada únicamente en palabras clave.

Por ello, el reto consiste en diseñar un sistema que sea capaz de extraer texto de documentos multiformato, representar su contenido de forma adecuada para un modelo de aprendizaje automático, clasificarlo como público o confidencial, y trasladar esa clasificación a la capa de autorización del sistema. La solución debe, además, comportarse de forma conservadora: ante fallos de extracción, indisponibilidad del servicio de clasificación o incertidumbre operativa, el documento debe protegerse por defecto.

## 1.3. Objetivos del trabajo

El objetivo general de este Trabajo Fin de Grado es desarrollar una plataforma inteligente de gestión documental que automatice la clasificación de privacidad de documentos y aplique mecanismos de acceso seguro en función del resultado obtenido. Para ello, el sistema debe permitir la subida de documentos, extraer su contenido textual, clasificarlo mediante técnicas de aprendizaje automático y utilizar la clasificación para controlar quién puede acceder al archivo.

Este objetivo general se concreta en los siguientes objetivos específicos:

**O1. Implementar una infraestructura backend segura.** Configurar un entorno basado en Supabase y PostgreSQL que proporcione autenticación de usuarios, almacenamiento de archivos, persistencia de metadatos y políticas de Row Level Security para controlar el acceso a documentos y recursos asociados [1], [2].

**O2. Construir y procesar un corpus documental en español.** Seleccionar, integrar y depurar fuentes de datos públicas, sintéticas y orientadas a información personalmente identificable, generando conjuntos de entrenamiento adecuados para la clasificación binaria entre documentos públicos y confidenciales.

**O3. Desarrollar y evaluar modelos de clasificación.** Entrenar, comparar y optimizar modelos de aprendizaje supervisado aplicados a representaciones vectoriales de texto, evaluando su rendimiento mediante métricas como accuracy, precision, recall y F1-score, con especial atención a la reducción de falsos negativos en la clase confidencial.

**O4. Integrar el modelo en un flujo funcional de seguridad activa.** Desplegar la lógica de extracción y clasificación en un servicio independiente, conectarlo con la aplicación web y utilizar su resultado para registrar la confidencialidad del documento y condicionar el acceso posterior al archivo.

**O5. Desarrollar una interfaz web de validación.** Implementar una aplicación que permita a los usuarios autenticarse, subir documentos, consultar sus archivos, organizarlos en carpetas, gestionar relaciones de acceso y comprobar el comportamiento completo del sistema desde la carga hasta la protección del documento.

**O6. Analizar las decisiones de arquitectura, despliegue e impacto.** Justificar las alternativas técnicas adoptadas, evaluar las limitaciones del sistema y estudiar el impacto potencial de la solución en contextos personales, empresariales, sociales y medioambientales.

## 1.4. Descripción de la solución propuesta

La solución propuesta consiste en una plataforma web de gestión documental con clasificación automática de privacidad. El usuario sube un archivo a través de la aplicación; el sistema valida su tamaño y formato, extrae su contenido textual, solicita al servicio de Inteligencia Artificial una clasificación y almacena el documento junto con sus metadatos. La clasificación resultante se registra como parte del documento y se utiliza para decidir su visibilidad mediante políticas de acceso.

La arquitectura se divide en tres bloques principales. El primer bloque es la aplicación web, desarrollada con Next.js, que proporciona las funcionalidades de interacción con el usuario: autenticación, subida de documentos, consulta de archivos, organización por carpetas, gestión de perfiles, relaciones entre usuarios, organizaciones y permisos [12]. El segundo bloque es la infraestructura de datos, apoyada en Supabase, PostgreSQL y Supabase Storage, donde se almacenan los metadatos y los archivos [1], [2]. El tercer bloque es el servicio de IA, desarrollado en Python con FastAPI, encargado de extraer texto de documentos multiformato y ejecutar la clasificación [8].

La separación del servicio de IA responde a una decisión de diseño. El procesamiento de lenguaje natural y la inferencia de modelos requieren dependencias específicas, como librerías de transformación de texto, modelos de embeddings y clasificadores entrenados con scikit-learn [6], [9]. Mantener este componente en un microservicio independiente permite trabajar en un entorno nativo de Python, simplifica la experimentación con modelos y evita trasladar dependencias pesadas al entorno web. Además, facilita futuras ampliaciones, como la sustitución del clasificador, la comparación de nuevos modelos o la incorporación de técnicas de ensamblado.

El flujo de clasificación se ha diseñado con un criterio de seguridad conservador. Si el servicio de IA no está disponible, si se produce un error durante la extracción de texto o si el documento no contiene texto procesable, el sistema clasifica el archivo como confidencial por defecto. Esta decisión reduce el riesgo de exponer documentos potencialmente sensibles ante fallos técnicos.

La seguridad se aplica mediante políticas de Row Level Security en la base de datos y en el almacenamiento. El propietario conserva la gestión de sus documentos, mientras que terceros pueden acceder únicamente cuando se cumplen las condiciones definidas por el sistema, como que el documento sea público, exista un permiso explícito, haya una relación autorizada o se comparta una organización. De esta forma, la clasificación generada por el modelo no queda como un dato informativo aislado, sino que se integra con la lógica efectiva de acceso al documento.

## 1.5. Organización del documento

La memoria se estructura en varios capítulos. Tras el resumen y el abstract, este primer capítulo introduce el contexto del trabajo, el problema abordado, los objetivos definidos y la solución propuesta.

El Capítulo 2 presenta el estado del arte y los trabajos previos relacionados con la gestión documental inteligente, las tecnologías Backend as a Service, las políticas de seguridad en bases de datos, el procesamiento de lenguaje natural aplicado a privacidad y las soluciones de Data Loss Prevention existentes.

El Capítulo 3 describe el desarrollo del sistema. En él se detallan la arquitectura general, el diseño de la infraestructura en Supabase, el tratamiento de datos, el entrenamiento y evaluación de modelos, el servicio de IA, la aplicación web y la integración entre los distintos componentes.

El Capítulo 4 recoge los resultados obtenidos y las conclusiones. Se analizan las métricas de los modelos entrenados, la elección del umbral de clasificación, la validación funcional del sistema y las principales conclusiones técnicas y personales derivadas del trabajo.

El Capítulo 5 incluye el análisis de impacto, considerando efectos personales, sociales, empresariales, económicos, medioambientales y éticos. También se estudiará la relación del proyecto con los Objetivos de Desarrollo Sostenible que resulten aplicables.

Finalmente, se incluirán la bibliografía utilizada durante el estudio y desarrollo del trabajo, así como los anexos necesarios para documentar aspectos técnicos adicionales, instrucciones de instalación, despliegue o fragmentos relevantes del código fuente.

---

# 2. Estado del arte y trabajos previos

## 2.1. Evolución de la gestión documental inteligente

La gestión documental ha evolucionado desde sistemas orientados principalmente al almacenamiento y recuperación de archivos hacia plataformas más amplias de gestión inteligente de la información. En sus primeras etapas, un gestor documental se centraba en organizar documentos en carpetas, conservar versiones, permitir búsquedas básicas y aplicar permisos de acceso definidos manualmente. Este enfoque resulta adecuado para entornos con volúmenes reducidos de información y estructuras organizativas relativamente estables, pero presenta limitaciones cuando los documentos crecen en número, variedad y sensibilidad [16].

El aumento de la digitalización ha provocado que las organizaciones almacenen documentos procedentes de múltiples fuentes: formularios, hojas de cálculo, correos exportados, informes, documentación administrativa, contratos, presentaciones o archivos generados automáticamente por aplicaciones. En este contexto, la clasificación manual se convierte en una tarea costosa y propensa a errores. Además, el contenido de un documento puede cambiar su nivel de sensibilidad aunque se encuentre en una carpeta aparentemente pública o haya sido subido por un usuario sin intención de compartir información privada.

Los sistemas modernos de gestión documental han incorporado mecanismos de búsqueda avanzada, indexación de texto, metadatos, flujos de aprobación y, en algunos casos, técnicas de análisis automático del contenido. Esta evolución se relaciona con el concepto de Intelligent Information Management, donde la plataforma no se limita a almacenar información, sino que participa en su interpretación, clasificación y gobierno. Dentro de esta tendencia, la detección automática de documentos sensibles es una línea especialmente relevante, ya que permite reducir la dependencia del etiquetado manual y mejorar la aplicación de medidas de seguridad.

No obstante, muchos gestores documentales siguen aplicando la seguridad de forma estática. Es habitual que los permisos se definan en función del propietario, la carpeta, el grupo de usuarios o el rol asignado. Estos mecanismos son necesarios, pero no siempre suficientes: protegen el contenedor, pero no analizan de forma directa la naturaleza del contenido. El presente trabajo se posiciona precisamente en ese punto, integrando la clasificación automática del documento con la lógica de acceso posterior.

## 2.2. Seguridad en gestores documentales y control de acceso

La seguridad en sistemas de gestión documental suele abordarse mediante modelos de control de acceso. Entre los enfoques más comunes se encuentran el control de acceso discrecional, basado en permisos definidos por propietarios o administradores; el control de acceso basado en roles, donde las acciones permitidas dependen del perfil del usuario; y modelos más contextuales, en los que intervienen atributos adicionales del usuario, del recurso o de la operación solicitada.

En aplicaciones web tradicionales, una parte significativa de las comprobaciones de autorización se implementa en la capa de aplicación. Esto significa que el servidor decide si una petición puede realizarse antes de consultar o modificar los datos. Aunque este enfoque es flexible, tiene un inconveniente importante: si la aplicación contiene errores, endpoints incompletos o rutas alternativas de acceso, la seguridad puede quedar debilitada. Por ello, en sistemas donde la protección de datos es crítica, resulta conveniente trasladar parte de la lógica de autorización a la propia capa de datos.

PostgreSQL ofrece mecanismos de Row Level Security que permiten definir políticas de acceso a nivel de fila. Estas políticas se evalúan directamente en la base de datos y condicionan qué registros puede leer, insertar, actualizar o eliminar cada usuario [2]. En una plataforma de gestión documental, esta capacidad permite expresar reglas como: el propietario puede gestionar sus documentos; un tercero solo puede leer un documento si es público, si tiene permiso explícito, si pertenece a una organización autorizada o si existe una relación de confianza definida.

Supabase combina PostgreSQL, autenticación, almacenamiento de archivos y APIs generadas automáticamente, lo que lo convierte en una opción adecuada para prototipos avanzados y aplicaciones de complejidad media [1]. A diferencia de soluciones puramente NoSQL, el uso de PostgreSQL permite modelar relaciones entre usuarios, documentos, permisos, organizaciones y carpetas con integridad referencial. Además, la integración de Row Level Security facilita que la seguridad no dependa exclusivamente del código cliente o de rutas concretas del backend.

En el contexto de este TFG, la seguridad documental no se plantea solo como una comprobación posterior, sino como parte del diseño del sistema. La clasificación automática de privacidad se almacena como un atributo del documento y se utiliza dentro de las reglas que determinan su visibilidad. Esto permite conectar el análisis de contenido con la autorización efectiva, reduciendo la separación habitual entre herramientas de clasificación y sistemas de permisos.

## 2.3. Data Loss Prevention y detección de información sensible

Las soluciones de Data Loss Prevention tienen como objetivo detectar, supervisar y prevenir la exposición no autorizada de información sensible. En entornos empresariales, estas herramientas se utilizan para identificar datos personales, información financiera, credenciales, documentación interna, propiedad intelectual o datos regulados. Su funcionamiento puede incluir inspección de archivos, análisis de correos, monitorización de tráfico, reglas de cumplimiento normativo y bloqueo de acciones consideradas inseguras.

Existen soluciones comerciales consolidadas, como servicios de detección de datos sensibles en plataformas cloud [14], [15]. Estas herramientas ofrecen capacidades avanzadas, integraciones con ecosistemas empresariales y catálogos de patrones predefinidos. Sin embargo, presentan varias limitaciones para el escenario de este trabajo. En primer lugar, suelen estar pensadas para organizaciones con infraestructura cloud específica y pueden implicar costes o configuraciones complejas. En segundo lugar, muchas funcionan como servicios externos con menor control sobre el modelo interno utilizado. En tercer lugar, no siempre se integran de forma directa con una lógica de permisos personalizada en una base de datos relacional pequeña o mediana.

Tradicionalmente, la detección de información sensible se ha basado en reglas, diccionarios y expresiones regulares [17]. Este enfoque es útil para identificar patrones explícitos, como correos electrónicos, números de teléfono, documentos identificativos, IBAN o tarjetas bancarias. Su principal ventaja es la interpretabilidad: cuando una regla se activa, es fácil explicar por qué se ha detectado un posible dato sensible. No obstante, las reglas tienen dificultades para capturar contexto semántico, expresiones indirectas o documentos que no contienen patrones formales pero sí información confidencial.

Por este motivo, los enfoques modernos combinan técnicas basadas en reglas con modelos de aprendizaje automático. Las reglas resultan eficaces como mecanismo de auditoría, limpieza o reclasificación de ejemplos claramente sensibles, mientras que los modelos supervisados permiten aprender patrones más generales a partir de datos etiquetados. En el presente trabajo se adopta esta combinación: durante la preparación del corpus se utilizan expresiones regulares para detectar posibles datos personalmente identificables en muestras públicas, y posteriormente se entrenan clasificadores de texto sobre representaciones vectoriales del contenido.

## 2.4. Procesamiento de lenguaje natural para clasificación de privacidad

El procesamiento de lenguaje natural permite representar, analizar y clasificar texto de forma automática. En el caso de la privacidad documental, el objetivo no es únicamente identificar palabras concretas, sino determinar si el contenido de un documento tiene características que aconsejan restringir su acceso. Esto requiere tratar texto no estructurado, variaciones lingüísticas, expresiones informales y documentos con estructuras heterogéneas.

Los enfoques clásicos de clasificación textual se basan en representaciones como bolsa de palabras, frecuencias de términos o TF-IDF, combinadas con algoritmos supervisados como Naive Bayes, Regresión Logística o Máquinas de Vectores de Soporte. Estos métodos han demostrado ser eficaces en tareas de clasificación de texto, especialmente cuando las clases presentan vocabulario diferenciado. Sin embargo, tienen limitaciones para capturar relaciones semánticas profundas, dependencia del contexto y significado de expresiones que no aparecen de forma literal en el entrenamiento.

La aparición de modelos basados en Transformers supuso un cambio importante en el procesamiento de lenguaje natural. Modelos como BERT introducen representaciones contextuales, en las que el vector asociado a una palabra o secuencia depende del entorno en el que aparece [4]. Esto permite capturar matices más complejos que los métodos basados únicamente en frecuencias. Para textos en español existen modelos entrenados o adaptados a este idioma, como BETO, así como modelos multilingües capaces de generar embeddings útiles para tareas de clasificación [5], [6].

En este TFG se emplean embeddings generados por un modelo de la familia BERT como representación intermedia del texto [4], [6]. Esta decisión permite separar dos fases: por un lado, la extracción de características semánticas mediante un modelo preentrenado; por otro, la clasificación supervisada mediante algoritmos más ligeros e interpretables. Esta arquitectura resulta adecuada para un Trabajo Fin de Grado porque combina capacidad semántica con eficiencia, facilita la comparación de varios clasificadores y reduce el coste de entrenamiento frente al ajuste completo de un modelo Transformer.

## 2.5. Modelos supervisados para clasificación binaria

La tarea de este proyecto se formula como un problema de clasificación binaria: cada documento debe clasificarse como público o confidencial. En este tipo de problemas, los modelos supervisados aprenden a partir de ejemplos previamente etiquetados y generan una predicción para nuevas muestras. La evaluación se realiza mediante métricas como accuracy, precision, recall y F1-score.

La Regresión Logística es un modelo lineal ampliamente utilizado en clasificación binaria. Aunque su formulación es sencilla, puede ofrecer resultados competitivos cuando las características de entrada son informativas. En el caso de embeddings de alta dimensionalidad, como los generados por modelos BERT, la Regresión Logística puede encontrar fronteras de decisión eficaces con bajo coste computacional y buena interpretabilidad relativa [9]. Además, al proporcionar probabilidades de pertenencia a cada clase, permite ajustar el umbral de decisión según las necesidades del dominio.

Las Máquinas de Vectores de Soporte también son habituales en clasificación textual. Su objetivo es encontrar una frontera que maximice el margen entre clases, lo que puede ser ventajoso cuando los datos son separables en el espacio vectorial. En embeddings densos, un SVM lineal puede comportarse de forma muy competitiva. Sin embargo, dependiendo de la configuración, puede resultar menos flexible para ajustar umbrales probabilísticos o integrarse en un flujo donde se necesite interpretar una probabilidad de confidencialidad.

Naive Bayes, por su parte, destaca por su simplicidad y bajo coste, y ha sido históricamente muy utilizado en clasificación de texto, como detección de spam. No obstante, sus supuestos de independencia entre características pueden ser problemáticos en representaciones densas de embeddings, donde las dimensiones no son términos independientes sino componentes de un espacio semántico aprendido.

En un sistema de seguridad documental, la métrica crítica no es únicamente la exactitud global. Un falso negativo, es decir, clasificar como público un documento que realmente es confidencial, puede tener consecuencias más graves que un falso positivo. Por ello, resulta razonable priorizar el recall de la clase confidencial, aunque esto implique aceptar más documentos públicos marcados inicialmente como privados. Esta consideración justifica el análisis de umbrales de decisión realizado en el trabajo.

## 2.6. Extracción de texto en documentos multiformato

Antes de clasificar un documento es necesario transformar el archivo original en texto procesable. Esta fase puede ser sencilla en archivos de texto plano, pero se complica cuando se trabaja con PDF, documentos de Word, hojas de cálculo, presentaciones, HTML, JSON, XML o archivos comprimidos. Cada formato tiene su propia estructura interna y puede requerir librerías específicas para acceder al contenido.

Un enfoque posible consiste en utilizar una librería distinta para cada formato: una para PDF, otra para DOCX, otra para hojas de cálculo, etc. Aunque este método permite controlar con detalle cada caso, también aumenta la complejidad del sistema y dificulta el mantenimiento. Cada nueva extensión exige integrar una dependencia, adaptar una interfaz y gestionar errores particulares.

Como alternativa, existen herramientas de conversión documental que buscan unificar la extracción de contenido y devolver una representación textual común [11]. La conversión a Markdown resulta especialmente útil porque permite conservar parte de la estructura semántica del documento: encabezados, listas, tablas y bloques diferenciados. Esta estructura puede aportar información relevante al modelo, frente a una extracción completamente plana en la que se pierden relaciones entre elementos.

En este proyecto, la extracción multiformato se considera una parte esencial del pipeline. El sistema no clasifica únicamente cadenas introducidas manualmente, sino documentos reales subidos por usuarios. Por ello, la robustez de esta fase condiciona directamente la calidad de la inferencia posterior. Además, se adopta un criterio de seguridad conservador: si no es posible extraer texto de un archivo, el documento se considera confidencial por defecto.

## 2.7. Arquitecturas de despliegue para modelos de NLP

La integración de modelos de procesamiento de lenguaje natural en aplicaciones web puede realizarse mediante distintas arquitecturas. Una posibilidad es ejecutar la inferencia dentro del propio backend de la aplicación web. Este enfoque simplifica el despliegue lógico, ya que todo el sistema se encuentra en un único servicio, pero puede generar problemas cuando el modelo requiere dependencias pesadas, memoria elevada o tiempos de arranque incompatibles con entornos serverless.

Otra alternativa consiste en delegar la inferencia en APIs externas. Esto reduce la carga computacional del sistema propio, pero introduce dependencia de terceros, posibles límites de uso, latencias variables y menor control sobre el pipeline completo. Además, si la extracción de texto, la generación de embeddings y la clasificación se reparten entre varios servicios, el mantenimiento y la trazabilidad pueden complicarse.

Una tercera opción es desplegar un microservicio especializado para la lógica de IA. Este servicio puede implementarse en Python, utilizar librerías propias del ecosistema de machine learning y exponer una API HTTP estable para la aplicación web [8], [22]. Aunque introduce una llamada de red adicional, ofrece mayor flexibilidad para experimentar con modelos, ajustar dependencias y evolucionar el pipeline de inferencia de forma independiente.

El presente trabajo adopta esta última aproximación. La aplicación web se mantiene en un entorno orientado a interfaz, autenticación y gestión documental, mientras que la extracción y clasificación se ejecutan en un servicio FastAPI independiente. Esta separación es coherente con los requisitos del proyecto, ya que permite conservar la agilidad experimental del componente de IA sin comprometer la mantenibilidad de la aplicación web.

## 2.8. Posicionamiento del trabajo

El sistema desarrollado no pretende sustituir a plataformas empresariales completas de Data Loss Prevention ni competir con servicios cloud de gran escala. Su objetivo es demostrar, en el contexto de un Trabajo Fin de Grado, que es viable integrar clasificación automática de privacidad, procesamiento de lenguaje natural y control de acceso efectivo en una plataforma documental funcional.

La principal aportación del trabajo se encuentra en la conexión entre dos niveles que a menudo aparecen separados: el análisis del contenido y la autorización sobre el recurso. El modelo de clasificación no se limita a producir una etiqueta informativa, sino que su resultado se incorpora al sistema de permisos y condiciona la visibilidad del documento. De este modo, la plataforma combina técnicas de aprendizaje supervisado con políticas de seguridad aplicadas en base de datos y almacenamiento.

Además, el trabajo se centra en un corpus en español y en una solución de arquitectura abierta, basada en tecnologías accesibles para un entorno académico: Next.js, Supabase, PostgreSQL, FastAPI, scikit-learn y modelos de la familia BERT [1], [2], [4], [8], [9], [12]. Esta elección permite construir un prototipo completo, evaluar sus resultados y justificar las decisiones técnicas adoptadas sin depender de herramientas cerradas o infraestructuras empresariales de alto coste.

En síntesis, el estado del arte muestra que existen técnicas y herramientas maduras para gestión documental, control de acceso, detección de información sensible y clasificación de texto. La contribución de este TFG consiste en integrarlas en una arquitectura ligera y coherente, orientada a reducir la exposición accidental de documentos confidenciales mediante seguridad activa basada en el contenido.

---

# 3. Desarrollo

## 3.1. Metodología de trabajo

El desarrollo del Trabajo Fin de Grado se ha planteado de forma incremental, dividiendo la solución en bloques funcionales que pudieran implementarse, probarse y evolucionar de manera relativamente independiente. Esta metodología resulta adecuada para un sistema que combina varias áreas técnicas: gestión documental, autenticación, almacenamiento seguro, procesamiento de lenguaje natural, entrenamiento de modelos y desarrollo de una aplicación web.

La primera fase se centró en definir la arquitectura general del sistema y preparar la estructura del repositorio. Se separaron los componentes principales en carpetas diferenciadas: `ml/` para los datasets, embeddings y scripts de entrenamiento; `servicio-ia/` para el microservicio de extracción y clasificación; `web/` para la aplicación Next.js; y `supabase/migrations/` para el esquema de base de datos y las políticas de seguridad. Esta organización facilita que cada bloque pueda evolucionar sin mezclar responsabilidades.

La segunda fase consistió en preparar la infraestructura de datos y seguridad. Se configuró Supabase como plataforma de autenticación, base de datos y almacenamiento de documentos [1]. Sobre PostgreSQL se definieron las tablas necesarias para representar usuarios, perfiles, documentos, permisos, carpetas, organizaciones y relaciones entre usuarios. Además, se añadieron políticas de Row Level Security para que el acceso no dependa exclusivamente del código de la aplicación, sino que también quede protegido en la capa de datos [2].

La tercera fase se orientó al flujo funcional de documentos: subida de archivos, extracción de texto, clasificación automática y almacenamiento de metadatos. Para ello se implementó una ruta de servidor en la aplicación web que valida el archivo, se comunica con el servicio de IA y registra el resultado en la base de datos. En paralelo, el servicio de IA se desarrolló como una API independiente capaz de recibir documentos, extraer texto y devolver una etiqueta de confidencialidad.

Finalmente, se abordó la experimentación con modelos de Machine Learning. Esta fase sigue en evolución, ya que se están entrenando y comparando nuevos modelos. Por este motivo, las secciones de este capítulo relativas a entrenamiento se redactan como descripción del pipeline y de las decisiones metodológicas actuales, dejando los resultados definitivos para el capítulo de resultados y conclusiones.

## 3.2. Arquitectura general del sistema

La arquitectura de la plataforma se organiza en tres capas principales: aplicación web, infraestructura de datos y servicio de Inteligencia Artificial.

La aplicación web actúa como punto de entrada para el usuario. Está desarrollada con Next.js, TypeScript y el App Router [12]. Desde ella se gestionan la autenticación, la subida de documentos, la consulta de archivos, la organización en carpetas, los perfiles de usuario, las relaciones entre usuarios y las organizaciones. La aplicación no ejecuta directamente el modelo de clasificación, sino que delega esa responsabilidad en un servicio externo especializado.

La infraestructura de datos se apoya en Supabase [1]. PostgreSQL almacena los metadatos de los documentos y las relaciones de acceso, mientras que Supabase Storage conserva los archivos originales. La autenticación también se gestiona desde Supabase, lo que permite asociar cada operación al usuario autenticado. Las políticas de Row Level Security definen qué registros puede consultar o modificar cada usuario [2].

El servicio de IA está desarrollado en Python con FastAPI [8], [22]. Su responsabilidad es recibir documentos o texto, extraer el contenido textual cuando sea necesario, generar la representación adecuada para el modelo y devolver una clasificación binaria: público o confidencial. Esta separación permite mantener el procesamiento de lenguaje natural dentro del ecosistema Python, donde se encuentran las librerías utilizadas para extracción, embeddings y clasificación.

El flujo general del sistema es el siguiente:

1. El usuario autenticado selecciona y sube un documento desde la aplicación web.
2. La ruta de subida valida el tamaño y la extensión del archivo.
3. Si existe una URL configurada para el servicio de IA, la aplicación envía el archivo al endpoint de procesamiento.
4. El servicio de IA extrae el texto, clasifica el documento y devuelve la confidencialidad, la probabilidad y posibles advertencias.
5. La aplicación almacena el archivo en Supabase Storage y registra sus metadatos en PostgreSQL.
6. Las políticas de acceso utilizan la confidencialidad y las relaciones de permisos para determinar qué usuarios pueden consultar o descargar el documento.

## 3.3. Justificación de la arquitectura de IA

Durante el diseño del sistema se analizaron varias alternativas para integrar la inferencia del modelo con la aplicación web.

La primera alternativa consistía en ejecutar la inferencia directamente dentro del entorno de Next.js, por ejemplo mediante funciones serverless y modelos exportados a ONNX. Esta opción tenía la ventaja de mantener un despliegue unificado y reducir llamadas de red, pero presentaba problemas relevantes para el contexto del TFG. Los modelos de lenguaje y sus dependencias pueden superar fácilmente los límites de tamaño y memoria de entornos serverless. Además, trasladar la tokenización y la inferencia del ecosistema Python a JavaScript introduce riesgo de desalineación entre entrenamiento y producción.

La segunda alternativa consistía en delegar parte de la inferencia en APIs externas. Este planteamiento reduce la carga computacional propia, pero fragmenta el pipeline: una parte del procesamiento queda fuera del control del sistema y otra debe ejecutarse en la aplicación web. Para un trabajo centrado en experimentar con modelos, umbrales y posibles técnicas de ensamblado, esta fragmentación limita la capacidad de iteración y dificulta la trazabilidad.

La tercera alternativa, finalmente seleccionada, consiste en aislar la lógica de Inteligencia Artificial en un microservicio FastAPI desplegado en un entorno preparado para Machine Learning [7], [8]. Esta solución introduce una llamada HTTP adicional, pero conserva el pipeline en Python, permite reutilizar directamente librerías como `transformers`, `scikit-learn` y `joblib`, y facilita sustituir el clasificador sin modificar la aplicación web [6], [9], [23]. En un TFG donde el entrenamiento y la comparación de modelos siguen evolucionando, esta flexibilidad resulta más importante que eliminar por completo la latencia de red.

Esta decisión también explica que el clasificador serializado se cargue desde la propia carpeta del servicio de IA. Aunque durante la experimentación los scripts y datasets se encuentran en `ml/`, el servicio debe ser desplegable de forma autónoma. Por ello, el modelo que se utiliza en producción se coloca dentro de `servicio-ia/modelo/`, manteniendo separado el entorno de investigación del entorno de inferencia.

## 3.4. Infraestructura de datos y seguridad

La plataforma utiliza Supabase como backend principal [1]. Esta elección permite disponer en un mismo entorno de autenticación, base de datos relacional y almacenamiento de archivos. PostgreSQL actúa como núcleo del modelo de datos, mientras que Supabase Storage almacena los documentos originales [2].

El modelo de datos incluye una tabla de documentos donde se registran, entre otros campos, el nombre original del archivo, la ruta del objeto en Storage, el usuario propietario, la confidencialidad calculada, el texto extraído, el tipo de archivo, el tamaño y la probabilidad devuelta por el clasificador cuando está disponible. Al separar el archivo físico de sus metadatos, el sistema puede aplicar reglas de acceso basadas en la información almacenada en base de datos.

La seguridad se implementa mediante políticas de Row Level Security. Para la tabla de documentos se definieron dos reglas principales. La primera permite que el propietario gestione sus propios documentos. La segunda permite que terceros lean un documento únicamente si se cumplen ciertas condiciones: que el documento sea público, que exista un permiso explícito, que exista una relación autorizada o que se comparta una organización asociada al documento. Además, se contemplan restricciones como los bloqueos entre usuarios.

En Supabase Storage, la política de lectura se diseñó para delegar la visibilidad del archivo en la visibilidad de la fila correspondiente en la tabla `Documentos`. Es decir, un usuario puede descargar un objeto del bucket si la base de datos le permite ver el documento asociado. Esta decisión evita duplicar reglas de autorización en dos lugares distintos y reduce el riesgo de incoherencias entre los metadatos y el archivo físico.

Durante el desarrollo se utilizó el cliente administrativo del servidor en ciertas operaciones críticas, como la subida del archivo y algunas consultas desde componentes de servidor. Esta decisión se tomó por motivos prácticos de integración y despliegue: el código se ejecuta únicamente en el servidor, comprueba previamente la sesión del usuario y aplica filtros explícitos por propietario o visibilidad. No obstante, desde el punto de vista arquitectónico, la solución deseable en un entorno productivo es que las migraciones y políticas RLS estén completamente aplicadas y que la base de datos actúe como barrera principal de autorización.

## 3.5. Flujo de subida y clasificación de documentos

El flujo de subida se implementa en la aplicación web mediante una ruta de servidor. El usuario envía un archivo y el sistema realiza varias comprobaciones antes de almacenarlo. En primer lugar, se valida que exista una sesión de usuario activa. A continuación, se comprueba que el archivo no supere el límite de tamaño establecido y que su extensión pertenezca al conjunto de formatos permitidos.

Los formatos soportados actualmente incluyen PDF, DOCX, TXT, XLSX, CSV, PPTX, HTML, JSON, XML y ZIP. El límite de tamaño se fija en 10 MB por archivo. Esta restricción evita procesamientos excesivamente costosos y resulta suficiente para la validación funcional del sistema en el contexto del trabajo.

Una vez validado el archivo, la aplicación intenta comunicarse con el servicio de IA. Si la variable de entorno `SERVICIO_IA_URL` está configurada, el archivo se envía al endpoint `/procesar`. El servicio devuelve la confidencialidad calculada, la probabilidad asociada, el texto extraído, el tipo de archivo y posibles advertencias. Si el servicio no responde, responde con error o no está configurado, el sistema aplica un criterio fail-safe y clasifica el documento como confidencial.

Este criterio conservador también se aplica cuando la extracción de texto produce una cadena vacía. La razón es que un documento no procesable no debe tratarse automáticamente como público, ya que podría contener información sensible en una imagen, estar protegido o presentar un formato que no haya podido interpretarse correctamente. En caso de duda, el sistema prioriza la protección.

Después de la clasificación, el archivo se guarda en el bucket `almacen_documentos`. El nombre físico del objeto se genera a partir del identificador del usuario, una marca temporal y una versión normalizada del nombre original. Esta normalización elimina caracteres problemáticos para el almacenamiento, pero conserva el nombre original en la base de datos para mostrarlo al usuario. Si el archivo se sube correctamente pero falla la inserción en base de datos, el sistema elimina el objeto del bucket para evitar archivos huérfanos.

## 3.6. Servicio de extracción y clasificación

El servicio de IA se expone mediante FastAPI y ofrece dos endpoints principales. El endpoint `/procesar` recibe un archivo, extrae su texto y devuelve una clasificación. El endpoint `/clasificar` permite clasificar texto ya extraído, lo que resulta útil para pruebas o reclasificaciones.

La extracción de texto se realiza mediante una conversión estructurada a Markdown [11]. Esta decisión sustituye un enfoque inicial basado en librerías independientes para cada formato. La ventaja principal es que se unifica la interfaz de extracción y se conserva parte de la estructura semántica del documento, como títulos, listas o tablas. Esta información estructural puede ser útil para el modelo, ya que evita reducir todos los documentos a texto plano sin contexto.

El servicio impone un límite de 100 000 caracteres al texto conservado para clasificación. Si el documento supera ese tamaño, el texto se trunca y se devuelve una marca indicando que ha sido recortado. Esta limitación protege el servicio frente a entradas demasiado largas y evita tiempos de inferencia innecesarios.

La clasificación se diseñó inicialmente con un modo provisional basado en heurísticas de patrones sensibles. Este modo detectaba indicios como correos electrónicos, DNI, IBAN, tarjetas bancarias o términos asociados a información privada. Su objetivo no era sustituir al modelo final, sino permitir desarrollar y probar el resto de la plataforma antes de disponer del clasificador entrenado. El contrato de la API se mantuvo estable desde el principio, de forma que la integración web no tuviera que cambiar al sustituir la heurística por el modelo real.

En el modo de modelo real, el servicio carga un clasificador serializado con `joblib`, genera embeddings mediante un modelo de la familia BERT y aplica el clasificador sobre el vector resultante [4], [6], [23]. Para evitar desalineaciones entre entrenamiento e inferencia, la configuración del modelo de embeddings, la estrategia de pooling y la longitud máxima de tokens deben coincidir con las usadas durante el entrenamiento. Esta cuestión resultó especialmente importante durante las pruebas, ya que una diferencia entre el entorno de entrenamiento y el de producción puede provocar predicciones incoherentes aunque el clasificador funcione correctamente.

## 3.7. Preparación del corpus y generación de embeddings

El entrenamiento de modelos requiere un corpus etiquetado con ejemplos de documentos públicos y confidenciales. Para la clase confidencial se emplean fuentes orientadas a la detección de información personalmente identificable [18]. Para la clase pública se utilizan textos abiertos, mensajes de redes sociales, datos sintéticos y otros ejemplos de comunicación no sensible [19]-[21]. El objetivo es que el modelo aprenda a diferenciar documentos que contienen información privada de aquellos que pueden exponerse con menor riesgo.

Durante la preparación de datos se aplican procesos de limpieza y normalización. Entre ellos se incluyen la eliminación de caracteres no relevantes, el tratamiento de emojis y la auditoría mediante expresiones regulares [17]. Esta auditoría permite detectar patrones sensibles en muestras inicialmente consideradas públicas, como correos electrónicos, teléfonos, documentos identificativos o datos bancarios. Cuando aparece alguno de estos patrones, la muestra puede reclasificarse como confidencial para evitar introducir ruido en el entrenamiento.

También se estudian dos estrategias de balanceo. La primera corrige el desbalance de cantidad entre clases, generando un conjunto con proporción más equilibrada entre ejemplos públicos y confidenciales. La segunda atiende a la distribución de longitudes, ya que se observó que los textos confidenciales podían ser más cortos que los públicos. Si no se controla este sesgo, el modelo podría aprender indirectamente la longitud como señal de privacidad, en lugar de basarse en el contenido semántico.

Una vez preparado el corpus, los textos se transforman en embeddings de alta dimensionalidad mediante un modelo de la familia BERT [4], [6]. Estos vectores capturan información semántica del texto y sirven como entrada para los clasificadores supervisados. Esta separación entre generación de embeddings y entrenamiento del clasificador permite comparar varios algoritmos sobre la misma representación textual.

## 3.8. Entrenamiento y comparación de modelos

La fase de entrenamiento sigue abierta, ya que se están probando nuevos modelos y configuraciones. Por ello, esta sección describe la metodología actual y reserva la comparación definitiva para el capítulo de resultados.

Los primeros experimentos se centraron en modelos supervisados clásicos aplicados sobre embeddings: Regresión Logística, SVM y Naive Bayes [9]. Posteriormente se ampliaron las pruebas a modelos y técnicas adicionales, como Random Forest, XGBoost, KNN, AdaBoost, Bagging, Stacking, Voting Ensemble y RIPPER [9], [10], [27]. Esta ampliación responde a la necesidad de comprobar si modelos más complejos o técnicas de ensamblado mejoran la detección de documentos confidenciales sin penalizar excesivamente la precisión.

Para cada modelo se evalúan métricas estándar de clasificación: accuracy, precision, recall, F1-score, matriz de confusión, ROC-AUC y Average Precision cuando el algoritmo permite obtener probabilidades o puntuaciones. La métrica más relevante para el dominio es el recall de la clase confidencial, ya que los falsos negativos implican que un documento sensible podría quedar accesible como público.

La Regresión Logística tiene un papel central porque combina buen rendimiento, bajo coste computacional y salida probabilística. Esto permite ajustar el umbral de decisión. En lugar de usar el umbral estándar de 0.5, se ha experimentado con un umbral inferior, como 0.2, para aumentar la sensibilidad hacia la clase confidencial. Esta decisión se justifica por el coste asimétrico de los errores: es preferible revisar manualmente algunos falsos positivos antes que exponer un documento realmente sensible.

Los resultados parciales muestran que algunos modelos más complejos pueden alcanzar métricas competitivas, pero la selección final debe valorar no solo la exactitud, sino también la estabilidad, el coste de inferencia, la facilidad de despliegue, la interpretabilidad y la coherencia con el servicio de producción. Por este motivo, los resultados finales se documentarán en el capítulo correspondiente una vez cerrada la fase experimental.

## 3.9. Aplicación web e interfaz de usuario

La aplicación web se desarrolla con Next.js y proporciona la interfaz funcional para validar el sistema [12]. Incluye autenticación de usuarios, páginas de registro e inicio de sesión, recuperación de contraseña, perfil de usuario, vista de inicio, gestión de documentos, carpetas, documentos compartidos, exploración de documentos públicos, organizaciones y relaciones entre usuarios. La interfaz se apoya en componentes reutilizables y en un sistema visual propio, con tarjetas KPI, modales, botones, campos de formulario, etiquetas de estado, avatares, filas de pipeline y zonas de subida.

La vista de documentos propios constituye el núcleo operativo de la plataforma. Permite subir archivos, observar el progreso de cada subida y consultar los documentos almacenados. Para mejorar la experiencia de usuario se implementó una cola de subidas en cliente con concurrencia limitada. Esta decisión evita saturar el servidor cuando se suben varios archivos a la vez y permite mostrar estados diferenciados por archivo. La interfaz informa de fases como cola, subida, extracción de texto, análisis, guardado, error o finalización.

El componente de subida utiliza eventos nativos de drag-and-drop en lugar de incorporar una dependencia externa específica. Esta decisión se tomó porque la funcionalidad necesaria podía implementarse con la API estándar del navegador y React, reduciendo dependencias sin perder capacidad funcional. La subida admite tanto selección manual como arrastre de archivos, validando formato, tamaño y número máximo de elementos por tanda antes de iniciar el envío.

La aplicación permite operaciones de gestión documental como renombrar, eliminar, descargar, mover a carpetas y modificar la visibilidad cuando procede. En el caso de hacer público un documento, la interfaz utiliza confirmaciones explícitas para evitar cambios accidentales de exposición. Los documentos y carpetas se muestran en un explorador unificado en el que las carpetas aparecen antes que los documentos, ambas colecciones ordenadas alfabéticamente. El nombre de una carpeta permite navegar a su contenido y el nombre de un documento abre su vista de detalle.

El sistema de carpetas evolucionó desde una organización plana hacia una estructura jerárquica con subcarpetas. El usuario puede crear carpetas dentro de otras, mover documentos a una carpeta, sacar documentos fuera de una carpeta, mover carpetas dentro de otras carpetas y evitar ciclos, por ejemplo impidiendo mover una carpeta dentro de sí misma o dentro de una descendiente. Estas operaciones están disponibles tanto mediante menús de tres puntos como mediante arrastre sobre la carpeta de destino. En dispositivos móviles, el arrastre se activa mediante una pulsación mantenida para evitar conflictos con la navegación táctil normal.

Las organizaciones permiten agrupar usuarios y compartir documentos en un espacio común. La vista de una organización muestra carpetas y documentos en el mismo explorador, siguiendo el mismo criterio de ordenación que la vista de documentos propios: carpetas primero y documentos sueltos después. Los miembros pueden mover y renombrar elementos de la organización, mientras que las operaciones destructivas se reservan al administrador. De este modo se separa la colaboración ordinaria, que requiere reorganizar contenido, de la administración de eliminación, que tiene mayor impacto sobre la información compartida.

La gestión de organizaciones incluye creación de carpetas de equipo, subida de documentos propios a una organización, subida de carpetas completas mediante copia de la estructura, invitación de miembros, resumen de participantes, transferencia o salida del administrador cuando procede y notificaciones asociadas a eventos relevantes. También se incorporan restricciones prácticas, como evitar nombres duplicados de documentos dentro de una organización y comprobar el espacio disponible antes de añadir nuevos elementos.

Además de la gestión documental, la web incorpora vistas de exploración y colaboración. La sección de exploración permite consultar documentos públicos accesibles y realizar búsquedas. La vista de usuarios permite localizar perfiles, gestionar favoritos y bloqueos. La bandeja de entrada recoge documentos recibidos e invitaciones a organizaciones. El buscador global del panel lateral permite localizar documentos, usuarios y organizaciones desde un único punto de entrada.

Estas decisiones de diseño responden al objetivo de que el sistema sea utilizable para validar el flujo completo del TFG y, al mismo tiempo, mantenga un criterio prudente en acciones que afectan a la privacidad. La interfaz no se limita a mostrar documentos clasificados por el modelo, sino que ofrece un entorno completo de gestión, colaboración y control de acceso que permite comprobar cómo la clasificación automática se integra con operaciones reales de una plataforma documental.

## 3.10. Validación técnica durante el desarrollo

Durante el desarrollo se han utilizado pruebas y comprobaciones parciales para asegurar que los componentes principales funcionan de forma coherente. En el servicio de IA se han incluido pruebas sobre extracción de formatos, formatos no soportados, clasificación y endpoints de la API. En la aplicación web se han realizado compilaciones y comprobaciones de tipos para verificar que las rutas y componentes integran correctamente.

También se ha validado el comportamiento de seguridad conservadora. El sistema debe clasificar como confidencial cuando no hay texto extraíble, cuando el servicio de IA no está configurado o cuando se produce un fallo durante la llamada al servicio. Esta validación es importante porque garantiza que los errores técnicos no se traducen en exposición accidental de documentos.

En la parte de datos, las migraciones SQL permiten versionar el esquema y las políticas de seguridad. Esta decisión facilita reproducir el entorno y documentar la evolución del modelo de permisos. No obstante, durante el desarrollo se detectaron situaciones en las que la aplicación de migraciones en el entorno remoto podía condicionar el comportamiento real de RLS. Por ello, algunas rutas de servidor incorporan comprobaciones explícitas de usuario y visibilidad como medida práctica, aunque la arquitectura objetivo mantiene la autorización reforzada en base de datos.

## 3.11. Decisiones de implementación y cambios respecto al plan inicial

A lo largo del proyecto se tomaron varias decisiones que modificaron o concretaron el plan inicial. La más relevante fue la separación del componente de IA en un microservicio independiente. Aunque inicialmente podía parecer más simple ejecutar todo desde la aplicación web, los límites de los entornos serverless, el peso de las dependencias de NLP y la necesidad de seguir experimentando con modelos hicieron preferible un servicio FastAPI desplegable por separado.

Otra decisión importante fue mantener un contrato estable para la API de IA desde las primeras fases. Al principio se utilizó una heurística provisional para permitir que la plataforma web avanzara sin esperar al modelo definitivo. Esta decisión redujo el bloqueo entre tareas: la web pudo implementar la subida, la clasificación y el almacenamiento, mientras la parte de Machine Learning seguía evolucionando.

También se adoptó un comportamiento fail-safe. Esta decisión no es solo técnica, sino de dominio: en una plataforma orientada a proteger documentos, los errores deben inclinarse hacia la confidencialidad. Por ello, la ausencia del servicio de IA, un error de extracción o un documento sin texto procesable no producen una clasificación pública, sino confidencial.

En la interfaz web se tomaron decisiones pragmáticas para reducir complejidad. El drag-and-drop se implementó con eventos nativos en lugar de añadir una librería externa, y la cola de subidas se gestionó en cliente con concurrencia limitada. Estos cambios mantienen la funcionalidad necesaria para la demostración y reducen dependencias.

También se ajustó el diseño de la gestión documental para unificar patrones de interacción. Inicialmente existían vistas separadas para carpetas y documentos, pero se evolucionó hacia exploradores unificados en los que las carpetas aparecen arriba y los documentos sueltos debajo. Esta decisión reduce saltos visuales, hace más predecible la navegación y permite reutilizar la misma lógica de selección, menús de acciones, movimiento y ordenación.

Otra decisión relevante fue permitir que los miembros de una organización puedan mover y renombrar elementos, reservando la eliminación al administrador. El motivo es que reorganizar información compartida forma parte del trabajo colaborativo ordinario, mientras que eliminar documentos o carpetas puede afectar a todos los usuarios del equipo. La interfaz refleja esta separación mostrando las opciones destructivas solo a quienes tienen rol de administración.

Para el movimiento de documentos y carpetas se combinaron dos mecanismos: menús explícitos de acciones y arrastre sobre carpetas. Los menús permiten mover un elemento a otra carpeta o sacarlo fuera seleccionando la opción sin carpeta. El arrastre ofrece una interacción más rápida para reorganizar contenido. En ambos casos se filtran destinos inválidos, como la carpeta en la que el elemento ya está o una carpeta descendiente en el caso de mover carpetas.

Por último, se introdujeron ajustes relacionados con el despliegue y la seguridad real del entorno. En algunos puntos se utilizó el cliente administrativo del servidor con verificaciones explícitas de usuario, debido a problemas o dependencias en la aplicación de políticas RLS remotas. Esta solución es aceptable para el prototipo del TFG porque el control se realiza en código de servidor autenticado, pero queda documentado como una decisión de implementación que en un entorno productivo debería reforzarse aplicando completamente las políticas de base de datos.

---

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

En cuanto a la interfaz web, se ha implementado una experiencia de subida con estados visibles por archivo. El usuario puede observar fases como cola, extracción, clasificación y guardado, lo que permite validar visualmente el avance del pipeline. La cola de subida se probó con varios archivos simultáneos, comprobando que la concurrencia limitada evita que todas las peticiones se lancen a la vez y que los documentos completados aparezcan en la lista conforme finaliza su procesamiento.

También se validó la gestión documental posterior a la subida. El usuario puede renombrar documentos, eliminarlos, descargarlos, cambiar su visibilidad, moverlos a carpetas, sacarlos de una carpeta y organizarlos mediante arrastre. En las carpetas se validó la creación de subcarpetas, el movimiento de carpetas dentro de otras y la prevención de ciclos en la jerarquía. La interfaz filtra destinos inválidos para evitar que una carpeta se mueva dentro de sí misma, dentro de una descendiente o hacia la misma ubicación en la que ya se encuentra.

La funcionalidad de organizaciones se validó como extensión colaborativa del flujo documental. Se comprobó que un usuario puede crear una organización, añadir o invitar miembros, subir documentos propios al espacio común, subir carpetas completas, crear carpetas de organización, navegar por subcarpetas y reorganizar elementos. Los miembros pueden mover y renombrar elementos compartidos, mientras que las acciones de eliminación se restringen al administrador. Esta validación confirma que la colaboración no depende únicamente de permisos globales, sino de reglas diferenciadas según la operación.

Se validaron además las vistas de apoyo: exploración de documentos públicos, detalle de documento, compartidos conmigo, usuarios, favoritos, bloqueos, buzón, perfil y buscador global. Estas vistas permiten comprobar que la clasificación de privacidad no queda aislada en la subida, sino que afecta al acceso posterior y a la forma en que los documentos aparecen o se ocultan en distintos contextos.

Desde el punto de vista técnico, la aplicación web se ha comprobado mediante verificación de tipos con TypeScript y pruebas de integración manual de los flujos principales. Durante el cierre de las funcionalidades de carpetas y organizaciones se ejecutó `npx tsc --noEmit` para confirmar que los componentes, server actions y rutas mantenían coherencia de tipos.

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

---

# 5. Análisis de impacto

## 5.1. Introducción

El desarrollo de una plataforma inteligente de gestión documental con clasificación automática de privacidad tiene implicaciones que van más allá del resultado técnico. El sistema propuesto afecta a la forma en que los usuarios almacenan, comparten y protegen documentos, por lo que su impacto debe analizarse desde distintas perspectivas: personal, profesional, social, empresarial, económica, medioambiental y ética.

La finalidad principal del proyecto es reducir el riesgo de exposición accidental de información sensible mediante la combinación de técnicas de procesamiento de lenguaje natural, aprendizaje automático y políticas de acceso. Esta orientación convierte la seguridad en un elemento central del diseño, no en una característica añadida posteriormente. No obstante, cualquier sistema automático de clasificación puede cometer errores, por lo que también es necesario considerar sus límites y los riesgos asociados a una confianza excesiva en la automatización.

## 5.2. Impacto personal y profesional

Desde el punto de vista personal, el trabajo ha permitido integrar conocimientos adquiridos durante el grado en distintas áreas de la ingeniería informática. El proyecto combina desarrollo web, bases de datos, seguridad, aprendizaje automático, procesamiento de lenguaje natural, despliegue de servicios y diseño de arquitecturas distribuidas. Esta combinación ha exigido tomar decisiones técnicas justificadas y coordinar componentes con requisitos diferentes.

El desarrollo también ha supuesto una mejora en la capacidad de planificación y resolución de problemas. A lo largo del proyecto se han producido cambios de enfoque, ajustes en la arquitectura y problemas de integración entre entornos de desarrollo, despliegue y entrenamiento. La necesidad de documentar estas decisiones ha contribuido a reforzar una práctica profesional importante: no limitarse a implementar una solución, sino justificar por qué se adopta una alternativa frente a otras posibles.

En el plano profesional, el trabajo se aproxima a problemas reales de ingeniería de software. La protección de documentos, la gestión de permisos, la integración de servicios externos y el despliegue de modelos de Machine Learning son cuestiones habituales en entornos empresariales. Por ello, el proyecto proporciona experiencia aplicable a sistemas donde la seguridad, la trazabilidad y la mantenibilidad son requisitos relevantes.

## 5.3. Impacto social

El impacto social del proyecto está relacionado principalmente con la protección de la privacidad. En la actualidad, gran parte de la actividad administrativa, académica y profesional se realiza mediante documentos digitales. Estos documentos pueden contener datos personales, información financiera, historiales, identificadores, credenciales o comunicaciones privadas. Una exposición accidental puede afectar de forma directa a las personas implicadas.

La plataforma propuesta contribuye a reducir este riesgo mediante una capa automática de detección y protección. Si un usuario sube un documento potencialmente confidencial, el sistema puede clasificarlo como privado y limitar su acceso. Este mecanismo no elimina la necesidad de supervisión humana, pero sí puede actuar como una barrera adicional frente a errores de etiquetado o decisiones precipitadas.

También existe un impacto positivo en la concienciación sobre privacidad. Al incorporar la clasificación automática dentro del flujo de gestión documental, el sistema hace visible que no todos los documentos deben tratarse igual y que el contenido debe influir en las decisiones de acceso. Esta idea resulta especialmente relevante en organizaciones donde varios usuarios comparten información de forma continua.

Sin embargo, debe tenerse en cuenta el riesgo de falsos positivos y falsos negativos. Un falso positivo puede restringir temporalmente un documento que realmente podría ser público, generando fricción en el uso. Un falso negativo, por el contrario, puede exponer información sensible. Por este motivo, el proyecto prioriza la reducción de falsos negativos y adopta un comportamiento conservador ante errores técnicos.

## 5.4. Impacto empresarial

En un contexto empresarial, una herramienta de clasificación automática de documentos puede aportar valor al mejorar la gestión de la información y reducir riesgos operativos. Las organizaciones manejan grandes volúmenes de documentos y no siempre resulta viable revisar manualmente cada archivo antes de compartirlo. Automatizar parte de este proceso puede ayudar a aplicar criterios de seguridad de forma más homogénea.

La solución propuesta puede servir como apoyo para pequeñas y medianas organizaciones que necesitan mejorar la protección documental sin desplegar plataformas complejas de Data Loss Prevention. Al utilizar tecnologías accesibles y una arquitectura modular, el sistema puede adaptarse o ampliarse según las necesidades de cada entorno.

Desde el punto de vista del cumplimiento normativo, la plataforma puede contribuir a aplicar medidas técnicas orientadas a proteger datos personales. Aunque no garantiza por sí sola el cumplimiento completo de regulaciones como el Reglamento General de Protección de Datos, sí incorpora principios alineados con la protección desde el diseño y por defecto [3]. En particular, el criterio fail-safe de clasificar como confidencial ante fallos reduce la probabilidad de exposición accidental por errores del sistema.

También existen limitaciones empresariales. Para un uso productivo sería necesario reforzar aspectos como auditoría avanzada, trazabilidad de accesos, revisión humana de clasificaciones dudosas, gestión de incidentes, escalabilidad, monitorización y pruebas con datasets representativos del dominio concreto de la organización. Por tanto, el resultado del TFG debe entenderse como un prototipo funcional y extensible, no como un producto empresarial cerrado.

## 5.5. Impacto económico

El impacto económico del proyecto puede analizarse desde dos perspectivas. Por un lado, una herramienta de estas características puede reducir costes asociados a revisiones manuales, errores de clasificación y posibles incidentes de seguridad. La automatización permite procesar documentos de forma más rápida y homogénea, liberando tiempo de usuarios o administradores.

Por otro lado, el proyecto se ha desarrollado con tecnologías de bajo coste o con planes gratuitos adecuados para un entorno académico. El uso de Supabase, Vercel, Hugging Face Spaces, FastAPI, Next.js y librerías de código abierto permite construir una solución completa sin necesidad de infraestructura propia compleja. Esta decisión reduce la barrera de entrada y facilita la experimentación.

No obstante, en un escenario de producción real podrían aparecer costes adicionales. El aumento del número de usuarios, documentos o peticiones de clasificación exigiría recursos de cómputo más estables, almacenamiento ampliado, monitorización, copias de seguridad y posiblemente despliegues con mayor disponibilidad. Además, los modelos de procesamiento de lenguaje natural pueden requerir memoria y CPU suficientes para mantener tiempos de respuesta aceptables.

En cualquier caso, el diseño modular permite ajustar el coste según las necesidades. La aplicación web, la base de datos y el servicio de IA pueden escalar de forma separada, lo que evita sobredimensionar todo el sistema cuando solo una parte requiere más recursos.

## 5.6. Impacto medioambiental

El impacto medioambiental de una solución digital está relacionado principalmente con el consumo energético asociado al almacenamiento, procesamiento y despliegue de servicios. Aunque este TFG no implica una infraestructura de gran escala, sí utiliza recursos cloud y modelos de Machine Learning, por lo que conviene considerar su coste computacional.

Una decisión relevante es separar el entrenamiento de la inferencia. El entrenamiento de modelos y la generación de embeddings pueden ser procesos más costosos, pero no se ejecutan continuamente en la aplicación. En cambio, la inferencia se realiza bajo demanda cuando se suben documentos. Esta separación permite optimizar el sistema y evitar cálculos innecesarios durante el uso normal de la plataforma.

La elección de clasificadores relativamente ligeros sobre embeddings precomputados también contribuye a reducir el coste de inferencia frente a alternativas más pesadas, como el ajuste completo de modelos Transformer para cada iteración. Asimismo, los límites de tamaño de archivo y de caracteres procesados evitan cargas excesivas y ayudan a mantener un uso razonable de recursos.

Como posible efecto positivo indirecto, una gestión documental más segura y eficiente puede reducir la dependencia de procesos manuales, duplicidades y revisiones repetidas. Sin embargo, este beneficio debe valorarse con prudencia, ya que el impacto medioambiental real dependería del volumen de uso, la infraestructura de despliegue y las políticas de almacenamiento aplicadas.

## 5.7. Impacto ético y riesgos

El uso de aprendizaje automático para clasificar documentos plantea cuestiones éticas relevantes. En primer lugar, el sistema puede cometer errores. Por ello, no debe presentarse como una autoridad infalible, sino como una herramienta de apoyo a la seguridad. En contextos críticos, la clasificación automática debería complementarse con revisión humana, auditoría y mecanismos de corrección.

En segundo lugar, el modelo depende de los datos utilizados para su entrenamiento. Si el corpus no representa adecuadamente los documentos reales del dominio, el sistema puede generalizar peor o mostrar sesgos. Por ejemplo, podría asociar determinadas longitudes, estilos de redacción o vocabularios con una clase de forma indebida. Para reducir este riesgo, el trabajo contempla análisis de balanceo y revisión de sesgos en los datos.

En tercer lugar, debe garantizarse que la propia plataforma no aumente el riesgo que pretende reducir. El texto extraído de los documentos puede contener información sensible, por lo que debe almacenarse y tratarse con las mismas precauciones que el archivo original. La decisión de aplicar políticas de acceso y clasificar como confidencial ante fallos está alineada con este principio.

También es importante preservar la transparencia. Los usuarios deberían conocer que el sistema realiza una clasificación automática, que dicha clasificación puede no ser perfecta y que existen mecanismos para revisar o corregir decisiones cuando sea necesario. Esta transparencia evita una dependencia ciega del modelo y favorece un uso responsable de la herramienta.

## 5.8. Alineación con los Objetivos de Desarrollo Sostenible

El proyecto puede relacionarse con varios Objetivos de Desarrollo Sostenible de la Agenda 2030.

En primer lugar, se vincula con el ODS 9, Industria, innovación e infraestructura, al proponer una solución tecnológica que combina software web, inteligencia artificial y seguridad de datos [26]. El trabajo plantea una arquitectura modular y accesible que puede servir como base para sistemas documentales más seguros.

En segundo lugar, se relaciona con el ODS 16, Paz, justicia e instituciones sólidas, especialmente en lo referente a la protección de información, la mejora de la confianza en sistemas digitales y la reducción de riesgos asociados al tratamiento indebido de datos [26]. Una gestión documental más segura contribuye a reforzar la responsabilidad en el uso de información personal y organizativa.

También puede vincularse de forma indirecta con el ODS 12, Producción y consumo responsables, en la medida en que promueve una gestión más eficiente de recursos digitales y evita duplicidades o procesos manuales innecesarios [26]. No obstante, esta relación es secundaria y depende del uso real de la plataforma.

## 5.9. Conclusión del análisis de impacto

El impacto principal del proyecto se encuentra en la mejora de la seguridad y privacidad en la gestión documental. La solución propuesta introduce una capa automática de análisis que permite clasificar documentos según su contenido y aplicar restricciones de acceso coherentes con esa clasificación.

El proyecto presenta beneficios potenciales en contextos personales, académicos y empresariales, especialmente como apoyo para reducir errores humanos y reforzar la protección por defecto. Al mismo tiempo, sus limitaciones obligan a mantener una visión prudente: la clasificación automática no sustituye a la supervisión humana, y su fiabilidad depende de la calidad de los datos, la evaluación del modelo y la correcta integración de las políticas de seguridad.

En conjunto, la solución representa una aproximación viable y responsable a la integración de Machine Learning en sistemas documentales, siempre que se mantengan criterios de transparencia, revisión y protección conservadora ante errores.

---

# 6. Bibliografía

[1] Supabase, “Supabase Documentation,” Supabase. [En línea]. Disponible en: https://supabase.com/docs. Accedido: 30-may-2026.

[2] PostgreSQL Global Development Group, “Row Security Policies,” PostgreSQL Documentation. [En línea]. Disponible en: https://www.postgresql.org/docs/current/ddl-rowsecurity.html. Accedido: 30-may-2026.

[3] European Parliament and Council of the European Union, “Regulation (EU) 2016/679: General Data Protection Regulation,” Official Journal of the European Union, 2016.

[4] J. Devlin, M.-W. Chang, K. Lee y K. Toutanova, “BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding,” arXiv preprint arXiv:1810.04805, 2018.

[5] J. Cañete, G. Chaperon, R. Fuentes, J.-H. Ho, H. Kang y J. Pérez, “Spanish Pre-Trained BERT Model and Evaluation Data,” PML4DC at ICLR, 2020.

[6] Hugging Face, “Transformers Documentation,” Hugging Face. [En línea]. Disponible en: https://huggingface.co/docs/transformers. Accedido: 30-may-2026.

[7] Hugging Face, “Spaces Documentation,” Hugging Face. [En línea]. Disponible en: https://huggingface.co/docs/hub/spaces. Accedido: 30-may-2026.

[8] S. Ramírez, “FastAPI Documentation,” FastAPI. [En línea]. Disponible en: https://fastapi.tiangolo.com/. Accedido: 30-may-2026.

[9] F. Pedregosa et al., “Scikit-learn: Machine Learning in Python,” Journal of Machine Learning Research, vol. 12, pp. 2825-2830, 2011.

[10] T. Chen y C. Guestrin, “XGBoost: A Scalable Tree Boosting System,” en Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining, 2016, pp. 785-794.

[11] Microsoft, “MarkItDown,” GitHub repository. [En línea]. Disponible en: https://github.com/microsoft/markitdown. Accedido: 30-may-2026.

[12] Vercel, “Next.js Documentation,” Next.js. [En línea]. Disponible en: https://nextjs.org/docs. Accedido: 30-may-2026.

[13] Meta Open Source, “React Documentation,” React. [En línea]. Disponible en: https://react.dev/. Accedido: 30-may-2026.

[14] Amazon Web Services, “Amazon Macie Documentation,” AWS Documentation. [En línea]. Disponible en: https://docs.aws.amazon.com/macie/. Accedido: 30-may-2026.

[15] Google Cloud, “Sensitive Data Protection Documentation,” Google Cloud. [En línea]. Disponible en: https://cloud.google.com/sensitive-data-protection/docs. Accedido: 30-may-2026.

[16] M.-F. Moens, Information Extraction: Algorithms and Prospects. Dordrecht, The Netherlands: Springer, 2006.

[17] J. E. F. Friedl, Mastering Regular Expressions, 3rd ed. Sebastopol, CA, USA: O'Reilly Media, 2006.

[18] AI4Privacy, “PII Masking Dataset,” Hugging Face Datasets. [En línea]. Disponible en: https://huggingface.co/ai4privacy. Accedido: 30-may-2026.

[19] Pysentimiento, “Spanish Tweets Dataset,” Hugging Face Datasets. [En línea]. Disponible en: https://huggingface.co/pysentimiento. Accedido: 30-may-2026.

[20] Gabrielaz, “spamspa Dataset,” Hugging Face Datasets. [En línea]. Disponible en: https://huggingface.co/datasets/Gabrielaz/spamspa. Accedido: 30-may-2026.

[21] Tanaos, “Synthetic Spam Detection Dataset Spanish,” Hugging Face Datasets. [En línea]. Disponible en: https://huggingface.co/Tanaos. Accedido: 30-may-2026.

[22] Python Software Foundation, “Python Documentation,” Python. [En línea]. Disponible en: https://docs.python.org/3/. Accedido: 30-may-2026.

[23] Joblib Development Team, “Joblib Documentation,” Joblib. [En línea]. Disponible en: https://joblib.readthedocs.io/. Accedido: 30-may-2026.

[24] OpenJS Foundation, “Node.js Documentation,” Node.js. [En línea]. Disponible en: https://nodejs.org/en/docs. Accedido: 30-may-2026.

[25] Docker Inc., “Docker Documentation,” Docker. [En línea]. Disponible en: https://docs.docker.com/. Accedido: 30-may-2026.

[26] United Nations, “The 17 Goals,” Sustainable Development Goals. [En línea]. Disponible en: https://sdgs.un.org/goals. Accedido: 30-may-2026.

[27] T. Chen et al., “xgboost: Extreme Gradient Boosting,” Python package documentation. [En línea]. Disponible en: https://xgboost.readthedocs.io/. Accedido: 30-may-2026.

---

# 7. Anexos

## Anexo A. Estructura del repositorio

El proyecto se organiza en varios módulos diferenciados para separar responsabilidades y facilitar el mantenimiento:

| Ruta | Descripción |
| :--- | :--- |
| `ml/` | Scripts de preparación de datos, generación de embeddings, entrenamiento de modelos y resultados experimentales. |
| `servicio-ia/` | Microservicio FastAPI encargado de la extracción de texto multiformato y la clasificación de documentos. |
| `web/` | Aplicación web desarrollada con Next.js, TypeScript y Supabase. |
| `supabase/migrations/` | Migraciones SQL del esquema de base de datos, funciones auxiliares y políticas RLS. |
| `docs/` | Documentación interna del desarrollo, planes, especificaciones y bitácora de decisiones. |
| `memoria/` | Borradores y capítulos redactados de la memoria del TFG. |
| `pruebas/` | Scripts y documentos de prueba utilizados durante depuración e integración. |

Esta estructura permite trabajar de forma independiente sobre la aplicación web, el servicio de IA y los experimentos de Machine Learning. Además, las migraciones de Supabase quedan versionadas, lo que facilita reproducir la estructura de datos y las políticas de seguridad.

## Anexo B. Variables de entorno

El repositorio incluye un fichero `.env.example` con las variables necesarias para ejecutar el sistema. El fichero real `.env` no se versiona, ya que contiene credenciales sensibles.

| Variable | Uso |
| :--- | :--- |
| `SUPABASE_ACCESS_TOKEN` | Token de acceso para tareas de gestión o CLI de Supabase durante el desarrollo. |
| `SUPABASE_URL` | URL del proyecto Supabase utilizado por la aplicación. |
| `SUPABASE_ANON_KEY` | Clave pública anónima de Supabase para operaciones autenticadas desde cliente/servidor. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave administrativa utilizada solo en servidor para operaciones controladas. |
| `SERVICIO_IA_URL` | URL base del microservicio de IA. En local puede apuntar a `http://localhost:8000`. |

En el despliegue web, las variables equivalentes deben configurarse en el proveedor de hosting correspondiente. La clave `SUPABASE_SERVICE_ROLE_KEY` debe tratarse como secreta y no exponerse nunca al navegador.

## Anexo C. Instalación y ejecución local de la aplicación web

La aplicación web se encuentra en la carpeta `web/`. Para ejecutarla en local es necesario disponer de Node.js y de las dependencias instaladas mediante `npm` [12], [24].

Pasos básicos:

```bash
cd web
npm install
npm run dev
```

Una vez iniciado el servidor de desarrollo, la aplicación queda disponible en:

```text
http://localhost:3000
```

Los scripts definidos para la web son:

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo de Next.js. |
| `npm run build` | Compila la aplicación para producción. |
| `npm run start` | Ejecuta la versión compilada. |
| `npm run lint` | Ejecuta el linter del proyecto. |
| `npm run test` | Ejecuta las pruebas con Vitest. |
| `npm run test:watch` | Ejecuta las pruebas en modo observación. |

## Anexo D. Instalación y ejecución local del servicio de IA

El servicio de IA se encuentra en la carpeta `servicio-ia/`. Está implementado con FastAPI y utiliza dependencias del ecosistema Python para la extracción de texto y la clasificación [8], [22].

Pasos básicos en local:

```bash
cd servicio-ia
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

En sistemas Unix, la activación del entorno virtual sería:

```bash
source venv/bin/activate
```

El servicio expone, entre otros, los siguientes endpoints:

| Endpoint | Método | Descripción |
| :--- | :---: | :--- |
| `/salud` | GET | Devuelve el estado del servicio, el modo del modelo y los formatos soportados. |
| `/procesar` | POST | Recibe un archivo, extrae su texto y devuelve la clasificación. |
| `/clasificar` | POST | Recibe texto ya extraído y devuelve la clasificación. |

El endpoint principal para la integración con la web es `/procesar`, ya que permite enviar el documento completo y delegar en el servicio tanto la extracción como la inferencia.

## Anexo E. Formatos soportados y límites

El sistema admite actualmente los siguientes formatos de archivo:

| Formato | Descripción |
| :--- | :--- |
| `pdf` | Documentos PDF. |
| `docx` | Documentos de Microsoft Word. |
| `txt` | Texto plano. |
| `xlsx` | Hojas de cálculo de Microsoft Excel. |
| `csv` | Datos tabulares en texto separado por comas. |
| `pptx` | Presentaciones de Microsoft PowerPoint. |
| `html` | Documentos HTML. |
| `json` | Documentos estructurados JSON. |
| `xml` | Documentos estructurados XML. |
| `zip` | Archivos comprimidos con contenido procesable. |

Los límites principales son:

| Límite | Valor |
| :--- | :---: |
| Tamaño máximo de archivo | 10 MB |
| Texto máximo conservado por el servicio de IA | 100.000 caracteres |
| Concurrencia de subida en cliente | Limitada para evitar saturación del servidor |

Estos límites se han definido para mantener un comportamiento estable durante la validación del TFG. En un entorno productivo deberían ajustarse en función de los recursos disponibles y del volumen real de documentos.

## Anexo F. Despliegue

La arquitectura permite desplegar la aplicación web y el servicio de IA por separado.

La aplicación web puede desplegarse en Vercel, aprovechando su integración con Next.js. Para ello es necesario configurar las variables de entorno relacionadas con Supabase y con la URL del servicio de IA. El despliegue debe garantizar que las claves administrativas solo se utilicen en servidor.

El servicio de IA puede desplegarse en Hugging Face Spaces mediante Docker [7], [25]. El fichero `README.md` del servicio incluye metadatos para indicar el SDK Docker y el puerto de la aplicación. El servicio escucha en el puerto esperado por Hugging Face Spaces y expone la API FastAPI utilizada por la aplicación web.

En Supabase deben aplicarse las migraciones SQL incluidas en `supabase/migrations/`. Estas migraciones crean o actualizan tablas, funciones auxiliares, políticas RLS y reglas de acceso al almacenamiento. La correcta aplicación de estas migraciones es importante para que la seguridad no dependa únicamente del código de la aplicación.

## Anexo G. Pruebas y validación técnica

Durante el desarrollo se han utilizado varias formas de validación:

| Componente | Validación |
| :--- | :--- |
| Servicio de IA | Pruebas de extracción, formatos soportados, formatos rechazados y endpoints. |
| Aplicación web | Compilación, comprobación de tipos, pruebas de componentes y validación manual de subida, clasificación, carpetas, organizaciones, permisos y búsqueda. |
| Supabase | Revisión de migraciones, políticas RLS y acceso a Storage. |
| Modelos ML | Evaluación mediante métricas de clasificación, matrices de confusión, ROC-AUC y Average Precision. |

Comandos habituales:

```bash
# Servicio de IA
cd servicio-ia
pytest
```

```bash
# Aplicación web
cd web
npx tsc --noEmit
npm run build
npm run test
```

Para la validación funcional manual de la aplicación web se revisaron, entre otros, los siguientes flujos:

1. Registro, inicio de sesión, recuperación de contraseña y edición de perfil.
2. Subida de documentos con cola, validaciones de formato y estados visibles del pipeline.
3. Clasificación conservadora ante errores del servicio de IA o ausencia de texto extraíble.
4. Renombrado, eliminación, descarga, cambio de visibilidad y movimiento de documentos.
5. Creación de carpetas y subcarpetas, movimiento de carpetas y prevención de ciclos.
6. Explorador de documentos propios con carpetas primero y documentos ordenados alfabéticamente.
7. Organizaciones con miembros, documentos compartidos, carpetas de equipo, menús de acciones y permisos diferenciados entre miembro y administrador.
8. Drag-and-drop de documentos y carpetas sobre carpetas destino, incluyendo comportamiento táctil mediante pulsación mantenida en móvil.
9. Exploración de documentos públicos, documentos compartidos, usuarios, favoritos, bloqueos, buzón y buscador global.

Estas pruebas no sustituyen a una batería automatizada end-to-end, pero permiten validar que los flujos principales del prototipo funcionan de forma integrada y que las decisiones de seguridad se reflejan en la experiencia de usuario.

## Anexo H. Consideraciones de seguridad

Las siguientes consideraciones deben tenerse en cuenta al ejecutar o desplegar el sistema:

1. La clave `SUPABASE_SERVICE_ROLE_KEY` no debe exponerse en cliente ni incluirse en código público.
2. Los documentos sin texto extraíble deben tratarse como confidenciales por defecto.
3. Las políticas RLS deben aplicarse y verificarse en el entorno Supabase real.
4. El texto extraído puede contener información sensible y debe protegerse igual que el documento original.
5. Las URLs firmadas de descarga deben tener una duración limitada.
6. La clasificación automática debe entenderse como apoyo a la seguridad, no como sustituto de revisión humana en contextos críticos.

Estas medidas están alineadas con el enfoque de seguridad por diseño adoptado en el proyecto.

import os
import sys
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, AdaBoostClassifier, BaggingClassifier, StackingClassifier
from sklearn.tree import DecisionTreeClassifier, export_text
from xgboost import XGBClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, roc_auc_score, average_precision_score
import wittgenstein as lw

class Logger(object):
    def __init__(self, filename):
        self.terminal = sys.stdout
        self.log = open(filename, "a", encoding="utf-8")

    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
        self.log.flush()

    def flush(self):
        self.terminal.flush()
        self.log.flush()

def nombres_features(X):
    if hasattr(X, "columns"):
        return list(X.columns)
    return [f"emb_{i}" for i in range(X.shape[1])]

def imprimir_top_importancias(modelo, feature_names, top_n=10):
    if not hasattr(modelo, "feature_importances_"):
        return

    importancias = modelo.feature_importances_
    top_indices = np.argsort(importancias)[::-1][:top_n]
    print(f"\n>>> TOP {top_n} DIMENSIONES DE EMBEDDING POR IMPORTANCIA")
    for posicion, idx in enumerate(top_indices, start=1):
        print(f"{posicion:02d}. {feature_names[idx]}: {importancias[idx]:.6f}")

def imprimir_arbol_exportado(nombre_modelo, arbol, feature_names, max_depth=3):
    print(f"\n>>> EJEMPLO DE ARBOL/REGLAS PARA {nombre_modelo}")
    print(
        ">>> Nota: las condiciones son interpretables como estructura del modelo, "
        "pero no semanticamente porque las variables son dimensiones de embedding."
    )
    print(export_text(arbol, feature_names=feature_names, max_depth=max_depth, decimals=4))

def imprimir_interpretabilidad_arboles(nombre_modelo, modelo, X_train):
    feature_names = nombres_features(X_train)

    if isinstance(modelo, RandomForestClassifier):
        imprimir_top_importancias(modelo, feature_names)
        imprimir_arbol_exportado(nombre_modelo, modelo.estimators_[0], feature_names, max_depth=3)
    elif isinstance(modelo, DecisionTreeClassifier):
        imprimir_top_importancias(modelo, feature_names)
        imprimir_arbol_exportado(nombre_modelo, modelo, feature_names, max_depth=3)
    elif isinstance(modelo, AdaBoostClassifier) and getattr(modelo, "estimators_", None):
        primer_estimador = modelo.estimators_[0]
        if isinstance(primer_estimador, DecisionTreeClassifier):
            imprimir_top_importancias(modelo, feature_names)
            imprimir_arbol_exportado(nombre_modelo, primer_estimador, feature_names, max_depth=3)

def entrenar_y_evaluar_con_validacion(nombre_modelo, modelo, X_train, y_train, X_val, y_val, threshold=None):
    """
    Entrena el modelo y lo evalúa. Si hay umbral y el modelo lo soporta, lo usa.
    Incluye métricas estándar: Reporte, Matriz, ROC-AUC y Average Precision.
    """
    modelo.fit(X_train, y_train)
    imprimir_interpretabilidad_arboles(nombre_modelo, modelo, X_train)
    
    # Obtener predicciones y probabilidades
    if isinstance(modelo, lw.RIPPER):
        y_preds = modelo.predict(X_val)
        probs = modelo.predict_proba(X_val)[:, 1]
        desc_umbral = ""
        # Mostrar las reglas de RIPPER
        print(f"\n📜 Reglas generadas por {nombre_modelo}:")
        modelo.ruleset_.out_pretty()
    elif threshold is not None and hasattr(modelo, "predict_proba"):
        probs = modelo.predict_proba(X_val)[:, 1]
        y_preds = (probs >= threshold).astype(int)
        desc_umbral = f" (Umbral: {threshold})"
    elif hasattr(modelo, "predict_proba"):
        probs = modelo.predict_proba(X_val)[:, 1]
        y_preds = modelo.predict(X_val)
        desc_umbral = ""
    else:
        y_preds = modelo.predict(X_val)
        probs = None
        desc_umbral = ""
    
    cm = confusion_matrix(y_val, y_preds)
    reporte = classification_report(y_val, y_preds, target_names=["Clase 0 (Pub)", "Clase 1 (Priv)"], digits=4)
    
    print(f"\n📊 --- {nombre_modelo}{desc_umbral} ---")
    print(f"📝 Reporte:\n{reporte}")
    
    if probs is not None:
        roc_auc = roc_auc_score(y_val, probs)
        avg_prec = average_precision_score(y_val, probs)
        print(f"📈 ROC-AUC: {roc_auc:.4f}")
        print(f"📉 Average Precision: {avg_prec:.4f}")

    print(f"🧩 Matriz:")
    print(f"                      Predicho: Pub     Predicho: Priv")
    print(f"      Real Clase 0 (Pub):  {cm[0][0]:<10d} {cm[0][1]:<10d}")
    print(f"      Real Clase 1 (Priv): {cm[1][0]:<10d} {cm[1][1]:<10d}")
    print("-" * 60)

def ejecutar_experimento_svm(X_a, y_a, X_val, y_val, svm_params, descripcion):
    print(f"\n>>> EXPERIMENTO SVM: {descripcion}")
    print(f">>> PARÁMETROS: {svm_params}\n")
    entrenar_y_evaluar_con_validacion(f"SVM {svm_params.get('kernel', 'rbf')}", SVC(**svm_params), X_a, y_a, X_val, y_val)

def ejecutar_experimento_rf(X_train, y_train, X_val, y_val, rf_params, descripcion):
    print(f"\n>>> EXPERIMENTO RANDOM FOREST: {descripcion}")
    print(f">>> PARÁMETROS: {rf_params}")
    rf = RandomForestClassifier(**rf_params)
    entrenar_y_evaluar_con_validacion(f"Random Forest {descripcion}", rf, X_train, y_train, X_val, y_val)

def evaluar_rf_greedy(X_train, y_train, X_val, y_val, rf_params):
    rf = RandomForestClassifier(**rf_params)
    rf.fit(X_train, y_train)

    probs = rf.predict_proba(X_val)[:, 1]
    y_preds = rf.predict(X_val)

    return {
        "accuracy": accuracy_score(y_val, y_preds),
        "f1_priv": f1_score(y_val, y_preds, pos_label=1),
        "roc_auc": roc_auc_score(y_val, probs),
        "avg_precision": average_precision_score(y_val, probs),
        "params": rf_params,
    }

def ejecutar_experimento_rf_greedy(X_train, y_train, X_val, y_val):
    print("\n>>> EXPERIMENTO RANDOM FOREST: Greedy Search")
    print(">>> CRITERIO: se conserva la configuración con mayor F1 de la clase privada")

    base_params = {"random_state": 42, "n_jobs": -1}
    busqueda = [
        ("n_estimators", [100, 200, 300]),
        ("max_depth", [10, 20, 30]),
    ]

    mejores_params = dict(base_params)
    mejor_resultado = None

    for parametro, valores in busqueda:
        print(f"\n>>> GREEDY STEP: {parametro}")
        mejor_step = None

        for valor in valores:
            params = {**mejores_params, parametro: valor}
            print(f">>> PROBANDO PARÁMETROS: {params}")
            resultado = evaluar_rf_greedy(X_train, y_train, X_val, y_val, params)
            print(
                ">>> RESULTADO: "
                f"acc={resultado['accuracy']:.4f} | "
                f"f1_priv={resultado['f1_priv']:.4f} | "
                f"roc_auc={resultado['roc_auc']:.4f} | "
                f"avg_precision={resultado['avg_precision']:.4f}"
            )

            if mejor_step is None or resultado["f1_priv"] > mejor_step["f1_priv"]:
                mejor_step = resultado

        mejores_params = mejor_step["params"]
        mejor_resultado = mejor_step
        print(f">>> MEJOR TRAS {parametro}: {mejores_params}")

    print(f"\n>>> MEJORES PARÁMETROS GREEDY RANDOM FOREST: {mejores_params}")
    print(
        ">>> MÉTRICAS GREEDY: "
        f"acc={mejor_resultado['accuracy']:.4f} | "
        f"f1_priv={mejor_resultado['f1_priv']:.4f} | "
        f"roc_auc={mejor_resultado['roc_auc']:.4f} | "
        f"avg_precision={mejor_resultado['avg_precision']:.4f}"
    )

    ejecutar_experimento_rf(X_train, y_train, X_val, y_val, mejores_params, "Greedy Search Mejor")

def ejecutar_experimento_ripper(X_train, y_train, X_val, y_val, ripper_params, descripcion):
    print(f"\n>>> EXPERIMENTO RIPPER: {descripcion}")
    print(f">>> PARÁMETROS: {ripper_params}")
    print("⏳ Entrenando RIPPER (esto puede tardar debido a la dimensionalidad)...")
    
    if isinstance(X_train, np.ndarray):
        cols = [f"emb_{i}" for i in range(X_train.shape[1])]
        X_train_df = pd.DataFrame(X_train, columns=cols)
        X_val_df = pd.DataFrame(X_val, columns=cols)
    else:
        X_train_df = X_train
        X_val_df = X_val

    ripper = lw.RIPPER(**ripper_params, n_discretize_bins=10, max_rule_conds=5)
    entrenar_y_evaluar_con_validacion(f"RIPPER {descripcion}", ripper, X_train_df, y_train, X_val_df, y_val)

def ejecutar_experimento_xgb(X_train, y_train, X_val, y_val, xgb_params, descripcion):
    print(f"\n>>> EXPERIMENTO XGBOOST: {descripcion}")
    print(f">>> PARÁMETROS: {xgb_params}")
    xgb = XGBClassifier(**xgb_params)
    entrenar_y_evaluar_con_validacion(f"XGBoost {descripcion}", xgb, X_train, y_train, X_val, y_val)

def ejecutar_experimento_knn(X_train, y_train, X_val, y_val, knn_params, descripcion):
    print(f"\n>>> EXPERIMENTO KNN: {descripcion}")
    print(f">>> PARÁMETROS: {knn_params}")
    knn = KNeighborsClassifier(**knn_params)
    entrenar_y_evaluar_con_validacion(f"KNN {descripcion}", knn, X_train, y_train, X_val, y_val)

def ejecutar_experimento_ada(X_train, y_train, X_val, y_val, ada_params, descripcion):
    print(f"\n>>> EXPERIMENTO ADABOOST: {descripcion}")
    print(f">>> PARÁMETROS: {ada_params}")
    ada = AdaBoostClassifier(**ada_params)
    entrenar_y_evaluar_con_validacion(f"AdaBoost {descripcion}", ada, X_train, y_train, X_val, y_val)

def ejecutar_experimento_voting(X_train, y_train, X_val, y_val):
    print("\n🗳️ >>> EXPERIMENTO: MAJORITY VOTING REFINADO (TOP 3)")
    print(">>> COMPONENTES: LR (U=0.2), RF, XGB")
    print(">>> NOTA: Sin SVM por ser el eslabón más débil.")

    # Reducir para asegurar finalización en CLI
    print("📉 Usando subset de 10000 muestras para el ensamble...")
    np.random.seed(42)
    idx = np.random.choice(len(X_train), 10000, replace=False)
    X_sub = X_train[idx]
    y_sub = y_train[idx]

    # 1. Definir y entrenar los 3 mejores modelos
    lr = LogisticRegression(max_iter=1000, random_state=42)
    rf = RandomForestClassifier(n_estimators=200, max_depth=20, random_state=42, n_jobs=-1)
    xgb = XGBClassifier(n_estimators=500, learning_rate=0.05, max_depth=6, random_state=42)

    print("⏳ Entrenando top 3 modelos...")
    lr.fit(X_sub, y_sub)
    rf.fit(X_sub, y_sub)
    xgb.fit(X_sub, y_sub)

    # 2. Obtener predicciones
    lr_probs = lr.predict_proba(X_val)[:, 1]
    lr_preds = (lr_probs >= 0.2).astype(int)
    
    rf_preds = rf.predict(X_val)
    xgb_preds = xgb.predict(X_val)

    # 3. Lógica de Votación (Mayoría de 3, no hay empates)
    all_preds = np.stack([lr_preds, rf_preds, xgb_preds], axis=1)
    # Si la suma es 2 o 3, la mayoría es 1 (Privado). Si es 0 o 1, la mayoría es 0 (Público).
    final_preds = (np.sum(all_preds, axis=1) >= 2).astype(int)

    # Evaluación
    cm = confusion_matrix(y_val, final_preds)
    reporte = classification_report(y_val, final_preds, target_names=["Clase 0 (Pub)", "Clase 1 (Priv)"], digits=4)
    
    # Promedio de probabilidades para métricas de curva
    avg_probs = (lr_probs + rf.predict_proba(X_val)[:, 1] + xgb.predict_proba(X_val)[:, 1]) / 3
    roc_auc = roc_auc_score(y_val, avg_probs)
    avg_prec = average_precision_score(y_val, avg_probs)

    print(f"\n📊 --- Majority Voting (Top 3: LR+RF+XGB) ---")
    print(f"📝 Reporte:\n{reporte}")
    print(f"📈 ROC-AUC (Promedio Probs): {roc_auc:.4f}")
    print(f"📉 Average Precision: {avg_prec:.4f}")
    print(f"🧩 Matriz:")
    print(f"                      Predicho: Pub     Predicho: Priv")
    print(f"      Real Clase 0 (Pub):  {cm[0][0]:<10d} {cm[0][1]:<10d}")
    print(f"      Real Clase 1 (Priv): {cm[1][0]:<10d} {cm[1][1]:<10d}")
    print("-" * 60)

def ejecutar_experimento_bagging_lr(X_train, y_train, X_val, y_val):
    print("\n🎒 >>> EXPERIMENTO: BAGGING DE LOGISTIC REGRESSION")
    print(">>> PARÁMETROS: N=10, Samples=0.8, Features=0.8, Umbral=0.2")

    # BaggingClassifier nativo
    base_lr = LogisticRegression(max_iter=1000, random_state=42)
    bagging_lr = BaggingClassifier(
        estimator=base_lr, 
        n_estimators=10, 
        max_samples=0.8, 
        max_features=0.8, 
        random_state=42, 
        n_jobs=-1
    )

    print("⏳ Entrenando Bagging de LR...")
    # Entrenamos y evaluamos con el umbral de 0.2
    entrenar_y_evaluar_con_validacion("Bagging LR (Umbral 0.2)", bagging_lr, X_train, y_train, X_val, y_val, threshold=0.2)

def ejecutar_experimento_stacking(X_train, y_train, X_val, y_val):
    print("\n🥞 >>> EXPERIMENTO: STACKING ENSEMBLE (EL COMITÉ INTELIGENTE)")
    print(">>> BASE: LR, RF, XGB")
    print(">>> META-MODELO: Logistic Regression")

    # Configuración ultrarrápida para evitar el timeout del CLI
    print("📉 Usando subset de 1000 muestras y CV=2 para el stacking...")
    np.random.seed(42)
    idx = np.random.choice(len(X_train), 1000, replace=False)
    X_sub = X_train[idx]
    y_sub = y_train[idx]

    # 1. Definir estimadores base
    base_models = [
        ('lr', LogisticRegression(max_iter=1000, random_state=42)),
        ('rf', RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)),
        ('xgb', XGBClassifier(n_estimators=100, learning_rate=0.1, max_depth=4, random_state=42))
    ]

    # 2. Definir Stacking con Meta-modelo LR y CV mínima
    stack = StackingClassifier(
        estimators=base_models, 
        final_estimator=LogisticRegression(random_state=42),
        cv=2, 
        n_jobs=-1
    )

    print("⏳ Entrenando Stacking (Base + Meta-modelo)...")
    # Evaluamos con el umbral de 0.2 para máxima seguridad
    entrenar_y_evaluar_con_validacion("Stacking Ensemble (Umbral 0.2)", stack, X_sub, y_sub, X_val, y_val, threshold=0.2)

if __name__ == "__main__":
    path_base = os.path.dirname(os.path.abspath(__file__))
    path_resultado = os.path.join(path_base, "resultado_train.txt")
    
    # Limpiar archivo de resultados anterior
    with open(path_resultado, "w", encoding="utf-8") as f:
        f.write("=== RESULTADOS DE ENTRENAMIENTO ===\n")
    
    sys.stdout = Logger(path_resultado)

    print("🚀 Cargando datos...")
    X_a = np.load(os.path.join(path_base, "embeddings_unbalanced.npy"))
    df_a = pd.read_csv(os.path.join(path_base, "train_EXPERIMENTO_A_desbalanceado.csv"))
    y_a = df_a['label'].values

    X_val = np.load(os.path.join(path_base, "embeddings_validation_1prueba.npy"))
    df_val = pd.read_csv(os.path.join(path_base, "validation_congelado.csv"))
    y_val = df_val['label'].values

    modo = sys.argv[1].lower() if len(sys.argv) > 1 else "todos"
    if modo in {"rf-greedy", "randomforest-greedy", "greedy-rf"}:
        ejecutar_experimento_rf_greedy(X_a, y_a, X_val, y_val)
        sys.exit(0)

    # --- EXPERIMENTOS RANDOM FOREST (Con todos los datos) ---
    print("\n🌲 Iniciando experimentos Random Forest...")
    
    # 1. RF Base
    ejecutar_experimento_rf(X_a, y_a, X_val, y_val, 
        {"n_estimators": 100, "random_state": 42, "n_jobs": -1}, 
        "Base")

    # 2. RF Profundo
    ejecutar_experimento_rf(X_a, y_a, X_val, y_val, 
        {"n_estimators": 200, "max_depth": 20, "random_state": 42, "n_jobs": -1}, 
        "Profundidad Controlada")

    # 3. RF Balanceado
    ejecutar_experimento_rf(X_a, y_a, X_val, y_val, 
        {"n_estimators": 100, "class_weight": "balanced", "random_state": 42, "n_jobs": -1}, 
        "Balanceado")

    ejecutar_experimento_rf_greedy(X_a, y_a, X_val, y_val)

    # --- EXPERIMENTOS RIPPER (Subset reducido por velocidad) ---
    print("\n📜 Iniciando experimentos RIPPER (Subset reducido)...")
    print("📉 Reduciendo dataset (300 muestras, 50 features) para RIPPER...")
    np.random.seed(42)
    indices = np.random.choice(len(X_a), 300, replace=False)
    X_a_sub = X_a[indices][:, :50]
    X_val_sub = X_val[:, :50]
    y_a_sub = y_a[indices]
    
    ejecutar_experimento_ripper(X_a_sub, y_a_sub, X_val_sub, y_val, 
        {"k": 2, "prune_size": 0.2, "dl_allowance": 64, "random_state": 42}, 
        "Mayor Cobertura (Subset)")

    # --- EXPERIMENTOS XGBOOST (Con todos los datos) ---
    print("\n⚡ Iniciando experimentos XGBoost...")

    # 1. XGB Base
    ejecutar_experimento_xgb(X_a, y_a, X_val, y_val, 
        {"n_estimators": 100, "random_state": 42}, 
        "Base")

    # 2. XGB Robusto
    ejecutar_experimento_xgb(X_a, y_a, X_val, y_val, 
        {"n_estimators": 500, "learning_rate": 0.05, "max_depth": 6, "random_state": 42}, 
        "Robusto (LR=0.05, N=500)")

    # 3. XGB Regularizado
    ejecutar_experimento_xgb(X_a, y_a, X_val, y_val, 
        {"n_estimators": 200, "learning_rate": 0.1, "max_depth": 5, "subsample": 0.8, "colsample_bytree": 0.8, "random_state": 42}, 
        "Regularizado")

    # --- EXPERIMENTOS KNN (Subset reducido por velocidad de búsqueda) ---
    print("\n👥 Iniciando experimentos KNN (Subset reducido)...")
    print("📉 Reduciendo dataset a 5000 muestras para KNN...")
    np.random.seed(42)
    indices_knn = np.random.choice(len(X_a), 5000, replace=False)
    X_a_knn = X_a[indices_knn]
    y_a_knn = y_a[indices_knn]

    # 1. KNN K=5
    ejecutar_experimento_knn(X_a_knn, y_a_knn, X_val, y_val, 
        {"n_neighbors": 5, "n_jobs": -1}, 
        "K=5")

    # 2. KNN K=10
    ejecutar_experimento_knn(X_a_knn, y_a_knn, X_val, y_val, 
        {"n_neighbors": 10, "n_jobs": -1}, 
        "K=10")

    # 3. KNN K=20
    ejecutar_experimento_knn(X_a_knn, y_a_knn, X_val, y_val, 
        {"n_neighbors": 20, "n_jobs": -1}, 
        "K=20")

    # --- EXPERIMENTOS ADABOOST (Subset reducido por velocidad) ---
    print("\n🚀 Iniciando experimentos AdaBoost (Subset reducido)...")
    print("📉 Reduciendo dataset a 10000 muestras para AdaBoost...")
    np.random.seed(42)
    indices_ada = np.random.choice(len(X_a), 10000, replace=False)
    X_a_ada = X_a[indices_ada]
    y_a_ada = y_a[indices_ada]

    # 1. AdaBoost Base
    ejecutar_experimento_ada(X_a_ada, y_a_ada, X_val, y_val, 
        {"n_estimators": 50, "random_state": 42}, 
        "Base (N=50)")

    # 2. AdaBoost Lento pero Seguro
    ejecutar_experimento_ada(X_a_ada, y_a_ada, X_val, y_val, 
        {"n_estimators": 100, "learning_rate": 0.1, "random_state": 42}, 
        "Lento pero Seguro (LR=0.1, N=100)")

    # 3. AdaBoost con Estimador Fuerte (Árbol Profundidad 2)
    ejecutar_experimento_ada(X_a_ada, y_a_ada, X_val, y_val, 
        {"estimator": DecisionTreeClassifier(max_depth=2), "n_estimators": 50, "random_state": 42}, 
        "Estimador Fuerte (Depth=2, N=50)")

    # --- EXPERIMENTO INDIVIDUAL: LOGISTIC REGRESSION (EL "BENCHMARK" A BATIR) ---
    print("\n📈 Iniciando experimento individual Logistic Regression...")
    ejecutar_experimento_svm(X_a, y_a, X_val, y_val, 
        {"max_iter": 1000, "random_state": 42}, 
        "LR Benchmark (U=0.5)") # Reutilizo la función de evaluación, pero paso los parámetros de LR
    
    # Evaluar LR con el umbral específico de 0.2
    lr_final = LogisticRegression(max_iter=1000, random_state=42)
    entrenar_y_evaluar_con_validacion("Logistic Regression (Umbral 0.2)", lr_final, X_a, y_a, X_val, y_val, threshold=0.2)

    # --- EXPERIMENTO BAGGING LOGISTIC REGRESSION ---
    ejecutar_experimento_bagging_lr(X_a, y_a, X_val, y_val)

    # --- EXPERIMENTO VOTING PERSONALIZADO ---
    ejecutar_experimento_voting(X_a, y_a, X_val, y_val)

    # --- EXPERIMENTO STACKING ENSEMBLE ---
    ejecutar_experimento_stacking(X_a, y_a, X_val, y_val)

    print(f"\n✅ Experimentos completados. Revisa '{path_resultado}'.")

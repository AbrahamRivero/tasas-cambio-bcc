# Esquema de reporte compartido

Los tres agentes (`security-agent`, `performance-agent`, `maintainability-agent`) devuelven su informe en el mismo esquema base. Esto es lo que permite que el agente orquestador los combine automáticamente en vez de tener que interpretar tres formatos distintos.

```yaml
agent: security | performance | maintainability
review_target: <PR/commit/rama revisada>
spec_found: true|false        # ¿existía spec.md/plan.md/constitution.md para verificar contra algo escrito?
coverage:
  checks_performed: []        # pasos de la metodología del agente que efectivamente se ejecutaron
  checks_not_applicable: []   # paso: razón por la que no aplicaba a este diff
  checks_not_possible: []     # paso: razón por la que no se pudo verificar (falta de acceso, falta de contexto)
findings:
  - id: <PREFIJO-NNN>         # SEC-001, PERF-001, MAINT-001
    severity: critical|high|medium|low|info
    category: <enum específico de cada agente, ver su AGENTS.md>
    locations: ["archivo:línea", "..."]
    description: <una frase>
    evidence: <fragmento de código o razonamiento>
    impact: <consecuencia concreta, no genérica>
    recommendation: <fix concreto>
    spec_reference: <opcional>
    confidence: high|medium|low
notes_for_other_agents: []    # observaciones fuera de su propio alcance, dirigidas a otro agente
summary:
  verdict: block|approve_with_comments|approve
  critical_count: N
  high_count: N
  top_priority: []            # ids de los hallazgos a resolver antes de mergear
  blind_spots: []             # obligatorio siempre, aunque esté vacío — decilo explícitamente
```

## Por qué `blind_spots` es el campo más importante

El guion que dio origen a este kit lo dice con otras palabras: **tener tres agentes no garantiza una buena revisión si uno de ellos falla en silencio.** Un agente que no pudo revisar algo y lo omite sin avisar es indistinguible, desde afuera, de un agente que sí lo revisó y no encontró nada. `blind_spots` existe para eliminar esa ambigüedad: cada agente está obligado a declarar qué no pudo comprobar, no solo qué encontró.

El agente orquestador (`orchestrator-agent/AGENTS.md`) depende de este campo para decidir si un veredicto "approve" es una garantía real o una garantía parcial.

## Adaptar esto a tu herramienta

Este AGENTS.md y los de cada agente están escritos como especificación neutral, para que los puedas usar de la forma que te convenga:

- **Como subagentes de Claude Code**: copiá el contenido de cada `AGENTS.md` dentro de un archivo en `.claude/agents/`, agregando al principio el frontmatter YAML que pide Claude Code (`name`, `description`, `tools`). El cuerpo de este documento se puede pegar tal cual como el prompt del subagente.
- **Como tres llamadas independientes a la API**: usá el contenido de cada archivo como system prompt de una llamada distinta, pasándole el diff/PR como mensaje de usuario.
- **Como tres jobs de CI en paralelo**: cada uno corre con su AGENTS.md como prompt fijo y el diff del PR como input; el orquestador corre después, cuando los tres terminaron (o cuando alguno falló — ver más abajo).

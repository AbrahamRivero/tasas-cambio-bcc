# Kit de revisión de código con 3 agentes especializados

Esto es lo que prometí en el post: las especificaciones completas de los tres agentes de revisión (seguridad, rendimiento, mantenibilidad) en vez de una única revisión genérica.

## Qué hay acá

```
agents-review-kit/
├── security-agent/AGENTS.md          # revisa AuthN/AuthZ, inyección, secretos, cripto, multitenancy...
├── performance-agent/AGENTS.md       # revisa complejidad, N+1, índices, concurrencia, escalabilidad...
├── maintainability-agent/AGENTS.md   # revisa SOLID, acoplamiento, patrones, cumplimiento del spec...
├── orchestrator-agent/AGENTS.md      # junta los tres informes y da un veredicto combinado (bonus)
└── _shared/report-schema.md          # el esquema de reporte común a los tres agentes
```

Cada `AGENTS.md` es una especificación completa e independiente: rol, alcance (qué revisa y qué explícitamente no), qué documentos busca antes de revisar, metodología paso a paso, clasificación de severidad, qué NO reportar (para evitar ruido) y el formato de salida exacto.

## Por qué estos tres y no una revisión única

Un único prompt de revisión tiende a devolver una respuesta genérica: nombres de variables, algún test, dividir una función. Con tres agentes especializados, cada uno tiene un mandato estrecho y una checklist específica de su dominio, así que no se diluyen entre sí. Seguridad no va a sugerir dividir una función, y mantenibilidad no va a evaluar si una query tiene índice.

## Cómo están pensados para funcionar juntos (spec-driven development)

Los tres agentes asumen que tu proyecto sigue —o puede seguir— spec-driven development: antes de revisar, cada uno busca un `spec.md`/`plan.md`/`constitution.md` con los requisitos y decisiones ya tomadas. Si existen, los usan como criterio de verdad (una violación del spec es un hallazgo Critical, no una opinión). Si no existen, cada agente lo declara explícitamente en su reporte en vez de inventar un criterio silencioso.

Los tres devuelven su informe en el mismo esquema (`_shared/report-schema.md`), con tres secciones obligatorias:

- **`checks_performed` / `checks_not_possible`** — qué comprobó, y qué no pudo comprobar y por qué.
- **`findings`** — qué encontró, con severidad, ubicación, evidencia y recomendación concreta.
- **`blind_spots`** — obligatorio siempre, aunque esté vacío. Es lo que evita que "no encontré nada" se confunda con "no pude revisarlo".

Ese último punto es el que hace que el sistema no dependa de que los tres agentes funcionen perfecto siempre: si uno falla o revisa con cobertura incompleta, queda registrado, no oculto.

## Cómo usarlos

Están escritos como especificación neutral para que los adaptes a la herramienta que ya usás:

1. **Claude Code (subagentes)**: creá un archivo por agente en `.claude/agents/` (por ejemplo `.claude/agents/security-reviewer.md`), agregá el frontmatter que pide Claude Code (`name`, `description`, `tools`) y pegá el contenido del `AGENTS.md` correspondiente como el cuerpo. Invocalos en paralelo sobre el mismo diff y pasale las tres salidas al agente orquestador.
2. **Tres llamadas a la API**: usá cada archivo como system prompt de una llamada distinta (podés incluso mandarlas como un lote con la Batch API, si procesás muchos PRs a la vez), con el diff como mensaje de usuario.
3. **CI**: un job por agente, en paralelo, sobre cada PR; el job del orquestador corre después y postea el veredicto combinado como comentario.

## Una aclaración importante

Como dice el guion: tener tres agentes no garantiza una buena revisión por sí solo. Lo que la garantiza es que cada agente declare honestamente los límites de lo que revisó. Si vas a adaptar estos archivos, no le quites esa parte — es la que hace que el sistema sea confiable en vez de solo parecerlo.

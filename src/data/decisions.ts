import type { DesignDecision } from "./types";

export const DECISIONS: DesignDecision[] = [
  {
    id: "workflow-as-loop",
    title: "Agent 的 agentic loop 本身就是一个 Workflow",
    context:
      "Agent 每发一条消息，都需要跑 ReAct 循环（LLM → Tool → LLM）直到模型不再调工具。这个循环必须支持中断（人审 tool call）、暂停（suspend 等外部事件）、恢复（resume）。",
    chose:
      "将 agentic 循环实现为两层嵌套 Workflow：外层 `createAgenticLoopWorkflow()` 控制迭代终止条件；内层 `createAgenticExecutionWorkflow()` 跑单次 LLM 调用 + 工具执行。最外层再套一个 prepare-stream workflow（加载 memory、解析 tools、跑 input processors）。一次 `agent.generate()` 在内部构造 3 层 workflow 实例。",
    rejected:
      "独立的 while(true) 循环实现（类似 LangChain 早期的 AgentExecutor）。简单直接，调试栈浅。",
    cost:
      "极高的内部复杂度——一次 generate() 调用栈深度是普通 loop 的 3-5 倍，step 命名/快照序列化/时间旅行全都走 workflow 那一套。换来的是 durable execution 作为一等公民：suspend/resume、human-in-the-loop approval、crash recovery 都是 workflow engine 免费提供的，Agent 代码本身不用重复实现。",
    affects: ["agent", "loop", "workflows", "tools"],
  },
  {
    id: "processor-pipeline",
    title: "Processor 作为显式中间件管线而非隐式 hook",
    context:
      "memory 注入、working memory、skills 提示、browser 上下文、response caching、structured output 这些横切关注点都需要在 LLM 调用前后介入。如果每个都硬编码进 Agent 类，会是 N 个 if 分支。",
    chose:
      "`Processor` 接口，7+ 个 lifecycle hooks（processInput / processLLMRequest / processLLMResponse / processOutput / computeStateSignal / processAPIError / processOutputStep），由 `ProcessorRunner` 按顺序执行。每个 hook 都可以修改 messages/model/tools。memory/caching/structured-output/skills/browser-context 都是内置 Processor 实现。Processor 本身可以是类实例，也可以是 Workflow（复用 DAG 能力）。",
    rejected:
      "简单的 before/after 双 hook 模型，或在 Agent 类里直接硬编码这些能力。",
    cost:
      "学习曲线陡——用户必须理解 7 个 hook 各自在什么时机触发、能改什么、先后顺序怎么排。换来的是精确的阶段控制和真正的可插拔：第三方可以发布自己的 Processor，而不用 fork Agent 类。",
    affects: ["processors", "agent", "loop"],
  },
  {
    id: "model-string-router",
    title: "Model Router 用字符串 \"provider/model-id\" 代替 model 实例",
    context:
      "用户要切模型时，每个 Agent 构造函数都传 `import { openai } from '@ai-sdk/openai'; model: openai('gpt-5')` 是 3 行样板，而且 gateway 代理、认证、多 provider fallback 都要用户自己接。",
    chose:
      "`model: 'openai/gpt-5'` 这种字符串配置。`ModelRouterLanguageModel` 在运行时查 `provider-registry.json`（~200+ 条 provider 映射），动态 import 对应 AI SDK provider，构造 LanguageModel 实例。Gateway 认证、API key 轮换、fallback 链都在 router 层做掉。",
    rejected:
      "强制用户手动 `import { openai } from '@ai-sdk/openai'` 并传入实例（裸 AI SDK 用法）。",
    cost:
      "需要维护一个不断膨胀的 provider-registry.json（每次 AI SDK 加新 provider 都要同步）；动态 import 带来冷启动成本；provider 特定参数要走 `modelOptions` 透传。换来的是极致的用户体验：一行字符串搞定一切配置，多模型路由零成本。",
    affects: ["llm", "agent"],
  },
  {
    id: "ai-sdk-indirection",
    title: "所有 AI SDK 依赖通过 @internal 包间接引用",
    context:
      "Vercel AI SDK 是 Mastra 的底层依赖，但它大版本（v4 → v5 → v6）不兼容，API 和类型都在动。如果 Mastra 直接 import 公开 API，每次 AI SDK 升级就是一次 break change。",
    chose:
      "包装一层 internal package（`@internal/ai-sdk-v4` / `@internal/ai-sdk-v5`），Mastra 代码只依赖 internal 包的稳定接口。同时支持多个 specificationVersion（v2/v3/v4 对应 AI SDK v5/v6 等），用户代码无感知。",
    rejected:
      "直接依赖 AI SDK 公开 API，跟随大版本升级。",
    cost:
      "多一层抽象和版本映射复杂度（内部代码里随处可见 `specificationVersion` 分支），但 Mastra 本身可以独立于 AI SDK 大版本演进——用户不用为了 Mastra 升级跟着改自己的 model 调用代码。",
    affects: ["llm", "loop"],
  },
  {
    id: "composite-storage",
    title: "Storage 采用 22+ 子域的复合接口而非单一 ORM",
    context:
      "Mastra 要持久化的东西五花八门：workflow 运行状态、对话 memory、agent 注册、eval score、blob、dataset、embedding、observability trace……它们的数据模型、查询模式、后端偏好（关系/键值/对象存储/向量库）完全不同。",
    chose:
      "`MastraCompositeStore` 把存储拆成 22 个独立子域接口（WorkflowsStorage / MemoryStorage / AgentsStorage / ScoresStorage / BlobsStorage / DatasetsStorage / ...），每个域独立实现。默认全部用 InMemoryStore 零配置可用，生产环境可以任意混搭（workflow 状态用 Postgres、blob 用 S3、memory 用 Redis、vector 用 Pinecone）。",
    rejected:
      "统一的 SQL/ORM 层（所有状态塞关系库），或单一 key-value 抽象。",
    cost:
      "接口面积巨大（types.ts 3086 行，整个 core 最大的类型文件），每新增功能都要扩展子域接口并给 InMemory 实现加一份。换来的是后端任意组合的自由，以及默认零配置启动（InMemoryStore 对应用户和测试场景非常友好）。",
    affects: ["storage", "mastra", "workflows"],
  },
];

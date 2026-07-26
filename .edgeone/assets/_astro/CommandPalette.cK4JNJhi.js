import{j as o}from"./jsx-runtime.D_zvdyIk.js";import{r as s}from"./index.BzIk-23d.js";import{F as y}from"./file-code.DahJlKep.js";import{H as S,B as x,G as b,C as T}from"./house.DAkMBW7c.js";import{c as v}from"./createLucideIcon.Dl5zD0dF.js";/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]],A=v("Search",M),C=[{id:"agent",name:"agent",role:"Agent 类封装一个有 instructions、model、tools、memory 的 AI 对话体，提供 generate()/stream()/streamUntilIdle()/resume()/network() 等执行入口。内部通过 prepare-stream workflow（位于 agent/workflows/）编排 memory 加载、工具解析、input processors，再委托给 llm + loop 跑 agentic 循环。框架的主角，也是最大的模块。",totalLoc:41079,keyFiles:[{path:"agent/agent.ts",loc:9408,purpose:"Agent 主类（整个 core 最大的单文件）"},{path:"agent/types.ts",loc:1200,purpose:"Agent option/result 类型"},{path:"agent/agent.types.ts",loc:620,purpose:"Execution options、delegation hooks、network options"},{path:"agent/agent-legacy.ts",loc:1529,purpose:"MastraLLMV1 旧版路径"},{path:"agent/thread-stream-runtime.ts",loc:2023,purpose:"subscribeToThread 用的 thread-scoped stream runtime"},{path:"agent/trip-wire.ts",loc:90,purpose:"TripWire abort 机制（token/cost/step 限制）"},{path:"agent/signals.ts",loc:590,purpose:"Agent signal 类型/创建"},{path:"agent/durable/durable-agent.ts",loc:2800,purpose:"DurableAgent 类（可持久化恢复的 agent）"},{path:"agent/workflows/prepare-stream/index.ts",loc:196,purpose:"createPrepareStreamWorkflow 工厂"},{path:"agent/workflows/prepare-stream/prepare-memory-step.ts",loc:226,purpose:"memory 加载 step"},{path:"agent/workflows/prepare-stream/prepare-tools-step.ts",loc:83,purpose:"工具转换 step"},{path:"agent/workflows/prepare-stream/map-results-step.ts",loc:415,purpose:"把 LLM 输出映射成 MastraModelOutput"},{path:"agent/message-list/",loc:0,purpose:"子目录：MessageList、消息转换、prompt 构造、detection"},{path:"agent/durable/workflows/",loc:0,purpose:"子目录：durable agent 的 workflow steps（goal、tool-call、llm-execution 等）"}],keyExports:[{name:"Agent",kind:"class",description:"核心类（generate/stream/streamUntilIdle/resume/network/approveNetworkToolCall/declineNetworkToolCall 等全套 API）"},{name:"TripWire",kind:"class",description:"安全断路器（token/cost/step 限制）"},{name:"MessageList",kind:"class",description:"消息管理器，含 AI SDK v4/v5 格式互转"},{name:"TypeDetector",kind:"class",description:"内容类型检测"},{name:"DurableAgent",kind:"class",description:"可持久化/恢复的 agent（从 @mastra/core/agent/durable 单独导入）"},{name:"AgentConfig",kind:"type",description:"Agent 构造参数类型"},{name:"AgentExecutionOptions",kind:"type",description:"执行选项类型"},{name:"NetworkOptions",kind:"type",description:"Agent network（多 agent 协作）配置"},{name:"SubAgent",kind:"type",description:"子 agent 类型"}],internalImports:["mastra","llm","loop","memory","tools","workflows","processors","storage","events","observability","stream","workspace","signals","background-tasks","notifications","auth","browser","channels","evals","action","schema","skills","request-context","voice","logger"],sourceNotes:"agent.ts 9408 行是整个 core 最大单文件，但实际执行逻辑大量委托出去：prepare-stream workflow（agent/workflows/prepare-stream/）在每次调用时构造，加载 memory、解析 tools、跑 input processors；真正的 LLM 循环交给 llm/model/model.loop.ts 里的 MastraLLMVNext → loop()。读 Agent 时重点看 agent.ts 里的 #execute() 私有方法和 generate()/stream() 如何构造 prepare-stream。另外注意：Agent 没有顶层 approve()/decline()，人审接口在 agent-controller（session approval）和 approveNetworkToolCall/declineNetworkToolCall（network 场景）。",relatedDecisions:["workflow-as-loop","processor-pipeline","model-string-router"],topFiles:["agent/agent.ts","agent/workflows/prepare-stream/","agent/subagent.ts"],codeSnippets:[{title:"Agent 私有属性 — 能力聚合器的全貌",file:"agent/agent.ts",code:`export class Agent<TAgentId, TTools, TOutput, TRequestContext, TEditor>
  extends MastraBase
  implements SubAgent<TAgentId, TRequestContext>
{
  public id: TAgentId;
  public name: string;
  #instructions: DynamicArgument<AgentInstructions, TRequestContext>;
  model: DynamicArgument<MastraModelConfig | ModelWithRetries[], TRequestContext> | ModelFallbacks;
  #mastra?: Mastra;
  #memory?: DynamicArgument<MastraMemory, TRequestContext>;
  #skills?: AgentSkillsInput<TRequestContext>;
  #workflows?: DynamicArgument<Record<string, AnyWorkflow>, TRequestContext>;
  #tools: DynamicArgument<TTools, TRequestContext>;
  #hooks?: ToolHooks;
  #scorers: DynamicArgument<MastraScorers, TRequestContext>;
  #agents: DynamicArgument<Record<string, SubAgent<string, TRequestContext>>, TRequestContext>;
  #inputProcessors?: DynamicArgument<InputProcessorOrWorkflow[], TRequestContext>;
  #outputProcessors?: DynamicArgument<OutputProcessorOrWorkflow[], TRequestContext>;
  #backgroundTasks?: AgentBackgroundConfig;
  #signals?: SignalProvider[];
  #goal?: GoalConfig;
  #toolPayloadTransform?: ToolPayloadTransformPolicy;
}`,explanation:"几乎每个属性都使用 DynamicArgument<T, TRequestContext> 类型——所有配置都可以是静态值或根据请求上下文动态计算的函数。这是 Mastra 支持 multi-tenant 场景的核心设计。"},{title:"Agent 构造函数 — 声明式配置 + 运行时注入",file:"agent/agent.ts",code:`constructor(config: AgentConfig<TAgentId, TTools, TOutput, TRequestContext, TEditor>) {
  super({ component: RegisteredLogger.AGENT, rawConfig: config.rawConfig });
  this.#config = config;
  this.name = config.name;
  this.id = config.id ?? config.name;
  this.source = 'code';
  this.#instructions = config.instructions ?? '';

  if (!config.model) {
    throw new MastraError({
      id: 'AGENT_CONSTRUCTOR_MODEL_REQUIRED',
      domain: ErrorDomain.AGENT,
      category: ErrorCategory.USER,
      details: { agentName: config.name },
      text: \`LanguageModel is required to create an Agent.\`,
    });
  }

  if (Array.isArray(config.model)) {
    this.model = config.model.map(mdl =>
      Agent.toFallbackEntry(mdl, config?.maxRetries ?? 0)
    ) as ModelFallbacks;
  }
}`,explanation:"Agent 是整个框架最核心的抽象。model 支持数组形式实现自动 fallback——框架级模型容错设计。"}],subStructure:`agent/
├── agent.ts              ← 9408L 主类（generate/stream/resume）
├── types.ts              ← AgentConfig、AgentResult 类型
├── trip-wire.ts          ← TripWire abort 机制
├── signals.ts            ← Agent signal 系统
├── durable/
│   ├── durable-agent.ts  ← 可持久化恢复的 Agent
│   └── workflows/        ← durable agent 内部 workflow steps
├── workflows/
│   └── prepare-stream/   ← 每次调用构造的 prepare workflow
│       ├── index.ts      ← createPrepareStreamWorkflow 工厂
│       ├── prepare-memory-step.ts
│       ├── prepare-tools-step.ts
│       └── map-results-step.ts
└── message-list/         ← MessageList、消息转换、prompt 构造`},{id:"mastra",name:"mastra",role:"Mastra 类是全局 DI 容器和注册中心，负责注册/连接所有 primitives（agents、tools、workflows、MCP servers、memory、vectors、scorers、channels、gateways 等），管理 worker/scheduler 生命周期，提供运行时服务发现。框架的入口和大管家。",totalLoc:6210,keyFiles:[{path:"mastra/index.ts",loc:5870,purpose:"Mastra 类 + Config 类型（不是纯 barrel，5870 行全在这里）"},{path:"mastra/hooks.ts",loc:177,purpose:"createOnScorerHook helper"},{path:"mastra/run-scope.ts",loc:90,purpose:"createRunScope、RunScope 类型"},{path:"mastra/mastra-ctor-holder.ts",loc:31,purpose:"内部 holder，避免循环依赖"}],keyExports:[{name:"Mastra",kind:"class",description:"核心容器（getAgent/addAgent/getWorkflow/addWorkflow/getTool/getVector/getStorage/getLogger/startWorkers/shutdown 等）"},{name:"Config",kind:"interface",description:"Mastra 构造函数配置（泛型参数：TAgents/TWorkflows/TVectors/TTools/TMemory/...）"},{name:"MastraRecoveryConfig",kind:"interface",description:"durableAgents 恢复配置"}],internalImports:["agent","agent-controller","background-tasks","cache","channels","datasets","deployer","editor","error","evals","events","hooks","license","llm","logger","mcp","memory","notifications","observability","processors","schedules","server","storage","tools","tts","vector","worker","workflows","workspace","bundler","tool-loop-agent"],sourceNotes:"Mastra 类在 index.ts 里是个 5870 行的大类，但绝大多数方法是注册/查找（getAgent、addAgent、listAgents、getWorkflow...）。执行期 primitives 通过 request-context 反向拿到 Mastra 实例（di/RequestContext），所以运行时依赖是反的。它主要是注册期的大管家 + 后台服务（worker、scheduler、server）的宿主。顶层 @mastra/core 只 re-export Mastra 和 Config，其他都走子路径（@mastra/core/agent 等）。",relatedDecisions:["composite-storage"],topFiles:["mastra/mastra.ts","mastra/index.ts"],codeSnippets:[{title:"Mastra Config 接口 — 框架的控制面板",file:"mastra/index.ts",code:`export interface Config<
  TAgents extends Record<string, Agent<any>>,
  TWorkflows extends Record<string, AnyWorkflow>,
  TVectors extends Record<string, MastraVector<any>>,
  TTTS extends Record<string, MastraTTS>,
  TLogger extends IMastraLogger,
  TMCPServers extends Record<string, MCPServerBase<any>>,
  TScorers extends Record<string, MastraScorer<any, any, any, any>>,
  TTools extends Record<string, ToolAction<any, any, any, any, any, any>>,
  TProcessors extends Record<string, Processor<any>>,
  TMemory extends Record<string, MastraMemory>,
  TChannels extends Record<string, ChannelProvider>,
> {
  agents?: { [K in keyof TAgents]: TAgents[K] | ToolLoopAgentLike | DurableAgentLike };
  storage?: MastraCompositeStore;
  vectors?: TVectors;
  logger?: TLogger | false;
  workflows?: TWorkflows;
  observability?: ObservabilityEntrypoint;
  mcpServers?: TMCPServers;
  gateways?: Record<string, MastraModelGatewayInterface>;
  scheduler?: SchedulerConfig;
  backgroundTasks?: BackgroundTaskManagerConfig;
  // ... 15+ more optional fields
}`,explanation:"Mastra 类通过这个 Config 接口扮演 IoC 容器角色——所有子系统（agent, workflow, storage, vector, observability, scheduler）都在此注册。11 个泛型参数确保类型安全。"},{title:"PubSub Proxy — 内部事件路由优化",file:"mastra/index.ts",code:`get pubsub(): PubSub {
  if (!this.#pubsubProxy) {
    const raw = this.#pubsub;
    this.#pubsubProxy = new Proxy(raw, {
      get(target, prop, _receiver) {
        if (prop === 'publish') {
          return function publish(topic: string, event: Omit<Event, 'id' | 'createdAt'>) {
            // Internal execution-workflows are run-scoped:
            // only the owning instance needs their events.
            // Pass localOnly to avoid serialising 9 MB+ stepResults
            // across the unix socket.
            if (topic === 'workflows' || topic === 'workflows-finish') {
              // ... ownership check logic
            }
          };
        }
      },
    });
  }
  return this.#pubsubProxy;
}`,explanation:"多 Mastra 实例可通过 PubSub 协作，但框架自动优化内部 workflow 事件路由——避免序列化 9MB+ 的 stepResults blob。生产级关键优化。"}]},{id:"workflows",name:"workflows",role:"声明式 DAG 工作流引擎。提供 step/then/branch/parallel/forEach/loop/sleep 等组合子，支持 suspend/resume、time-travel、snapshot 持久化、event-sourced 执行。既用于用户自定义流程，也是 Agent agentic loop（三层嵌套 workflow）的底层执行容器。",totalLoc:19510,keyFiles:[{path:"workflows/workflow.ts",loc:4400,purpose:"Workflow 主类 + Step 工厂（createStep）+ Run 类 + mapVariable"},{path:"workflows/default.ts",loc:1174,purpose:"DefaultExecutionEngine（pull-based step 执行）"},{path:"workflows/types.ts",loc:1183,purpose:"Workflow 类型（ExecutionEngine、OutputWriter、StepFlowEntry...）"},{path:"workflows/handlers/control-flow.ts",loc:1378,purpose:"branch/loop/foreach/parallel 控制流 handler"},{path:"workflows/handlers/entry.ts",loc:791,purpose:"entry step handler"},{path:"workflows/handlers/step.ts",loc:649,purpose:"普通 step handler"},{path:"workflows/evented/workflow.ts",loc:2369,purpose:"Evented Workflow（push-based，实时事件处理）"},{path:"workflows/evented/workflow-event-processor/index.ts",loc:2966,purpose:"主事件 processor 循环"},{path:"workflows/create.ts",loc:115,purpose:"createWorkflow() 工厂（内部使用）"},{path:"workflows/step.ts",loc:193,purpose:"Step 类型/构造器"}],keyExports:[{name:"Workflow",kind:"class",description:"工作流定义 & 运行入口（then/branch/parallel/foreach/loop/commit/execute/stream/watch）"},{name:"createStep",kind:"function",description:"步骤工厂（5 个重载）"},{name:"createWorkflow",kind:"function",description:"简洁工厂函数"},{name:"DefaultExecutionEngine",kind:"class",description:"默认 pull-based DAG 执行引擎"},{name:"Run",kind:"class",description:"单次 workflow run"},{name:"mapVariable",kind:"function",description:"变量映射（step 间数据传递）"},{name:"WorkflowRunState",kind:"type",description:"运行状态类型"},{name:"WorkflowResult",kind:"type",description:"结果类型"}],internalImports:["agent","auth","di","error","events","llm","logger","mastra","observability","processors","schema","storage","stream","tools","types","action","evals"],sourceNotes:"Workflow 本身不内置 LLM 概念，但和 Agent/loop 的耦合极深：Agentic Loop 的每轮迭代就是一次 Workflow 执行。两套引擎并存：DefaultExecutionEngine（pull-based，传统 workflow 用）和 evented/（push-based，实时事件处理）。Step 可以是普通函数、LLM step、或另一个 Workflow，这是 agentic-loop > agentic-execution 嵌套的基础。读源码时 workflow.ts 4400 行是入口，但真正的执行流程在 handlers/ 和 evented/workflow-event-processor/ 里。",relatedDecisions:["workflow-as-loop"],topFiles:["workflows/workflow.ts","workflows/engine/execution-engine.ts"],codeSnippets:[{title:"createStep 多态重载 — 万物皆 Step",file:"workflows/workflow.ts",code:`export function createStep(params: any, agentOrToolOptions?: any): Step<any> {
  if (isAgentCompatible(params)) {
    return createStepFromAgent(params, agentOrToolOptions);
  }
  if (isToolStep(params)) {
    return createStepFromTool(params, agentOrToolOptions);
  }
  if (isStepParams(params)) {
    return createStepFromParams(params);
  }
  if (isProcessor(params)) {
    const step = createStepFromProcessor(params);
    step.providesSkillDiscovery = params.providesSkillDiscovery;
    return step;
  }
  throw new Error('Invalid input: expected StepParams, Agent, ToolStep, or Processor');
}`,explanation:"createStep 是 workflow 系统的统一入口——Agent、Tool、Processor、自定义 StepParams 都被包装成 Step。这是 'Agent as Step' / 'Tool as Step' 的实现基础。"},{title:"Workflow 类定义 — 自身实现 Step 接口",file:"workflows/workflow.ts",code:`export class Workflow<TEngineType, TSteps, TWorkflowId, TState, TInput, TOutput, TPrevSchema, TRequestContext>
  extends MastraBase
  implements Step<TWorkflowId, TState, TInput, TOutput | undefined, any, any, DefaultEngineType, TRequestContext>
{
  public id: TWorkflowId;
  public inputSchema: StandardSchemaWithJSON<TInput>;
  public outputSchema: StandardSchemaWithJSON<TOutput>;
  public steps: Record<string, StepWithComponent>;
  public committed: boolean = false;
  protected stepFlow: StepFlowEntry<TEngineType>[];
  protected executionEngine: ExecutionEngine;
  #runs: Map<string, Run<TEngineType, TSteps, TState, TInput, TOutput, TRequestContext>> = new Map();
}`,explanation:"Workflow 本身实现了 Step 接口（implements Step），workflow 可以嵌套为其他 workflow 的步骤——这是 agentic-loop > agentic-execution 嵌套的基础。"}],subStructure:`workflows/
├── workflow.ts           ← 4400L 主类 + createStep + Run
├── default.ts            ← DefaultExecutionEngine（pull-based）
├── types.ts              ← ExecutionEngine、StepFlowEntry 类型
├── create.ts             ← createWorkflow() 工厂
├── step.ts               ← Step 类型/构造器
├── handlers/
│   ├── control-flow.ts   ← branch/loop/foreach/parallel
│   ├── entry.ts          ← entry step handler
│   └── step.ts           ← 普通 step handler
└── evented/
    ├── workflow.ts        ← Evented Workflow（push-based）
    └── workflow-event-processor/
        └── index.ts       ← 主事件 processor 循环`},{id:"loop",name:"loop",role:"Agentic 执行循环：实现 ReAct 式迭代（LLM 推理 → 工具调用 → 结果注入 → 下一轮）。整个循环被建模为两层嵌套 Workflow（agentic-loop 外层 > agentic-execution 单轮），由 workflowLoopStream() 驱动 ReadableStream，支持 suspend/resume、structured output、goal evaluation、background task 检查。顶层入口是 loop() 函数和 networkLoop()（多 agent 网络）。",totalLoc:12149,keyFiles:[{path:"loop/loop.ts",loc:177,purpose:"loop() 顶层入口函数，构造 MastraModelOutput 流"},{path:"loop/workflows/stream.ts",loc:378,purpose:"workflowLoopStream() — 驱动 agentic loop 的 ReadableStream"},{path:"loop/workflows/agentic-loop/index.ts",loc:317,purpose:"createAgenticLoopWorkflow() 外层循环（迭代直到 done）"},{path:"loop/workflows/agentic-execution/index.ts",loc:139,purpose:"createAgenticExecutionWorkflow() 单轮迭代"},{path:"loop/workflows/agentic-execution/llm-execution-step.ts",loc:2192,purpose:"LLM 调用 step（最大执行 step 文件）"},{path:"loop/workflows/agentic-execution/tool-call-step.ts",loc:1303,purpose:"工具调用 step（含 foreach 并发）"},{path:"loop/workflows/agentic-execution/llm-mapping-step.ts",loc:576,purpose:"LLM 输出映射 step"},{path:"loop/workflows/agentic-execution/goal-step.ts",loc:511,purpose:"Goal 检查 step"},{path:"loop/network/index.ts",loc:2716,purpose:"networkLoop() — 多 agent 网络执行"},{path:"loop/network/validation.ts",loc:824,purpose:"Network 校验/配置"},{path:"loop/shared/stream-until-idle-helpers.ts",loc:517,purpose:"streamUntilIdle helpers"}],keyExports:[{name:"loop",kind:"function",description:"顶层入口函数，接受 LoopOptions，返回 MastraModelOutput 流"},{name:"networkLoop",kind:"function",description:"多 agent 网络执行（被 Agent.network() 调用）"},{name:"createAgenticLoopWorkflow",kind:"function",description:"外层循环 workflow（迭代终止条件控制）"},{name:"createAgenticExecutionWorkflow",kind:"function",description:"单次迭代 workflow（LLM + tool calls + mapping）"},{name:"ReasoningLevel",kind:"type",description:"Reasoning 等级类型"}],internalImports:["workflows","stream","processors","observability","error","logger","mastra","tools","schema"],sourceNotes:"理解 Mastra 执行模型的关键模块。注意：createPrepareStreamWorkflow 不在 loop/ 下，而在 agent/workflows/prepare-stream/。loop.ts 本身只有 177 行，真正逻辑在 workflows/ 子目录。agentic-execution 单轮的 step 顺序是：llmExecutionStep → map-tool-calls → foreach(toolCallStep) → llmMappingStep → backgroundTaskCheckStep → signalDrainStep → isTaskCompleteStep → goalStep。loop() 只依赖 stream/processors/observability 等少数模块，不直接依赖 agent/——反向依赖由 llm/model.loop.ts（MastraLLMVNext）桥接。",relatedDecisions:["workflow-as-loop","processor-pipeline"],topFiles:["loop/index.ts","loop/agentic-loop-workflow.ts"],codeSnippets:[{title:"Agentic Execution Workflow — 单轮迭代 DAG",file:"loop/workflows/agentic-execution/index.ts",code:`return createWorkflow({
  id: AGENTIC_EXECUTION_WORKFLOW_ID,
  inputSchema: llmIterationOutputSchema,
  outputSchema: llmIterationOutputSchema,
  options: {
    shouldPersistSnapshot: params => {
      return params.workflowStatus === 'pending' ||
             params.workflowStatus === 'paused' ||
             params.workflowStatus === 'suspended';
    },
    pruneSnapshot: pruneAgentLoopSnapshot,
    validateInputs: false,
  },
})
  .then(llmExecutionStep)        // 1. 调用 LLM
  .map(async ({ inputData }) => { // 2. 提取 tool calls
    const toolCalls = inputData.output.toolCalls || [];
    return toolCalls;
  }, { id: 'map-tool-calls' })
  .foreach(toolCallStep, toolCallForeachOptions) // 3. 并行执行 tool calls
  .then(llmMappingStep)           // 4. 把结果映射回来
  .then(backgroundTaskCheckStep)  // 5. 检查后台任务
  .then(signalDrainStep)          // 6. 处理信号
  .then(isTaskCompleteStep)       // 7. 判断任务是否完成
  .then(goalStep)                 // 8. 目标评估
  .commit();`,explanation:"Agent 的 think → act → observe 循环不是 while 循环，而是完整的 Workflow DAG。三个关键优势：(1) 每步可 suspend/resume；(2) tool calls 可并行 foreach；(3) 整个流程可观测。"},{title:"Agentic Loop 的 dowhile 循环",file:"loop/workflows/agentic-loop/index.ts",code:`return createWorkflow({
  id: 'agentic-loop',
  inputSchema: llmIterationOutputSchema,
  outputSchema: llmIterationOutputSchema,
  options: {
    shouldPersistSnapshot: params => {
      return params.workflowStatus === 'pending' ||
             params.workflowStatus === 'paused' ||
             params.workflowStatus === 'suspended';
    },
    pruneSnapshot: pruneAgentLoopSnapshot,
    validateInputs: false,
  },
})
  .dowhile(agenticExecutionWorkflow, async ({ inputData }) => {
    // 每次迭代后判断是否继续循环
    // 检查 stopWhen、maxSteps、pending signals 等条件
  })
  .commit();`,explanation:"用 workflow 的 .dowhile() 原语实现 Agent 多轮迭代。内层是 Execution Workflow（单轮），外层用 dowhile 控制循环。可在任何 iteration 之间 suspend 整个 Agent 运行到数据库。"}],subStructure:`loop/
├── loop.ts                     ← 177L 顶层入口函数
├── workflows/
│   ├── stream.ts               ← workflowLoopStream() 驱动流
│   ├── agentic-loop/
│   │   └── index.ts            ← 外层 dowhile 循环
│   └── agentic-execution/
│       ├── index.ts            ← 单轮 DAG 定义
│       ├── llm-execution-step.ts  ← 2192L LLM 调用
│       ├── tool-call-step.ts   ← 1303L 工具执行
│       ├── llm-mapping-step.ts ← 输出映射
│       └── goal-step.ts        ← 目标评估
├── network/
│   ├── index.ts                ← networkLoop() 多 agent 网络
│   └── validation.ts           ← 网络配置校验
└── shared/
    └── stream-until-idle-helpers.ts`},{id:"processors",name:"processors",role:"可插拔中间件管线。Processor 接口有 10+ 个 lifecycle hooks（processInput/processLLMRequest/processLLMResponse/processOutput/processAPIError/computeStateSignal 等），由 ProcessorRunner 编排执行顺序。memory、working-memory、semantic-recall、skills、response-cache、structured-output、tool-search、PII detection、moderation 等 24 个横切能力全部是内置 Processor 实现。",totalLoc:14046,keyFiles:[{path:"processors/index.ts",loc:890,purpose:"定义 Processor 接口、BaseProcessor、所有 context/args 类型，re-export 内置 processors"},{path:"processors/runner.ts",loc:2293,purpose:"ProcessorRunner — 编排多个 processor 调用顺序（核心执行器）"},{path:"processors/step-schema.ts",loc:640,purpose:"Processor step 的 Zod schemas"},{path:"processors/processors/structured-output.ts",loc:394,purpose:"StructuredOutputProcessor"},{path:"processors/processors/response-cache.ts",loc:505,purpose:"ResponseCache + buildResponseCacheKey"},{path:"processors/processors/tool-search.ts",loc:654,purpose:"ToolSearchProcessor"},{path:"processors/processors/pii-detector.ts",loc:1023,purpose:"PIIDetector"},{path:"processors/processors/moderation.ts",loc:466,purpose:"ModerationProcessor"},{path:"processors/processors/prompt-injection-detector.ts",loc:409,purpose:"PromptInjectionDetector"},{path:"processors/memory/message-history.ts",loc:323,purpose:"MessageHistory processor"},{path:"processors/memory/working-memory.ts",loc:282,purpose:"WorkingMemory processor"},{path:"processors/memory/semantic-recall.ts",loc:691,purpose:"SemanticRecall processor"}],keyExports:[{name:"Processor",kind:"interface",description:"处理器接口（10+ lifecycle hooks）"},{name:"BaseProcessor",kind:"class",description:"抽象基类"},{name:"ProcessorRunner",kind:"class",description:"管线执行器"},{name:"StructuredOutputProcessor",kind:"class",description:"结构化输出（注入 response_format）"},{name:"ResponseCache",kind:"class",description:"LLM 响应缓存"},{name:"MessageHistory",kind:"class",description:"对话历史注入"},{name:"WorkingMemory",kind:"class",description:"工作记忆"},{name:"SemanticRecall",kind:"class",description:"语义召回"},{name:"SkillsProcessor",kind:"class",description:"Skill 提示注入"},{name:"ToolSearchProcessor",kind:"class",description:"工具检索（动态选择工具）"},{name:"CostGuardProcessor",kind:"class",description:"成本保护"},{name:"TokenLimiterProcessor",kind:"class",description:"Token 限制"},{name:"PIIDetector",kind:"class",description:"PII 检测"},{name:"ModerationProcessor",kind:"class",description:"内容审核"},{name:"PromptInjectionDetector",kind:"class",description:"Prompt 注入检测"},{name:"InputProcessorOrWorkflow",kind:"type",description:"Processor 实例或 Workflow 都可作为 input processor"},{name:"OutputProcessorOrWorkflow",kind:"type",description:"同上，output 侧"}],internalImports:["agent","llm","memory","mastra","observability","request-context","schema","stream","workflows","tools","signals"],sourceNotes:"Processor 接口定义在 index.ts 本身（不是单独的 types 文件），890 行。10+ 个 hooks 分阶段：processInput/processLLMRequest（请求侧）、processLLMResponse/processOutput/processOutputStream（响应侧）、processAPIError（错误处理）、computeStateSignal（状态信号）、processInputStep/processOutputStep（step 粒度）、processDataParts（流数据处理）。Processor 本身可以是类实例或 Workflow（复用 DAG 能力）。读源码时先从内置 processor 反向理解接口比直接看 interface 更直观——24 个内置 processor 都在 processors/processors/ 和 processors/memory/ 下。",relatedDecisions:["processor-pipeline"],topFiles:["processors/index.ts","processors/runner.ts"],codeSnippets:[{title:"ProcessorContext — 中间件能力集",file:"processors/index.ts",code:`export interface ProcessorContext<TTripwireMetadata = unknown>
  extends Partial<ObservabilityContext> {
  abort: (reason?: string, options?: TripWireOptions<TTripwireMetadata>) => never;
  requestContext?: RequestContext;
  agent?: Agent<any, any, any, any>;
  sendSignal?: (signal: AgentSignalInput) => Promise<CreatedAgentSignal>;
  sendStateSignal?: (signal: AgentStateSignalInput) => Promise<CreatedAgentSignal | ApplyStateSignalResult>;
  retryCount: number;
  writer?: ProcessorStreamWriter;
  abortSignal?: AbortSignal;
}`,explanation:"Processor 是 Mastra 的中间件管道。abort() 支持 TripWire 硬中断；sendSignal 支持 Agent 信号系统；writer 支持向流中注入自定义 chunk；retryCount 支持自动重试。"}]},{id:"llm",name:"llm",role:"模型层抽象：统一多 provider 模型访问（OpenAI/Anthropic/Google/Azure 等）。核心是 ModelRouterLanguageModel——把 'provider/model-id' 字符串在运行时解析为 AI SDK LanguageModel 实例，查 PROVIDER_REGISTRY（~200 provider 映射），支持 gateway 认证（Mastra/Netlify/ModelsDev/Azure）、fallback 策略、embedding router。MastraLLMVNext（不导出，agent 直接 import）是桥接 Agent → loop() 的胶水。",totalLoc:12817,keyFiles:[{path:"llm/index.ts",loc:187,purpose:"barrel export"},{path:"llm/model/router.ts",loc:608,purpose:"ModelRouterLanguageModel — provider/model-id 字符串解析"},{path:"llm/model/model.loop.ts",loc:382,purpose:"MastraLLMVNext — 桥接 Agent → loop()，不导出"},{path:"llm/model/model.ts",loc:1055,purpose:"MastraLLMV1（旧版 AI SDK v4 路径）"},{path:"llm/model/provider-registry.ts",loc:930,purpose:"PROVIDER_REGISTRY(Proxy)、GatewayRegistry 类、parseModelString"},{path:"llm/model/provider-registry.json",loc:0,purpose:"静态 provider 数据（JSON）"},{path:"llm/model/provider-types.generated.d.ts",loc:5137,purpose:"生成的 provider 类型声明"},{path:"llm/model/resolve-model.ts",loc:139,purpose:"resolveModelConfig()"},{path:"llm/model/embedding-router.ts",loc:289,purpose:"ModelRouterEmbeddingModel"},{path:"llm/model/gateways/azure.ts",loc:626,purpose:"AzureOpenAIGateway"},{path:"llm/model/gateways/models-dev.ts",loc:422,purpose:"ModelsDevGateway"},{path:"llm/model/aisdk/v7/model.ts",loc:251,purpose:"AI SDK v7 model wrapper"}],keyExports:[{name:"ModelRouterLanguageModel",kind:"class",description:'"provider/model-id" 字符串解析为 LanguageModel'},{name:"GatewayRegistry",kind:"class",description:"Gateway 认证 & provider 注册"},{name:"PROVIDER_REGISTRY",kind:"const",description:"provider 注册表（Proxy 包装）"},{name:"parseModelString",kind:"function",description:"解析 provider/model-id 字符串"},{name:"resolveModelConfig",kind:"function",description:"动态模型配置解析"},{name:"MastraGateway",kind:"class",description:"Mastra 托管 gateway"},{name:"NetlifyGateway",kind:"class",description:"Netlify gateway"},{name:"AzureOpenAIGateway",kind:"class",description:"Azure OpenAI gateway"},{name:"ModelRouterEmbeddingModel",kind:"class",description:"Embedding router"},{name:"MastraLLMVNext",kind:"class",description:"Agent → loop() 的胶水（不导出，agent 直接 import）"},{name:"LanguageModel",kind:"type",description:"MastraLanguageModel 别名"}],internalImports:["loop","stream","observability","error","mastra","action","schema","utils"],sourceNotes:"关键理解点：MastraLLMVNext（model.loop.ts）虽然在 llm/ 下但不从 llm/index.ts 导出，agent/agent.ts 直接 import 它。这个类包装 AI SDK LanguageModel，但把 doStream 路由进 Mastra 自己的 loop()，而不是直接调 AI SDK——这是 agent.generate() 最终跑三层 workflow 的入口。router.ts 的 ModelRouterLanguageModel 做字符串解析和 provider 动态 import（冷启动成本来源）。gateway 认证、API key 轮换、fallback 链都在 router/gateway 层。注意 llm/ 还同时支持 AI SDK v4/v5/v6/v7（aisdk/ 子目录各版本 wrapper）。",relatedDecisions:["model-string-router","ai-sdk-indirection"],topFiles:["llm/llm.ts","llm/model-router.ts"],codeSnippets:[{title:"ModelRouterLanguageModel — 统一模型路由",file:"llm/model/router.ts",code:`export class ModelRouterLanguageModel implements MastraLanguageModelV2 {
  readonly specificationVersion = 'v2' as const;
  readonly supportsStructuredOutputs = true;
  readonly modelId: string;
  readonly provider: string;
  readonly gatewayId: string;
  private gateway: MastraModelGatewayInterface;
  #manager: GatewayManager;

  constructor(config: ModelRouterModelId | OpenAICompatibleConfig, customGateways?: MastraModelGatewayInterface[]) {
    let normalizedConfig: { id: \`\${string}/\${string}\`; url?: string; apiKey?: string; };
    if (typeof config === 'string') {
      normalizedConfig = { id: config as \`\${string}/\${string}\` };
    } else if ('providerId' in config && 'modelId' in config) {
      normalizedConfig = {
        id: \`\${config.providerId}/\${config.modelId}\` as \`\${string}/\${string}\`,
        url: config.url, apiKey: config.apiKey,
      };
    }
    this.#manager = new GatewayManager([...(customGateways ?? []), ...defaultGateways]);
    const resolved = this.#manager.resolveModelId(normalizedConfig.id);
    this.gateway = resolved.gateway;
    this.gatewayId = resolved.gatewayId;
    this.provider = resolved.providerId || 'openai-compatible';
    this.modelId = normalizedConfig.id;
  }
}`,explanation:"用户只需写 'openai/gpt-5' 或 'anthropic/claude-4' 字符串 ID，框架通过 GatewayManager 自动解析出正确的 provider、认证方式和 API endpoint。支持 150+ 个 provider。"}]},{id:"storage",name:"storage",role:"多域复合存储抽象。MastraCompositeStore 把存储拆成 22+ 个独立子域接口（workflows/memory/agents/scores/blobs/datasets/observability/thread-state/mcp-servers/...），每个子域可独立实现。默认 InMemoryStore 零配置可用；生产环境可以任意混搭后端（workflow 状态用 Postgres、blob 用 S3、memory 用 Redis、vector 用 Pinecone）。是整个框架被依赖最多的底层模块。",totalLoc:23797,keyFiles:[{path:"storage/index.ts",loc:16,purpose:"barrel export"},{path:"storage/base.ts",loc:614,purpose:"MastraCompositeStore 类、MastraStorage 别名、normalizePerPage"},{path:"storage/types.ts",loc:3086,purpose:"22+ 子域类型，整个 core 最大类型文件"},{path:"storage/constants.ts",loc:792,purpose:"表名、默认值、MIME types 常量"},{path:"storage/factory-storage.ts",loc:403,purpose:"InMemoryStore 工厂"},{path:"storage/filesystem-db.ts",loc:293,purpose:"Filesystem-backed DB"},{path:"storage/filesystem-versioned.ts",loc:774,purpose:"版本化 filesystem storage"},{path:"storage/domains/",loc:0,purpose:"子目录：22+ 个子域（agents/workflows/schedules/memory/threads/blobs/...）各自 base/inmemory/filesystem"}],keyExports:[{name:"MastraCompositeStore",kind:"class",description:"复合存储基类，含 22+ 子域访问器和 init()/close()"},{name:"MastraStorage",kind:"type",description:"MastraCompositeStore 别名"},{name:"StorageDomains",kind:"type",description:"所有域接口映射"},{name:"InMemoryStore",kind:"const",description:"默认内存实现（工厂）"},{name:"WorkflowsStorage",kind:"interface",description:"workflow 状态存储域"},{name:"MemoryStorage",kind:"interface",description:"对话 memory 存储域"},{name:"AgentsStorage",kind:"interface",description:"agent 运行状态存储域"},{name:"ScoresStorage",kind:"interface",description:"eval score 存储域"},{name:"BlobsStorage",kind:"interface",description:"blob 存储域"},{name:"ThreadStateStorage",kind:"interface",description:"thread state 存储域"}],internalImports:["base"],sourceNotes:"Storage 是被依赖最多的底层模块，自己只依赖 base.ts（MastraBase），几乎零跨模块依赖。设计上每个子域（storage/domains/<name>/）独立提供 base/inmemory/filesystem 三套实现——你可以 workflow 状态用 Postgres（外部包）、blob 用 S3、memory 用 Redis、其他用 InMemory，混搭运行。types.ts 3086 行是整个 core 最大的类型文件。读源码时 base.ts 只有 614 行（主要是域访问器和 init/close），真正的域接口定义全在 types.ts 和 domains/ 下。",relatedDecisions:["composite-storage"],topFiles:["storage/index.ts","storage/types.ts"],codeSnippets:[{title:"StorageDomains — 领域驱动存储",file:"storage/base.ts",code:`export type StorageDomains = {
  workflows?: WorkflowsStorage;
  scores?: ScoresStorage;
  memory?: MemoryStorage;
  channels?: ChannelsStorage;
  notifications?: NotificationsStorage;
  observability?: ObservabilityStorage;
  agents?: AgentsStorage;
  datasets?: DatasetsStorage;
  experiments?: ExperimentsStorage;
  promptBlocks?: PromptBlocksStorage;
  mcpClients?: MCPClientsStorage;
  mcpServers?: MCPServersStorage;
  workspaces?: WorkspacesStorage;
  skills?: SkillsStorage;
  blobs?: BlobStore;
  backgroundTasks?: BackgroundTasksStorage;
  schedules?: SchedulesStorage;
  harness?: HarnessStorage;
  toolProviderConnections?: ToolProviderConnectionsStorage;
  threadState?: ThreadStateStorage;
};`,explanation:"存储不是单一 KV store，而是按业务领域拆分成 20+ 个独立 Storage Domain。每个 domain 有独立 interface，可独立选择 adapter（InMemory、Filesystem、LibSQL、GitHub）。"}]},{id:"tools",name:"tools",role:"工具系统：定义 type-safe 工具（inputSchema/outputSchema + execute），支持 suspend/resume、requireApproval、background execution、payload transform、Vercel/Provider tool 转换（CoreToolBuilder）。内置工具：askUserTool（向用户提问）、submitPlanTool（提交计划）、taskWrite/Update/Complete/CheckTool（任务状态管理）、run-command-tool（network 内部）、code-mode 工具。",totalLoc:5712,keyFiles:[{path:"tools/index.ts",loc:54,purpose:"barrel export"},{path:"tools/tool.ts",loc:605,purpose:"Tool 类 + createTool() 工厂"},{path:"tools/types.ts",loc:733,purpose:"ToolAction、ToolExecutionContext、ToolHook 等类型"},{path:"tools/validation.ts",loc:702,purpose:"工具输入校验、ValidationError"},{path:"tools/payload-transform.ts",loc:234,purpose:"工具 payload transform 策略"},{path:"tools/tool-builder/builder.ts",loc:1068,purpose:"CoreToolBuilder — 把 Vercel/Provider tools 转为 Mastra tools"},{path:"tools/builtin/ask-user.ts",loc:139,purpose:"askUserTool（HITL 提问）"},{path:"tools/builtin/submit-plan.ts",loc:138,purpose:"submitPlanTool"},{path:"tools/builtin/task-tools.ts",loc:665,purpose:"taskWriteTool/taskUpdateTool/taskCompleteTool/taskCheckTool"},{path:"tools/code-mode/code-mode.ts",loc:147,purpose:"Code-mode 工具"}],keyExports:[{name:"Tool",kind:"class",description:"工具类"},{name:"createTool",kind:"function",description:"工厂函数"},{name:"askUserTool",kind:"const",description:"内置：向用户提问（HITL）"},{name:"submitPlanTool",kind:"const",description:"内置：提交计划等审批"},{name:"taskWriteTool",kind:"const",description:"内置：写任务输出"},{name:"taskCompleteTool",kind:"const",description:"内置：标记任务完成"},{name:"CoreToolBuilder",kind:"class",description:"Vercel/Provider tool 转换"},{name:"ValidationError",kind:"class",description:"工具输入校验错误"},{name:"ToolAction",kind:"type",description:"工具执行函数类型"},{name:"CoreTool",kind:"type",description:"工具核心类型"}],internalImports:["mastra","request-context","schema","workflows","background-tasks"],sourceNotes:"Tools 代码量不大（5712 行），但它和 loop/agent 的交互点很关键：工具可以声明 requireApproval（中断 loop 等人审）、suspend（SuspendOptions 类型来自 workflows/，把 agent 睡眠等外部事件唤醒）、background（由 tool-loop-agent 后台跑）。这些扩展点不是 if/else 加在 Tool 类里，而是通过 agentic-execution workflow 的 tool-call-step 分支实现——durable execution 天然支持中途停下来。tool-builder/builder.ts 1068 行负责把 Vercel AI SDK 工具和其他 provider 工具转成 Mastra Tool，是生态兼容层。",relatedDecisions:["workflow-as-loop"],topFiles:["tools/tool.ts","tools/index.ts"],codeSnippets:[{title:"Tool 类 — 类型安全的 6 维泛型",file:"tools/tool.ts",code:`export class Tool<
  TSchemaIn = unknown,
  TSchemaOut = unknown,
  TSuspendSchema = unknown,
  TResumeSchema = unknown,
  TContext extends ToolExecutionContext<TSuspendSchema, TResumeSchema, any> = ToolExecutionContext<...>,
  TId extends string = string,
  TRequestContext extends Record<string, any> | unknown = unknown,
> implements ToolAction<TSchemaIn, TSchemaOut, TSuspendSchema, TResumeSchema, TContext, TId, TRequestContext> {
  id: TId;
  description: string;
  inputSchema?: StandardSchemaWithJSON<TSchemaIn>;
  outputSchema?: StandardSchemaWithJSON<TSchemaOut>;
  suspendSchema?: StandardSchemaWithJSON<TSuspendSchema>;
  resumeSchema?: StandardSchemaWithJSON<TResumeSchema>;
  execute?: ToolAction<...>['execute'];
  requireApproval?: ToolAction<...>['requireApproval'];
  toModelOutput?: (output: TSchemaOut) => unknown;
  transform?: ToolPayloadTransform<TSchemaIn, TSchemaOut>;
}`,explanation:"6 个泛型参数体现 Mastra 对 tool 的深度建模：输入/输出 schema 验证；Suspend/Resume schema 支持 HITL——tool 可暂停等人工审批；TContext 区分 agent/workflow/MCP 三种执行上下文。"},{title:"ToolExecutionContext — 三种执行环境",file:"tools/types.ts",code:`// Agent 环境
export interface AgentToolExecutionContext<TSuspend, TResume> {
  agentId: string;
  toolCallId: string;
  messages: any[];
  suspend: (suspendPayload: TSuspend) => Promise<void>;
  threadId?: string;
  resumeData?: TResume;
}
// Workflow 环境
export interface WorkflowToolExecutionContext<TSuspend, TResume> {
  runId: string;
  workflowId: string;
  state: any;
  setState: (state: any) => void;
  suspend: (suspendPayload: TSuspend) => Promise<void>;
}
// MCP 环境
export interface MCPToolExecutionContext {
  extra: RequestHandlerExtra<any, any>;
  elicitation: { sendRequest: (...) => Promise<ElicitResult> };
  progress?: (params: { progress: number; total?: number }) => Promise<void>;
}`,explanation:"同一个 Tool 定义可以在 Agent、Workflow、MCP Server 三种环境中执行——每种环境提供不同的上下文能力。这是 Mastra 工具复用能力的核心。"}]}],I=[{id:"page-home",label:"首页",category:"page",href:"/",icon:S},{id:"page-modules",label:"模块详解",category:"page",href:"/modules",icon:x},{id:"page-dataflow",label:"数据流",category:"page",href:"/dataflow",icon:b},{id:"page-decisions",label:"设计决策",category:"page",href:"/decisions",icon:T}],P=C.map(r=>({id:`module-${r.id}`,label:`${r.name}/`,category:"module",href:`/modules#module-${r.id}`,icon:y})),f=[...I,...P];function O(){const[r,d]=s.useState(!1),[l,p]=s.useState(""),[c,i]=s.useState(0),u=s.useRef(null);s.useRef(null);const a=l.trim()?f.filter(e=>e.label.toLowerCase().includes(l.toLowerCase())||e.id.toLowerCase().includes(l.toLowerCase())):f,m=s.useCallback(()=>{d(!0),p(""),i(0)},[]),n=s.useCallback(()=>{d(!1),p("")},[]),g=s.useCallback(e=>{n(),window.location.href=e},[n]);s.useEffect(()=>{const e=t=>{(t.metaKey||t.ctrlKey)&&t.key==="k"&&(t.preventDefault(),r?n():m()),t.key==="Escape"&&r&&n()};return document.addEventListener("keydown",e),()=>document.removeEventListener("keydown",e)},[r,m,n]),s.useEffect(()=>{r&&setTimeout(()=>u.current?.focus(),10)},[r]),s.useEffect(()=>{i(0)},[l]);const w=e=>{e.key==="ArrowDown"?(e.preventDefault(),i(t=>(t+1)%a.length)):e.key==="ArrowUp"?(e.preventDefault(),i(t=>(t-1+a.length)%a.length)):e.key==="Enter"&&a[c]&&(e.preventDefault(),g(a[c].href))};return r?o.jsxs("div",{className:"fixed inset-0 z-50 flex items-start justify-center pt-[20vh]",onClick:n,children:[o.jsx("div",{className:"absolute inset-0 bg-black/20 backdrop-blur-sm"}),o.jsxs("div",{className:"relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl border border-[var(--color-border)] overflow-hidden",onClick:e=>e.stopPropagation(),children:[o.jsxs("div",{className:"flex items-center gap-3 px-4 border-b border-[var(--color-border)]",children:[o.jsx(A,{size:16,className:"text-[var(--color-fg-subtle)] flex-shrink-0"}),o.jsx("input",{ref:u,type:"text",value:l,onChange:e=>p(e.target.value),onKeyDown:w,placeholder:"搜索模块或页面...",className:"flex-1 py-3.5 text-[14px] bg-transparent outline-none text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)]"}),o.jsx("kbd",{className:"hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-fg-subtle)] bg-[var(--color-code-bg)] border border-[var(--color-border)] rounded",children:"ESC"})]}),o.jsxs("div",{className:"max-h-[320px] overflow-y-auto py-2",children:[a.length===0&&o.jsx("div",{className:"px-4 py-6 text-center text-[13px] text-[var(--color-fg-subtle)]",children:"没有匹配结果"}),a.map((e,t)=>{const h=e.icon,k=t===c;return o.jsxs("button",{type:"button",className:`w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13.5px] transition-colors ${k?"bg-[var(--color-primary-soft)] text-[var(--color-fg)]":"text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-hover)]"}`,onClick:()=>g(e.href),onMouseEnter:()=>i(t),children:[o.jsx(h,{size:15,strokeWidth:1.8,className:k?"text-[var(--color-primary)]":"text-[var(--color-fg-subtle)]"}),o.jsx("span",{className:"flex-1 font-medium tracking-tight",children:e.label}),o.jsx("span",{className:"text-[10px] font-mono text-[var(--color-fg-subtle)] uppercase",children:e.category==="page"?"页面":"模块"})]},e.id)})]}),o.jsxs("div",{className:"px-4 py-2 border-t border-[var(--color-border)] flex items-center gap-4 text-[10.5px] text-[var(--color-fg-subtle)]",children:[o.jsxs("span",{className:"flex items-center gap-1",children:[o.jsx("kbd",{className:"px-1 py-0.5 bg-[var(--color-code-bg)] border border-[var(--color-border)] rounded font-mono",children:"↑↓"}),"导航"]}),o.jsxs("span",{className:"flex items-center gap-1",children:[o.jsx("kbd",{className:"px-1 py-0.5 bg-[var(--color-code-bg)] border border-[var(--color-border)] rounded font-mono",children:"↵"}),"跳转"]})]})]})]}):null}export{O as default};

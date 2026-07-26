import type { DataFlowStep } from "./types";

/**
 * The canonical v1 data flow: agent.generate(messages).
 * Steps mirror the sequence diagram in docs/mastra-analysis.md,
 * grounded in packages/core/src/ source.
 */
export const GENERATE_FLOW: { title: string; summary: string; steps: DataFlowStep[]; mermaid: string } = {
  title: "agent.generate() 全链路",
  summary:
    "从用户调用 agent.generate() 到拿到 FullOutput 之间，Mastra 内部构造了 3 层嵌套 Workflow（prepare-stream → agentic-loop → agentic-execution × N），跑 Processor 管线，多次调用 LLM，直到模型不再返回 tool_call。下面逐步拆解。",
  steps: [
    {
      id: "user-call",
      label: "agent.generate(messages)",
      actor: "User",
      detail: "用户把消息（字符串或 Message 数组）传给 Agent.generate()，可以传 options（maxSteps、tools、temperature、output 等）。",
    },
    {
      id: "execute",
      label: "#execute(options)",
      actor: "Agent",
      detail: "Agent 私有方法做参数归一化、合并 agent 级默认配置、把 message 转成 AI SDK 兼容格式，准备 stream 选项。",
    },
    {
      id: "prepare-stream",
      label: "createPrepareStreamWorkflow()",
      actor: "PrepareStream Workflow",
      detail:
        "位于 agent/workflows/prepare-stream/。构造最外层 workflow，包含 prepare-memory-step（从 storage 加载历史消息，226 行）、prepare-tools-step（合并 agent tools + MCP tools + 内置 tools，83 行）、input processor 执行、map-results-step（把 LLM 输出映射成 MastraModelOutput，415 行）。这个 workflow 的输出是可以直接送进 LLM 的消息列表和工具集合。",
    },
    {
      id: "process-input",
      label: "processInput / processLLMRequest",
      actor: "ProcessorRunner",
      detail:
        "按注册顺序跑每个 Processor 的 input 侧 hooks。Memory processor 注入历史消息；Skills processor 注入技能 prompt；Browser-context processor 注入当前页面上下文；Caching processor 检查命中缓存。每个 Processor 都可以增删改消息。",
    },
    {
      id: "llm-vnext",
      label: "stream(loopOptions)",
      actor: "MastraLLMVNext",
      detail:
        "Agent 持有 MastraLLMVNext（LanguageModel 的包装），它不直接调 AI SDK，而是把 stream 请求转给 loop()，把 AI SDK 的 doStream 和 Mastra 自己的 agentic loop 接起来。",
    },
    {
      id: "loop-entry",
      label: "loop(options)",
      actor: "MastraLLMVNext → loop()",
      detail:
        "MastraLLMVNext（位于 llm/model/model.loop.ts，是 Agent → loop() 之间的胶水）接收 stream 请求，把它转给 loop()（loop/loop.ts，177 行）。loop() 构造 agentic-loop workflow 并通过 workflowLoopStream()（loop/workflows/stream.ts，378 行）驱动 ReadableStream。",
    },
    {
      id: "agentic-loop",
      label: "createAgenticLoopWorkflow()",
      actor: "AgenticLoop Workflow",
      detail:
        "外层循环 workflow。负责维护迭代计数、检查 TripWire（maxSteps/token/cost）、判断终止条件。每一轮迭代都 spawn 一个 agentic-execution workflow。",
      loop: true,
    },
    {
      id: "agentic-exec",
      label: "createAgenticExecutionWorkflow()",
      actor: "AgenticExecution Workflow",
      detail:
        "单次迭代：跑 processLLMRequest（per-step 再次让 processor 介入，比如 structured output 这里注入 response_format）→ 调 AI SDK LanguageModel.doStream() → 消费输出流 → 如果有 tool_call 则跑工具执行 step → 如果是纯文本则标记迭代结束。",
    },
    {
      id: "llm-call",
      label: "LanguageModel.doStream()",
      actor: "LLM Step",
      detail:
        "最终真正打到 AI SDK provider（openai/anthropic/...）的 HTTP 调用。文本 token、tool_call 分片在这里以流式事件形式输出，Mastra 把它们包成 MastraModelOutput chunks。",
    },
    {
      id: "tool-exec",
      label: "forEach tool call: validate + execute",
      actor: "Tool Step",
      detail:
        "如果模型返回 tool_calls，AgenticExecution 按顺序（或 parallel）执行每个工具。工具支持 requireApproval（中断循环等人审）、suspend（睡眠等待外部事件）、background（由 tool-loop-agent 在后台跑）。工具结果追加到消息列表，下一轮迭代喂回 LLM。",
      branch: "tool",
    },
    {
      id: "done",
      label: "no tool calls → stop iteration",
      actor: "AgenticExecution Workflow",
      detail:
        "模型这轮返回的只有文本，没有 tool_call → agentic-loop 判断终止条件成立 → 结束循环。",
      branch: "done",
    },
    {
      id: "process-output",
      label: "processLLMResponse / processOutput",
      actor: "ProcessorRunner",
      detail:
        "循环结束后跑 output 侧 processors：把 memory 写入 storage、做 structured output 校验、触发 observability span。",
    },
    {
      id: "final",
      label: "MastraModelOutput → FullOutput",
      actor: "Stream / Agent",
      detail:
        "流式 chunks 聚合为 FullOutput（text + toolResults + usage + steps）返回给用户。stream() 路径则把 ReadableStream 直接返回。",
    },
  ],
  mermaid: `sequenceDiagram
    participant User
    participant Agent
    participant PS as PrepareStream Wf
    participant PR as ProcessorRunner
    participant LLMV as MastraLLMVNext
    participant LoopFn as loop()
    participant AL as AgenticLoop Wf
    participant AE as AgenticExecution Wf
    participant LLM as LanguageModel.doStream
    participant Tool as Tool.execute

    User->>Agent: generate(messages)
    Agent->>Agent: #execute(options)
    Agent->>PS: createPrepareStreamWorkflow()
    PS->>PS: prepare-memory-step (load history)
    PS->>PS: prepare-tools-step (resolve tools)
    PS->>PR: processInput / processLLMRequest
    PR-->>PS: processed messages
    PS->>LLMV: stream(loopOptions)
    LLMV->>LoopFn: loop(options)
    LoopFn->>AL: createAgenticLoopWorkflow()
    loop each iteration
        AL->>AE: createAgenticExecutionWorkflow()
        AE->>PR: processLLMRequest (per-step)
        PR-->>AE: modified request
        AE->>LLM: doStream()
        LLM-->>AE: text/tool-call chunks
        alt tool calls present
            AE->>Tool: forEach: validate + execute
            Tool-->>AE: tool results
            AE-->>AL: continue
        else no tool calls
            AE-->>AL: stop
        end
    end
    AL->>PR: processLLMResponse / processOutput
    PR-->>AL: final output
    AL-->>LoopFn: final stream
    LoopFn-->>LLMV: MastraModelOutput
    LLMV-->>Agent: FullOutput
    Agent-->>User: result`,
};
